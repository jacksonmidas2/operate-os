#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────
# deploy.sh — build + push + deploy the OperateHQ Cloud Run service.
#
# Usage:
#   npm run deploy              # auto-tag with timestamp
#   npm run deploy -- v1.2.3    # explicit tag
#
# What it does:
#   1. Validate gcloud auth + active account
#   2. Submit Cloud Build with cloudbuild.yaml at the repo root
#   3. Deploy the new image as a Cloud Run revision
#   4. Print the live URL
# ─────────────────────────────────────────────────────────────────────
set -euo pipefail

PROJECT="${OPERATE_GCP_PROJECT:-deep-contact-470100-f0}"
REGION="${OPERATE_GCP_REGION:-us-central1}"
SERVICE="${OPERATE_GCP_SERVICE:-operate-web}"
IMAGE_REPO="${REGION}-docker.pkg.dev/${PROJECT}/operate/${SERVICE}"

# tag: arg 1, else compact timestamp
TAG="${1:-$(date +%Y%m%d-%H%M%S)}"
IMAGE="${IMAGE_REPO}:${TAG}"

cyan() { printf "\033[36m%s\033[0m\n" "$*"; }
green() { printf "\033[32m%s\033[0m\n" "$*"; }
red() { printf "\033[31m%s\033[0m\n" "$*" 1>&2; }

# ── preflight ────────────────────────────────────────────────────────
cyan "▸ Preflight"
ACCOUNT=$(gcloud config get-value account 2>/dev/null)
if [ -z "$ACCOUNT" ]; then
  red "No active gcloud account. Run: gcloud auth login"
  exit 1
fi
echo "  account: $ACCOUNT"
echo "  project: $PROJECT"
echo "  region:  $REGION"
echo "  tag:     $TAG"
echo

# ── build ────────────────────────────────────────────────────────────
cyan "▸ Submitting Cloud Build (~5 min)…"
gcloud builds submit \
  --config=cloudbuild.yaml \
  --substitutions="_TAG=${TAG}" \
  --project="${PROJECT}" \
  .

# ── deploy ───────────────────────────────────────────────────────────
cyan "▸ Deploying Cloud Run revision…"
gcloud run deploy "${SERVICE}" \
  --image="${IMAGE}" \
  --region="${REGION}" \
  --project="${PROJECT}" \
  --quiet

# ── done ─────────────────────────────────────────────────────────────
URL=$(gcloud run services describe "${SERVICE}" \
  --region="${REGION}" \
  --project="${PROJECT}" \
  --format="value(status.url)")

echo
green "✓ Live: $URL"
green "  image: $IMAGE"
