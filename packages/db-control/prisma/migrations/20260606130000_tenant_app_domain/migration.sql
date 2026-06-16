-- AlterTable: add internal-app vanity domain for tenants
ALTER TABLE "Tenant" ADD COLUMN "appDomain" TEXT;

-- CreateIndex: enforce uniqueness across all tenants
CREATE UNIQUE INDEX "Tenant_appDomain_key" ON "Tenant"("appDomain");
