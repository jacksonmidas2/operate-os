import NextAuth, { type DefaultSession } from "next-auth";
import Google from "next-auth/providers/google";
import Nodemailer from "next-auth/providers/nodemailer";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { controlPrisma, type GlobalRole, type TenantRole } from "@operate/db-control";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      globalRole: GlobalRole;
      tenantMemberships: Array<{ tenantSlug: string; role: TenantRole }>;
    } & DefaultSession["user"];
  }
}

const isDev = process.env.NODE_ENV !== "production";

/**
 * NextAuth v5, multi-host edition.
 *
 * The lazy `NextAuth((req) => config)` form lets us read the inbound
 * request's `Host` header and use it as the canonical base URL for
 * THIS request — so OAuth `redirect_uri`, cookie domain, and redirects
 * all stay on whichever vanity domain the user actually arrived at
 * (portal.mmcleaningllc.com, operate-web-…run.app, etc).
 *
 * Without this, NextAuth falls back to a single AUTH_URL — which sends
 * Google the wrong `redirect_uri` when the user lands at a vanity host,
 * and the PKCE cookie ends up scoped to the wrong domain.
 *
 * Pattern source: NextAuth #12693 / #9785 (multi-subdomain).
 */
export const { handlers, signIn, signOut, auth } = NextAuth((req) => {
  // Derive the per-request base URL from the inbound headers (Cloud Run
  // sets x-forwarded-host + x-forwarded-proto). Falls back to AUTH_URL
  // if a request isn't available (e.g. during build-time evaluation).
  const fwdHost = req?.headers.get("x-forwarded-host");
  const host = fwdHost ?? req?.headers.get("host");
  const fwdProto = req?.headers.get("x-forwarded-proto");
  const proto = fwdProto ?? (isDev ? "http" : "https");
  const baseUrl = host
    ? `${proto}://${host}`
    : process.env.AUTH_URL ?? undefined;

  const providers = [];

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.push(
      Google({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        allowDangerousEmailAccountLinking: true,
      }),
    );
  }

  if (process.env.EMAIL_SERVER_HOST && process.env.EMAIL_FROM) {
    providers.push(
      Nodemailer({
        server: {
          host: process.env.EMAIL_SERVER_HOST,
          port: Number(process.env.EMAIL_SERVER_PORT ?? "1025"),
          auth: process.env.EMAIL_SERVER_USER
            ? {
                user: process.env.EMAIL_SERVER_USER,
                pass: process.env.EMAIL_SERVER_PASSWORD ?? "",
              }
            : undefined,
        },
        from: process.env.EMAIL_FROM,
      }),
    );
  }

  // Cookie domain. In dev, share across `*.localhost`. In prod, host-only
  // unless APP_COOKIE_DOMAIN is set (e.g. ".mmcleaningllc.com" if we
  // want one cookie to cover both apex and portal subdomain).
  const cookieDomain = isDev
    ? "localhost"
    : (process.env.APP_COOKIE_DOMAIN ?? undefined);

  return {
    adapter: PrismaAdapter(controlPrisma),
    providers,
    session: { strategy: "database" },
    trustHost: true,
    // NOTE: do NOT set `redirectProxyUrl` — that's for centralized auth
    // proxies (one auth server in front of N apps). For a single app
    // serving multiple hostnames, `trustHost: true` + `x-forwarded-host`
    // is enough; setting redirectProxyUrl confuses state-cookie encoding.
    pages: {
      signIn: "/sign-in",
      verifyRequest: "/sign-in/check-email",
    },
    cookies: {
      sessionToken: {
        name: isDev ? "authjs.session-token" : "__Secure-authjs.session-token",
        options: {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          secure: !isDev,
          domain: cookieDomain,
        },
      },
      callbackUrl: {
        name: isDev ? "authjs.callback-url" : "__Secure-authjs.callback-url",
        options: {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          secure: !isDev,
          domain: cookieDomain,
        },
      },
      csrfToken: {
        name: isDev ? "authjs.csrf-token" : "__Host-authjs.csrf-token",
        options: {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          secure: !isDev,
          // host-only — `__Host-` prefix forbids any domain attribute
        },
      },
      // PKCE / state / nonce: leave to NextAuth defaults. The previous
      // explicit overrides duplicated defaults and risked drift.
    },
    callbacks: {
      async session({ session, user }) {
        if (!session.user) return session;
        const fresh = await controlPrisma.user.findUnique({
          where: { id: user.id },
          select: {
            globalRole: true,
            tenantUsers: {
              where: { status: "ACTIVE" },
              select: {
                role: true,
                tenant: { select: { slug: true } },
              },
            },
          },
        });
        session.user.id = user.id;
        session.user.globalRole = fresh?.globalRole ?? "NONE";
        session.user.tenantMemberships =
          fresh?.tenantUsers.map((tu) => ({
            tenantSlug: tu.tenant.slug,
            role: tu.role,
          })) ?? [];
        return session;
      },
      // Keep post-sign-in redirects on the same host the user came from.
      // Default NextAuth behavior compares against AUTH_URL — which is
      // wrong in multi-host setups. We compare against the request's
      // baseUrl instead.
      async redirect({ url, baseUrl: nextAuthBaseUrl }) {
        const effective = baseUrl ?? nextAuthBaseUrl;
        // Relative URLs are safe — keep them on current host.
        if (url.startsWith("/")) return `${effective}${url}`;
        // Same-origin absolute URLs are also safe.
        try {
          if (new URL(url).origin === effective) return url;
        } catch {
          // ignore parse errors → fall through
        }
        // Anything else → go home on the current host.
        return effective;
      },
    },
  };
});

export const { GET, POST } = handlers;
