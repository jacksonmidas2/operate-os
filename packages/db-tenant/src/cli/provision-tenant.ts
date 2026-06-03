#!/usr/bin/env tsx
import { provisionTenant } from "../provision";
import { controlPrisma } from "@operate/db-control";

interface Args {
  slug: string;
  name: string;
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
    i++;
  }
  if (!args.slug || !args.name) {
    console.error(
      'Usage: provision-tenant --slug <slug> --name "<legal name>"',
    );
    process.exit(1);
  }
  return args as Args;
}

async function main() {
  const { slug, name } = parseArgs();
  console.log(`\nProvisioning tenant "${slug}" (${name})…\n`);
  const result = await provisionTenant({ slug, legalName: name });
  console.log(
    `\n✓ Tenant "${result.slug}" is live.\n` +
      `  Visit:   http://${result.slug}.localhost:3000\n`,
  );
  await controlPrisma.$disconnect();
}

main().catch(async (err) => {
  console.error("\n✗ provision-tenant failed:");
  console.error(err);
  await controlPrisma.$disconnect();
  process.exit(1);
});
