#!/usr/bin/env tsx
/**
 * seed-mm — populate the M&M Cleaning tenant DB with real seed data.
 *
 *   npm run seed:mm
 *
 * Data sources:
 *   - M&M Invoice 01 - Bonnie Brae.pdf
 *   - M&M Invoice 01 - Paseo.pdf
 *   - datafrombus.txt (email thread between Jaxson and Marilu)
 *
 * Empty fields (employees, supplies, insurance, schedule) are left blank
 * — those become prompts in the onboarding wizard (Phase 7).
 */

import { controlPrisma } from "@operate/db-control";
import { TenantPrismaClient } from "../client";

const TENANT_SLUG = "mm";

async function main() {
  const tenant = await controlPrisma.tenant.findUnique({
    where: { slug: TENANT_SLUG },
  });
  if (!tenant) {
    throw new Error(
      `Tenant "${TENANT_SLUG}" not found — run provision-tenant first.`,
    );
  }

  console.log(`\nSeeding M&M Cleaning data into tenant "${TENANT_SLUG}"…\n`);

  const db = new TenantPrismaClient({
    datasources: { db: { url: tenant.databaseUrl } },
  });

  try {
    // ── Section 1: Business profile ──────────────────────────────────
    const business = await db.businessProfile.upsert({
      where: { id: "mm-profile" },
      update: {},
      create: {
        id: "mm-profile",
        legalName: "M&M Cleaning Co LLC",
        displayName: "M&M Cleaning",
        entityType: "LLC",
        addressLine1: "9061 Vons Dr",
        city: "Garden Grove",
        state: "CA",
        postalCode: "92841",
        phone: "(714) 880-0604",
        email: "cisneros200marilu@gmail.com",
        invoicePrefix: "INV",
        nextInvoiceSeq: 2, // we'll seed invoice #00001 below
      },
    });
    console.log(`  ✓ business profile: ${business.legalName}`);

    // ── Section 2: Client (RHF) ──────────────────────────────────────
    const rhf = await db.client.upsert({
      where: { id: "rhf" },
      update: {},
      create: {
        id: "rhf",
        businessName: "RHF (Retirement Housing Foundation)",
        mainContactName: "Katherine Albanez",
        contactEmail: "Katherine.Albanez@rhf.org",
        billingStructure: "PER_UNIT",
      },
    });
    console.log(`  ✓ client: ${rhf.businessName}`);

    // ── Section 2 (cont): Locations + Units ──────────────────────────
    const bonnieBrae = await db.location.upsert({
      where: { id: "loc-bonnie-brae" },
      update: {},
      create: {
        id: "loc-bonnie-brae",
        clientId: rhf.id,
        name: "Bonnie Brae Apartments",
        addressLine1: "505 S Bonnie Brae St",
        city: "Los Angeles",
        state: "CA",
        postalCode: "90057",
      },
    });
    const paseo = await db.location.upsert({
      where: { id: "loc-paseo" },
      update: {},
      create: {
        id: "loc-paseo",
        clientId: rhf.id,
        name: "Paseo at California",
        addressLine1: "1901 W 6th Street",
        city: "Los Angeles",
        state: "CA",
        postalCode: "90057",
      },
    });
    console.log(`  ✓ locations: ${bonnieBrae.name}, ${paseo.name}`);

    const units = [
      { id: "bb-403", locId: bonnieBrae.id, num: "403", bedrooms: 1 },
      { id: "bb-503", locId: bonnieBrae.id, num: "503", bedrooms: 1 },
      { id: "bb-602", locId: bonnieBrae.id, num: "602", bedrooms: 3 },
      { id: "bb-608", locId: bonnieBrae.id, num: "608", bedrooms: 3 },
      { id: "pa-403", locId: paseo.id, num: "403", bedrooms: 3 },
    ];
    for (const u of units) {
      await db.unit.upsert({
        where: { id: u.id },
        update: {},
        create: {
          id: u.id,
          locationId: u.locId,
          unitNumber: u.num,
          bedroomCount: u.bedrooms,
        },
      });
    }
    console.log(`  ✓ ${units.length} units`);

    // ── Pricebook (observed from invoice) ────────────────────────────
    await db.pricebookEntry.upsert({
      where: { id: "pb-1br-turnover" },
      update: {},
      create: {
        id: "pb-1br-turnover",
        name: "Turnover — 1 Bedroom",
        serviceType: "TURNOVER",
        bedroomCount: 1,
        priceCents: 10000,
      },
    });
    await db.pricebookEntry.upsert({
      where: { id: "pb-3br-turnover" },
      update: {},
      create: {
        id: "pb-3br-turnover",
        name: "Turnover — 3 Bedroom",
        serviceType: "TURNOVER",
        bedroomCount: 3,
        priceCents: 20000,
      },
    });
    console.log(`  ✓ pricebook: $100/1BR, $200/3BR`);

    // ── Invoice #00001 — Bonnie Brae (real, from May 12 invoice) ─────
    const issued = new Date("2026-05-12T00:00:00Z");
    const inv1 = await db.invoice.upsert({
      where: { number: "INV-00001" },
      update: {},
      create: {
        number: "INV-00001",
        clientId: rhf.id,
        issuedOn: issued,
        totalCents: 60000, // $600
        status: "SENT",
        notes: "Bonnie Brae — units 403, 503, 602, 608",
        lines: {
          create: [
            {
              description: "Cleaning Service — Unit 403 (1 BR)",
              locationId: bonnieBrae.id,
              unitId: "bb-403",
              quantity: 1,
              unitPriceCents: 10000,
              totalCents: 10000,
            },
            {
              description: "Cleaning Service — Unit 503 (1 BR)",
              locationId: bonnieBrae.id,
              unitId: "bb-503",
              quantity: 1,
              unitPriceCents: 10000,
              totalCents: 10000,
            },
            {
              description: "Cleaning Service — Unit 602 (3 BR)",
              locationId: bonnieBrae.id,
              unitId: "bb-602",
              quantity: 1,
              unitPriceCents: 20000,
              totalCents: 20000,
            },
            {
              description: "Cleaning Service — Unit 608 (3 BR)",
              locationId: bonnieBrae.id,
              unitId: "bb-608",
              quantity: 1,
              unitPriceCents: 20000,
              totalCents: 20000,
            },
          ],
        },
      },
    });
    console.log(`  ✓ invoice ${inv1.number}: $${inv1.totalCents / 100}`);

    // ── Invoice #00001 (Paseo, separate invoice, also #00001 in source) ─
    const inv2 = await db.invoice.upsert({
      where: { number: "INV-00002" },
      update: {},
      create: {
        number: "INV-00002",
        clientId: rhf.id,
        issuedOn: issued,
        totalCents: 20000,
        status: "SENT",
        notes: "Paseo at California — unit 403 (3 BR)",
        lines: {
          create: [
            {
              description: "Cleaning Service — Unit 403 (3 BR)",
              locationId: paseo.id,
              unitId: "pa-403",
              quantity: 1,
              unitPriceCents: 20000,
              totalCents: 20000,
            },
          ],
        },
      },
    });
    console.log(`  ✓ invoice ${inv2.number}: $${inv2.totalCents / 100}`);

    console.log(`\n✓ M&M tenant seeded.\n`);
  } finally {
    await db.$disconnect();
    await controlPrisma.$disconnect();
  }
}

main().catch(async (err) => {
  console.error("\n✗ seed-mm failed:");
  console.error(err);
  process.exit(1);
});
