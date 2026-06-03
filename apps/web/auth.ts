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

// Share the session cookie across `localhost` AND every `*.localhost`
// subdomain so signing in at `localhost:3030` keeps you signed in at
// `admin.localhost:3030`, `mm.localhost:3030`, etc.
//
// In prod, we'll switch this to `.operatehq.app` so signing in once
// covers admin/book/{tenant} subdomains.
const isDev = process.env.NODE_ENV !== "production";
const cookieDomain = isDev
  ? "localhost"
  : (process.env.APP_COOKIE_DOMAIN ?? undefined);

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(controlPrisma),
  providers,
  session: { strategy: "database" },
  trustHost: true,
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
        // CSRF cookie can't be cross-subdomain (host-only)
      },
    },
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
  },
});

export const { GET, POST } = handlers;
