# Azure deployment notes

OperateHQ is designed to run on Azure but stay portable. This doc lists the
recommended Azure resources and the steps to bring a new environment up.

## Recommended Azure resources

| Resource | SKU | Notes |
|---|---|---|
| Azure Container Apps | Consumption + Dedicated | Hosts the Next.js standalone build. Autoscales on HTTP. |
| Azure Container Registry | Basic | Stores the operate-web image. |
| Azure Database for PostgreSQL — Flexible Server | Burstable B1ms (dev) / GP D2s (prod) | One server hosting both `operate_control` and every `operate_tenant_*` database. |
| Azure Blob Storage | Standard / Hot | S3-compatible. Use the `azure-blob-storage` SDK or rclone to copy buckets. |
| Azure Front Door | Standard | Wildcard TLS for `*.operatehq.app` + custom domain bindings for individual operators. |
| Azure Key Vault | Standard | Secrets: CONTROL_DATABASE_URL, STRIPE_SECRET_KEY, ANTHROPIC_API_KEY, NEXTAUTH_SECRET. |
| Azure Monitor + Application Insights | Pay-as-you-go | Logs + tracing. |

Cost target: **< $200/month** for the pilot (1 small tenant). Scales linearly per active tenant.

## First-time provisioning

```bash
# 1. Create resource group
az group create -n operate-prod-rg -l westus2

# 2. Create container registry
az acr create -n operatehqregistry -g operate-prod-rg --sku Basic --admin-enabled

# 3. Create Postgres server
az postgres flexible-server create \
  -n operate-prod-pg \
  -g operate-prod-rg \
  -l westus2 \
  --tier Burstable --sku-name Standard_B1ms \
  --version 16 \
  --admin-user operate \
  --admin-password $(openssl rand -base64 24) \
  --public-access 0.0.0.0

# 4. Create operate_control database
az postgres flexible-server db create \
  -g operate-prod-rg \
  -s operate-prod-pg \
  -d operate_control

# 5. Set up Key Vault + secrets
az keyvault create -n operate-prod-kv -g operate-prod-rg
az keyvault secret set --vault-name operate-prod-kv -n CONTROL-DATABASE-URL --value "postgresql://..."
az keyvault secret set --vault-name operate-prod-kv -n NEXTAUTH-SECRET --value "$(openssl rand -base64 32)"
az keyvault secret set --vault-name operate-prod-kv -n ANTHROPIC-API-KEY --value "sk-ant-..."
az keyvault secret set --vault-name operate-prod-kv -n STRIPE-SECRET-KEY --value "sk_live_..."

# 6. Create Container Apps environment + app
az containerapp env create \
  -n operate-prod-env \
  -g operate-prod-rg \
  -l westus2

az containerapp create \
  -n operate-web \
  -g operate-prod-rg \
  --environment operate-prod-env \
  --image operatehqregistry.azurecr.io/operate-web:initial \
  --target-port 3000 \
  --ingress external \
  --min-replicas 1 --max-replicas 5

# 7. Bind custom domain + wildcard cert via Azure Front Door for *.operatehq.app
```

## Tenant provisioning in prod

Tenants are provisioned by hitting the admin UI (`admin.operatehq.app/admin/tenants/new`).
The provisioning code calls `prisma db push` programmatically — this requires the
Container App's container image to include the prisma CLI (it does, via
`@operate/db-tenant`'s dependencies) and the prisma schema files (copied in the
Dockerfile).

When a new tenant DB is created on the shared Postgres server, you may want to:
- Apply a row-level password (Postgres `CREATE USER ... PASSWORD ... GRANT ALL ON DATABASE ...`)
  so each tenant's connection string is scoped to its own database. The provisioning
  CLI doesn't do this today — see `packages/db-tenant/src/provision.ts`.
- Set up automated backups via `az postgres flexible-server backup retention set`.

## Portability

This stack works without Azure. Replace:
- **Container Apps** → any Docker host (Fly.io, Render, a Linux VM).
- **Azure Postgres** → any Postgres 16+.
- **Azure Blob** → MinIO (already used in dev).
- **Key Vault** → `.env` file or HashiCorp Vault.
- **Front Door** → Caddy or Cloudflare for wildcard TLS.
