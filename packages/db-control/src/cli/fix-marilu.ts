#!/usr/bin/env tsx
/**
 * One-shot: inspect / fix Marilu's tenant memberships.
 *
 *   npm run fix:marilu -- inspect
 *   npm run fix:marilu -- apply
 *
 * `apply` will:
 *   1. UPDATE marilu.c@mmcleaningllc.com tenant_user → status=ACTIVE
 *   2. DELETE user marilu.cisnerors@mmcleaningllc.com (typo; cascades)
 *   3. UPSERT user marilu.cisneros@mmcleaningllc.com + TenantUser on mm (ACTIVE, OWNER)
 */

import { controlPrisma } from "../client";

const TYPO = "marilu.cisnerors@mmcleaningllc.com";
const CORRECT = "marilu.cisneros@mmcleaningllc.com";
const SHORT = "marilu.c@mmcleaningllc.com";
const TENANT_SLUG = "mm";

async function inspect() {
  for (const email of [SHORT, TYPO, CORRECT]) {
    const u = await controlPrisma.user.findUnique({
      where: { email },
      include: { tenantUsers: { include: { tenant: true } } },
    });
    if (!u) {
      console.log(`  ${email}: (no user record)`);
      continue;
    }
    console.log(`  ${email}: id=${u.id} globalRole=${u.globalRole}`);
    for (const tu of u.tenantUsers) {
      console.log(
        `    - tenant=${tu.tenant.slug} role=${tu.role} status=${tu.status}`,
      );
    }
  }
}

async function apply() {
  const tenant = await controlPrisma.tenant.findUnique({
    where: { slug: TENANT_SLUG },
  });
  if (!tenant) {
    console.error(`Tenant '${TENANT_SLUG}' not found.`);
    process.exit(1);
  }

  // 1. Flip the SHORT email's membership to ACTIVE (if it exists).
  const shortUser = await controlPrisma.user.findUnique({
    where: { email: SHORT },
  });
  if (shortUser) {
    const updated = await controlPrisma.tenantUser.updateMany({
      where: { userId: shortUser.id, tenantId: tenant.id },
      data: { status: "ACTIVE", joinedAt: new Date() },
    });
    console.log(`  ✓ ${SHORT}: flipped ${updated.count} membership(s) → ACTIVE`);
  } else {
    console.log(`  - ${SHORT}: no user record, skipped`);
  }

  // 2. Delete the typo'd user entirely (cascades to TenantUser/Account/Session).
  const typoUser = await controlPrisma.user.findUnique({
    where: { email: TYPO },
  });
  if (typoUser) {
    await controlPrisma.user.delete({ where: { id: typoUser.id } });
    console.log(`  ✓ ${TYPO}: deleted (id=${typoUser.id})`);
  } else {
    console.log(`  - ${TYPO}: no user record, nothing to delete`);
  }

  // 3. Upsert the correct email + ensure ACTIVE OWNER membership on MM.
  const correctUser = await controlPrisma.user.upsert({
    where: { email: CORRECT },
    update: {},
    create: { email: CORRECT, name: "Marilu Cisneros" },
  });
  await controlPrisma.tenantUser.upsert({
    where: {
      tenantId_userId: { tenantId: tenant.id, userId: correctUser.id },
    },
    update: { role: "OWNER", status: "ACTIVE" },
    create: {
      tenantId: tenant.id,
      userId: correctUser.id,
      role: "OWNER",
      status: "ACTIVE",
      joinedAt: new Date(),
    },
  });
  console.log(`  ✓ ${CORRECT}: upserted + ACTIVE OWNER on '${TENANT_SLUG}'`);
}

async function main() {
  const mode = process.argv[2];
  if (mode === "inspect") {
    console.log("\n— BEFORE —");
    await inspect();
  } else if (mode === "apply") {
    console.log("\n— BEFORE —");
    await inspect();
    console.log("\n— APPLYING —");
    await apply();
    console.log("\n— AFTER —");
    await inspect();
  } else {
    console.error("Usage: fix-marilu (inspect | apply)");
    process.exit(1);
  }
  await controlPrisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await controlPrisma.$disconnect();
  process.exit(1);
});
