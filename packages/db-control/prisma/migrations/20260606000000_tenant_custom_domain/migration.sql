-- AlterTable: add optional vanity domain for tenants
ALTER TABLE "Tenant" ADD COLUMN "customDomain" TEXT;

-- CreateIndex: enforce uniqueness across all tenants
CREATE UNIQUE INDEX "Tenant_customDomain_key" ON "Tenant"("customDomain");
