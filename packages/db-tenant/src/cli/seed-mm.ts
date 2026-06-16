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

    // ── Additional clients (from Marilu's May 31 + June 2/3 emails) ──
    // Marilu sent these later — they're recurring contracts she has been
    // running outside the RHF turnover work.

    const louisVuitton = await db.client.upsert({
      where: { id: "louis-vuitton" },
      update: {},
      create: {
        id: "louis-vuitton",
        businessName: "Louis Vuitton",
        startedAt: new Date("2025-06-15T00:00:00Z"),
        billingStructure: "FLAT_MONTHLY",
        notes: "Topanga store. 7 days/week, 7.5 hr split among 3 women.",
      },
    });
    const lvLocation = await db.location.upsert({
      where: { id: "loc-lv-topanga" },
      update: {},
      create: {
        id: "loc-lv-topanga",
        clientId: louisVuitton.id,
        name: "Louis Vuitton — Topanga (Canoga Park)",
        addressLine1: "6600 Topanga Canyon Blvd",
        city: "Canoga Park",
        state: "CA",
        postalCode: "91303",
        monthlyPaymentCents: 519334, // $5,193.34
      },
    });
    console.log(`  ✓ client + location: ${louisVuitton.businessName}`);

    const bloomingdales = await db.client.upsert({
      where: { id: "bloomingdales-scp" },
      update: {},
      create: {
        id: "bloomingdales-scp",
        businessName: "Bloomingdales — South Coast Plaza",
        startedAt: new Date("2025-06-15T00:00:00Z"),
        billingStructure: "FLAT_MONTHLY",
        notes:
          "South Coast Plaza store at 333 Bristol St. Multiple departments " +
          "(women's, men's, VIP, Vic) cleaned separately — modeled as " +
          "locations under one client.",
      },
    });
    const scpLocations = [
      {
        id: "loc-scp-women",
        name: "Bloomingdales — Women's Store",
        cents: 2287738, // $22,877.38
      },
      {
        id: "loc-scp-men",
        name: "Bloomingdales — Men's Store",
        cents: 1033607, // $10,336.07
      },
      {
        id: "loc-scp-vic",
        name: "Bloomingdales — Vic",
        cents: 162452, // $1,624.52
      },
      {
        id: "loc-scp-vip",
        name: "Bloomingdales — VIP",
        cents: null, // not given
      },
    ];
    for (const loc of scpLocations) {
      await db.location.upsert({
        where: { id: loc.id },
        update: {},
        create: {
          id: loc.id,
          clientId: bloomingdales.id,
          name: loc.name,
          addressLine1: "333 Bristol St, Suite 2500",
          city: "Costa Mesa",
          state: "CA",
          postalCode: "92626",
          monthlyPaymentCents: loc.cents,
        },
      });
    }
    console.log(
      `  ✓ client + ${scpLocations.length} locations: ${bloomingdales.businessName}`,
    );

    const avlMobility = await db.client.upsert({
      where: { id: "avl-mobility" },
      update: {},
      create: {
        id: "avl-mobility",
        businessName: "AVL Mobility Technologies Inc",
        billingStructure: "FLAT_MONTHLY",
        notes: "2 days/week, 3 hr/day, 2 people.",
      },
    });
    await db.location.upsert({
      where: { id: "loc-avl-lakeforest" },
      update: {},
      create: {
        id: "loc-avl-lakeforest",
        clientId: avlMobility.id,
        name: "AVL Mobility — Lake Forest",
        addressLine1: "25111 Arctic Ocean Dr",
        city: "Lake Forest",
        state: "CA",
        postalCode: "92630",
        monthlyPaymentCents: 102900, // $1,029.00
      },
    });
    console.log(`  ✓ client + location: ${avlMobility.businessName}`);

    // ── Employees (all independent contractors, $18/hr default) ──────
    // Pay rate is stated as $18/hr for Louis Vuitton in the email thread;
    // applied as the default across the roster pending Marilu's review.
    const RATE_CENTS = 1800;
    const roster: Array<{
      id: string;
      firstName: string;
      lastName: string;
      startedAt?: string;
      notes?: string;
    }> = [
      { id: "emp-moises-torres", firstName: "Moises", lastName: "Torres",
        notes: "Bloomingdales SCP — Vic (3 days/week, 3 hr)." },
      { id: "emp-adriana-lovano", firstName: "Adriana", lastName: "Lovano",
        notes: "Bloomingdales SCP — Vic + Men's store mornings (3 hr)." },
      { id: "emp-claudia-zuniga", firstName: "Claudia", lastName: "Zuniga",
        notes: "Bloomingdales SCP — Men's store mornings (3 hr, 7 days)." },
      { id: "emp-eladia", firstName: "Eladia", lastName: "",
        notes: "Bloomingdales SCP — Men's store afternoons (8 hr, 5 days)." },
      { id: "emp-blanca-sanchez", firstName: "Blanca Esthela", lastName: "Sanchez",
        startedAt: "2025-06-15",
        notes: "Bloomingdales SCP — Women's store AM 4hr + Mon/Tues PM 8hr." },
      { id: "emp-adriana-salceda", firstName: "Adriana", lastName: "Salceda",
        startedAt: "2025-06-15",
        notes: "Bloomingdales SCP — Women's store AM 4hr + Mon/Tues PM 8hr." },
      { id: "emp-valentina-munoz", firstName: "Valentina", lastName: "Munoz",
        startedAt: "2025-06-15",
        notes: "Bloomingdales SCP — Women's store AM 4hr + 3 days PM 8hr." },
      { id: "emp-sandra-bravo", firstName: "Sandra", lastName: "Bravo",
        startedAt: "2025-06-15",
        notes: "Bloomingdales SCP — Women's store AM 4hr." },
      { id: "emp-rosalba-cisneros", firstName: "Rosalba", lastName: "Cisneros",
        notes: "Bloomingdales SCP — 2 days (Sat/Sun) PM 8hr." },
      { id: "emp-migelina-lazaro", firstName: "Migelina", lastName: "Lazaro",
        startedAt: "2026-04-01",
        notes: "Bloomingdales SCP — Women's store, 5 days/wk × 8 hr." },
      { id: "emp-brenda-ramirez", firstName: "Brenda", lastName: "Ramirez",
        startedAt: "2026-01-24",
        notes: "Bloomingdales SCP — VIP, 4 days/wk × 8 hr." },
      { id: "emp-karina-rivas", firstName: "Karina", lastName: "Rivas",
        startedAt: "2025-11-08",
        notes: "Louis Vuitton — 6 days × 2.5 hr." },
      { id: "emp-elizabeth-ramirez", firstName: "Elizabeth", lastName: "Ramirez",
        startedAt: "2025-06-15",
        notes: "Louis Vuitton — 7 days × 2.5 hr." },
      { id: "emp-lourdes-cruz", firstName: "Lourdes", lastName: "Cruz",
        startedAt: "2026-05-02",
        notes: "Louis Vuitton — 2 days × 2.5 hr." },
      { id: "emp-juana", firstName: "Juana", lastName: "",
        notes: "Louis Vuitton — Topanga store." },
      { id: "emp-juanita", firstName: "Juanita", lastName: "",
        notes: "Bloomingdales SCP — Vic 3 days; Women's PM 2 days." },
    ];
    for (const e of roster) {
      await db.employee.upsert({
        where: { id: e.id },
        update: {},
        create: {
          id: e.id,
          firstName: e.firstName,
          lastName: e.lastName,
          employmentType: "CONTRACTOR",
          payRateCents: RATE_CENTS,
          payRateUnit: "HOURLY",
          paymentMethod: "ZELLE",
          status: "GREEN",
          startedAt: e.startedAt ? new Date(`${e.startedAt}T00:00:00Z`) : null,
          notes: e.notes,
        },
      });
    }
    console.log(`  ✓ ${roster.length} employees`);

    // ── Public site config (M&M's marketing site at mmcleaningllc.com) ──
    await db.publicSiteConfig.upsert({
      where: { id: "mm-site-config" },
      update: {},
      create: {
        id: "mm-site-config",
        tagline: "Trusted commercial cleaning across Southern California",
        heroHeadline: "Spotless spaces. Quiet operations.",
        heroSubhead:
          "M&M Cleaning is the partner Southern California retailers, property managers, and offices rely on for turnover, recurring, and deep cleans — done right, every time.",
        heroCtaLabel: "Get a free quote",
        aboutBody:
          "M&M Cleaning Co LLC is a family-owned cleaning business based in Southern California. Founded and run by Marilu Cisneros, we built our reputation cleaning small commercial spaces — and every job today is still treated as if it's the one that earns the next referral.\n\nOur crews clean retail flagships, professional offices, and apartment communities across Greater Los Angeles, Orange County, and the San Fernando Valley. From Louis Vuitton in Canoga Park to Bloomingdales at South Coast Plaza to apartment turnovers in Los Angeles, our clients trust us to show up on time, ask the right questions, and treat their spaces like our own.\n\nNo long-term contracts, no surprise fees — just clean spaces, on schedule.",
        serviceAreaText:
          "Greater Los Angeles, Orange County, and the San Fernando Valley",
        yearsInBusiness: 1,
        brandPrimaryColor: "#F59E0B",
        brandAccentColor: "#EA580C",
        publicPhone: "(714) 880-0604",
        publicEmail: "marilu.cisneros@mmcleaningllc.com",
        published: true,
      },
    });
    console.log(`  ✓ public site config`);

    const sitServices = [
      {
        id: "svc-retail",
        name: "Retail store cleaning",
        shortDesc: "Daily floor care for flagships, boutiques, and mall stores.",
        longDesc:
          "Open-to-close cleaning programs for retail floors of every size — from boutique single-store contracts to multi-department flagships. We work around store hours and customer traffic, with crews trained for stockrooms, fitting rooms, restrooms, and front-of-house.",
        sortOrder: 1,
        isCommercial: true,
        isResidential: false,
      },
      {
        id: "svc-office",
        name: "Office & corporate cleaning",
        shortDesc:
          "Recurring janitorial service for offices and corporate suites.",
        longDesc:
          "Daily, weekly, or monthly cleaning programs for offices and small corporate campuses. Standard scope covers workstations, conference rooms, kitchens, and restrooms — plus high-touch sanitation. Custom scopes welcome.",
        sortOrder: 2,
        isCommercial: true,
        isResidential: false,
      },
      {
        id: "svc-turnover",
        name: "Apartment & unit turnover",
        shortDesc:
          "Between-tenant deep cleans for property managers and landlords.",
        longDesc:
          "Per-unit pricing by bedroom count. We coordinate with your leasing team to get units rent-ready fast — kitchens, bathrooms, floors, and appliances detailed to handoff standard.",
        sortOrder: 3,
        isCommercial: true,
        isResidential: true,
      },
      {
        id: "svc-deep",
        name: "Deep cleaning",
        shortDesc:
          "One-time top-to-bottom resets for spaces that need extra attention.",
        longDesc:
          "Baseboards, vents, inside cabinets, full appliance interiors, grout — a methodical deep clean for properties that have fallen behind, before a sale, or after construction.",
        sortOrder: 4,
        isCommercial: true,
        isResidential: true,
      },
      {
        id: "svc-recurring",
        name: "Recurring janitorial",
        shortDesc:
          "Predictable, dependable cleaning on a schedule that works for you.",
        longDesc:
          "Daily, weekly, or biweekly programs. One point of contact, one invoice, one crew you'll recognize.",
        sortOrder: 5,
        isCommercial: true,
        isResidential: false,
      },
      {
        id: "svc-move",
        name: "Move-in / move-out",
        shortDesc:
          "Fresh-start cleans for new homeowners, renters, and property managers.",
        longDesc:
          "Whole-property cleans timed to your move. Bring nothing — we handle supplies and equipment.",
        sortOrder: 6,
        isCommercial: false,
        isResidential: true,
      },
    ];
    for (const s of sitServices) {
      await db.publicService.upsert({
        where: { id: s.id },
        update: {},
        create: s,
      });
    }
    console.log(`  ✓ ${sitServices.length} public services`);

    // ── Insurance (from M&M's ACORD 25 Certificate of Liability) ──────
    // We have the certificate on hand (file2.jpg in the project dir).
    // Specific carrier names and policy numbers are not OCR-clean from
    // the photo — operator confirms exact carriers in the InsurancePolicy
    // edit screen.
    await db.insurancePolicy.upsert({
      where: { id: "mm-insurance-primary" },
      update: {},
      create: {
        id: "mm-insurance-primary",
        insurerName: "On file (ACORD 25)",
        coverageDescription:
          "Commercial general liability + commercial auto + umbrella + workers' compensation. ACORD 25 certificate of liability insurance on file.",
      },
    });
    console.log(`  ✓ insurance policy (ACORD 25)`);

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
