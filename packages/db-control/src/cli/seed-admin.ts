#!/usr/bin/env tsx
/**
 * seed-admin — create the founding super-admin user + link Marilu as M&M's owner.
 *
 *   npm run seed:admin -- --email you@example.com --marilu cisneros200marilu@gmail.com
 *
 * The super-admin can sign into admin.localhost:3000.
 * Marilu becomes OWNER of the M&M tenant.
 */

import { controlPrisma } from "../client";

interface Args {
  email: string;
  marilu?: string;
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const args: Partial<Args> = {};
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (!flag || !value) continue;
    if (flag === "--email") args.email = value;
    if (flag === "--marilu") args.marilu = value;
    i++;
  }
  if (!args.email) {
    console.error("Usage: seed-admin --email <super-admin email> [--marilu <marilu email>]");
    process.exit(1);
  }
  return args as Args;
}

async function main() {
  const { email, marilu } = parseArgs();

  console.log(`\nSeeding founding users…\n`);

  const superAdmin = await controlPrisma.user.upsert({
    where: { email },
    update: { globalRole: "SUPER_ADMIN" },
    create: {
      email,
      globalRole: "SUPER_ADMIN",
      emailVerified: new Date(),
    },
  });
  console.log(`  ✓ super-admin: ${superAdmin.email} (id=${superAdmin.id})`);

  if (marilu) {
    const mm = await controlPrisma.tenant.findUnique({ where: { slug: "mm" } });
    if (!mm) {
      console.warn("  ! M&M tenant not provisioned yet — skipping Marilu link.");
    } else {
      const mariluUser = await controlPrisma.user.upsert({
        where: { email: marilu },
        update: {},
        create: { email: marilu, emailVerified: new Date(), name: "Marilu Cisneros" },
      });
      await controlPrisma.tenantUser.upsert({
        where: { tenantId_userId: { tenantId: mm.id, userId: mariluUser.id } },
        update: { role: "OWNER", status: "ACTIVE" },
        create: {
          tenantId: mm.id,
          userId: mariluUser.id,
          role: "OWNER",
          status: "ACTIVE",
          joinedAt: new Date(),
        },
      });
      console.log(`  ✓ Marilu (${marilu}) linked as OWNER of M&M`);
    }
  }

  await controlPrisma.$disconnect();
  console.log(`\n✓ Users seeded.\n`);
}

main().catch(async (err) => {
  console.error("\n✗ seed-admin failed:");
  console.error(err);
  await controlPrisma.$disconnect();
  process.exit(1);
});
