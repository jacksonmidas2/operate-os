#!/usr/bin/env tsx
/**
 * set-custom-domain — manage a tenant's vanity domains.
 *
 *   # Public marketing site:
 *   npm run set-custom-domain -- --slug mm --public mmcleaningllc.com
 *
 *   # Internal app subdomain:
 *   npm run set-custom-domain -- --slug mm --app portal.mmcleaningllc.com
 *
 *   # Both at once:
 *   npm run set-custom-domain -- --slug mm \
 *     --public mmcleaningllc.com \
 *     --app portal.mmcleaningllc.com
 *
 *   # Clear:
 *   npm run set-custom-domain -- --slug mm --clear-public
 *   npm run set-custom-domain -- --slug mm --clear-app
 *
 * After running, prints the two env-var lines to apply to Cloud Run. The
 * middleware (Edge runtime, can't reach Postgres) reads these env vars to
 * route traffic; the DB columns are the source-of-truth record.
 */
import { controlPrisma } from "../client";

interface Args {
  slug: string;
  publicDomain?: string;
  appDomain?: string;
  clearPublic?: boolean;
  clearApp?: boolean;
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const args: Partial<Args> = {};
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === "--slug") {
      args.slug = argv[++i];
    } else if (flag === "--public" || flag === "--domain") {
      // --domain kept as alias for backwards compat (was "customDomain")
      args.publicDomain = argv[++i];
    } else if (flag === "--app") {
      args.appDomain = argv[++i];
    } else if (flag === "--clear-public" || flag === "--clear") {
      args.clearPublic = true;
    } else if (flag === "--clear-app") {
      args.clearApp = true;
    }
  }
  if (
    !args.slug ||
    (!args.publicDomain &&
      !args.appDomain &&
      !args.clearPublic &&
      !args.clearApp)
  ) {
    console.error(
      "Usage:\n" +
        "  set-custom-domain --slug <slug> --public <public-domain> [--app <app-domain>]\n" +
        "  set-custom-domain --slug <slug> --app <app-domain>\n" +
        "  set-custom-domain --slug <slug> --clear-public | --clear-app",
    );
    process.exit(1);
  }
  return args as Args;
}

function normalizeDomain(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");
}

async function main() {
  const args = parseArgs();

  const tenant = await controlPrisma.tenant.findUnique({
    where: { slug: args.slug },
  });
  if (!tenant) {
    console.error(`✗ Tenant "${args.slug}" not found.`);
    process.exit(1);
  }

  const update: { customDomain?: string | null; appDomain?: string | null } = {};

  if (args.clearPublic) update.customDomain = null;
  if (args.clearApp) update.appDomain = null;

  if (args.publicDomain) {
    const domain = normalizeDomain(args.publicDomain);
    const conflict = await controlPrisma.tenant.findFirst({
      where: {
        OR: [{ customDomain: domain }, { appDomain: domain }],
        NOT: { id: tenant.id },
      },
    });
    if (conflict) {
      console.error(
        `✗ Domain "${domain}" is already in use by tenant "${conflict.slug}".`,
      );
      process.exit(1);
    }
    update.customDomain = domain;
  }
  if (args.appDomain) {
    const domain = normalizeDomain(args.appDomain);
    const conflict = await controlPrisma.tenant.findFirst({
      where: {
        OR: [{ customDomain: domain }, { appDomain: domain }],
        NOT: { id: tenant.id },
      },
    });
    if (conflict) {
      console.error(
        `✗ Domain "${domain}" is already in use by tenant "${conflict.slug}".`,
      );
      process.exit(1);
    }
    update.appDomain = domain;
  }

  const updated = await controlPrisma.tenant.update({
    where: { id: tenant.id },
    data: update,
  });
  console.log(
    `\n✓ Tenant "${updated.slug}":\n` +
      `    public: ${updated.customDomain ?? "(none)"}\n` +
      `    app:    ${updated.appDomain ?? "(none)"}\n`,
  );

  // Build the two env-var lines from current DB state
  const all = await controlPrisma.tenant.findMany({
    where: {
      OR: [
        { customDomain: { not: null } },
        { appDomain: { not: null } },
      ],
    },
    select: { slug: true, customDomain: true, appDomain: true },
  });
  const publicMap = all
    .filter((t) => t.customDomain)
    .map((t) => `${t.customDomain}=${t.slug}`)
    .join(",");
  const appMap = all
    .filter((t) => t.appDomain)
    .map((t) => `${t.appDomain}=${t.slug}`)
    .join(",");

  console.log("──────────────────────────────────────────────");
  console.log("Apply these env vars to Cloud Run so the app routes traffic:\n");
  console.log(`  PUBLIC_SITE_DOMAIN_MAP=${publicMap || "(empty)"}`);
  console.log(`  APP_DOMAIN_MAP=${appMap || "(empty)"}\n`);
  console.log("One-liner:");
  console.log(
    `  gcloud run services update operate-web \\\n` +
      `    --update-env-vars="PUBLIC_SITE_DOMAIN_MAP=${publicMap},APP_DOMAIN_MAP=${appMap}" \\\n` +
      `    --region=us-central1 --project=deep-contact-470100-f0`,
  );
  console.log("──────────────────────────────────────────────\n");

  await controlPrisma.$disconnect();
}

main().catch(async (err) => {
  console.error("\n✗ set-custom-domain failed:");
  console.error(err);
  await controlPrisma.$disconnect();
  process.exit(1);
});
