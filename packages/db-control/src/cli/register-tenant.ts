#!/usr/bin/env tsx
/**
 * register-tenant — insert a Tenant row that points at an EXISTING
 * per-tenant database. Useful when the database was created out of band
 * (e.g. via gcloud sql databases create + prisma db push).
 *
 *   npm run register-tenant -- --slug mm --name "M&M Cleaning Co LLC" \
 *     --database-url "postgresql://..."
 */
import { controlPrisma } from "../client";

interface Args {
  slug: string;
  name: string;
  databaseUrl: string;
  displayName?: string;
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const args: Partial<Args> = {};
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (!flag || !value) continue;
    if (flag === "--slug") args.slug = value;
    if (flag === "--name") args.name = value;
    if (flag === "--display-name") args.displayName = value;
    if (flag === "--database-url") args.databaseUrl = value;
    i++;
  }
  if (!args.slug || !args.name || !args.databaseUrl) {
    console.error(
      'Usage: register-tenant --slug <slug> --name "<legal name>" --database-url <url> [--display-name <display>]',
    );
    process.exit(1);
  }
  return args as Args;
}

async function main() {
  const { slug, name, databaseUrl, displayName } = parseArgs();
  const tenant = await controlPrisma.tenant.upsert({
    where: { slug },
    update: { legalName: name, displayName, databaseUrl },
    create: {
      slug,
      legalName: name,
      displayName,
      databaseUrl,
      status: "ACTIVE",
    },
  });
  console.log(`✓ tenant ${tenant.slug} (id=${tenant.id}) → ${databaseUrl.replace(/:[^@]+@/, ":***@")}`);
  await controlPrisma.$disconnect();
}

main().catch(async (err) => {
  console.error("✗ register-tenant failed:", err);
  await controlPrisma.$disconnect();
  process.exit(1);
});
