#!/usr/bin/env tsx
import { provisionTenant } from "../provision";
import { controlPrisma } from "@operate/db-control";

interface Args {
  slug: string;
  name: string;
  customDomain?: string;
  appDomain?: string;
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
    if (flag === "--public" || flag === "--custom-domain")
      args.customDomain = value;
    if (flag === "--app") args.appDomain = value;
    i++;
  }
  if (!args.slug || !args.name) {
    console.error(
      'Usage: provision-tenant --slug <slug> --name "<legal name>" [--public <domain>] [--app <domain>]',
    );
    process.exit(1);
  }
  return args as Args;
}

async function main() {
  const { slug, name, customDomain, appDomain } = parseArgs();
  console.log(`\nProvisioning tenant "${slug}" (${name})…\n`);
  const result = await provisionTenant({
    slug,
    legalName: name,
    customDomain,
    appDomain,
  });
  const lines = [
    `\n✓ Tenant "${result.slug}" is live.`,
    `  Dev URL:    http://${result.slug}.localhost:3000`,
  ];
  if (result.customDomain) {
    lines.push(`  Public:     https://${result.customDomain}`);
  }
  if (result.appDomain) {
    lines.push(`  App/ops:    https://${result.appDomain}`);
  }
  if (result.customDomain || result.appDomain) {
    const publicMap = result.customDomain
      ? `${result.customDomain}=${result.slug}`
      : "";
    const appMap = result.appDomain
      ? `${result.appDomain}=${result.slug}`
      : "";
    lines.push(
      "",
      "  Run set-custom-domain to also generate the env-var deploy command",
      "  (it builds the combined map across all tenants).",
    );
  }
  console.log(lines.join("\n") + "\n");
  await controlPrisma.$disconnect();
}

main().catch(async (err) => {
  console.error("\n✗ provision-tenant failed:");
  console.error(err);
  await controlPrisma.$disconnect();
  process.exit(1);
});
