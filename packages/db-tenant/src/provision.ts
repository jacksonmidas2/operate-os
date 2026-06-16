import { Client as PgClient } from "pg";
import { execFileSync } from "node:child_process";
import { resolve as pathResolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { controlPrisma } from "@operate/db-control";

const RESERVED = new Set([
  "www",
  "api",
  "admin",
  "book",
  "app",
  "auth",
  "postgres",
  "public",
]);

function validateSlug(slug: string): void {
  if (!/^[a-z][a-z0-9-]{0,30}[a-z0-9]$/.test(slug)) {
    throw new Error(
      `Invalid slug "${slug}". Must be 2-32 chars, lowercase, start with a letter, end alphanumeric.`,
    );
  }
  if (RESERVED.has(slug)) {
    throw new Error(`Slug "${slug}" is reserved.`);
  }
}

function buildTenantDbUrl(slug: string): string {
  const host = process.env.TENANT_DB_HOST ?? "localhost";
  const port = process.env.TENANT_DB_PORT ?? "5432";
  const user = process.env.TENANT_DB_USER ?? "operate";
  const password = process.env.TENANT_DB_PASSWORD ?? "operate";
  return `postgresql://${user}:${password}@${host}:${port}/operate_tenant_${slug}?schema=public`;
}

async function createDatabaseIfMissing(slug: string): Promise<string> {
  const adminUrl =
    process.env.TENANT_DB_ADMIN_URL ??
    "postgresql://operate:operate@localhost:5432/postgres";
  const dbName = `operate_tenant_${slug}`;
  const client = new PgClient({ connectionString: adminUrl });
  await client.connect();
  try {
    const exists = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName],
    );
    if (exists.rowCount === 0) {
      await client.query(`CREATE DATABASE "${dbName}"`);
    }
  } finally {
    await client.end();
  }
  return buildTenantDbUrl(slug);
}

function resolveSchemaPath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  // src/ → up one to package root, then into prisma/
  return pathResolve(here, "..", "prisma", "schema.prisma");
}

function applyTenantSchema(databaseUrl: string): void {
  execFileSync(
    "npx",
    ["prisma", "db", "push", "--schema", resolveSchemaPath(), "--skip-generate"],
    {
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: "inherit",
      shell: true,
    },
  );
}

export interface ProvisionTenantArgs {
  slug: string;
  legalName: string;
  displayName?: string;
  customDomain?: string;
  appDomain?: string;
}

export interface ProvisionedTenant {
  id: string;
  slug: string;
  databaseUrl: string;
  customDomain: string | null;
  appDomain: string | null;
}

function normalizeDomain(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");
}

export async function provisionTenant(
  args: ProvisionTenantArgs,
): Promise<ProvisionedTenant> {
  validateSlug(args.slug);

  const existing = await controlPrisma.tenant.findUnique({
    where: { slug: args.slug },
  });
  if (existing) {
    throw new Error(
      `Tenant "${args.slug}" already exists (status=${existing.status})`,
    );
  }

  const customDomain = args.customDomain
    ? normalizeDomain(args.customDomain)
    : null;
  const appDomain = args.appDomain ? normalizeDomain(args.appDomain) : null;
  for (const candidate of [customDomain, appDomain].filter(
    (d): d is string => Boolean(d),
  )) {
    const taken = await controlPrisma.tenant.findFirst({
      where: {
        OR: [{ customDomain: candidate }, { appDomain: candidate }],
      },
    });
    if (taken) {
      throw new Error(
        `Domain "${candidate}" is already in use by tenant "${taken.slug}".`,
      );
    }
  }

  const databaseUrl = await createDatabaseIfMissing(args.slug);
  applyTenantSchema(databaseUrl);

  const tenant = await controlPrisma.tenant.create({
    data: {
      slug: args.slug,
      legalName: args.legalName,
      displayName: args.displayName,
      databaseUrl,
      customDomain,
      appDomain,
      status: "ACTIVE",
    },
  });

  return {
    id: tenant.id,
    slug: tenant.slug,
    databaseUrl,
    customDomain: tenant.customDomain,
    appDomain: tenant.appDomain,
  };
}
