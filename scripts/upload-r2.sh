#!/usr/bin/env bash
# Upload public/showcase (page images, DocAI results, manifests) to the R2 bucket the site reads from.
# Only new or changed files are sent; nothing in the bucket is deleted. Needs rclone.
# Keys come from .env (git-ignored): ACCESS_KEY_ID, SECRET_ACCESS_KEY, S3_API_ENDPOINT, optional R2_BUCKET.
#   bash scripts/upload-r2.sh            upload
#   bash scripts/upload-r2.sh --dry-run  show what would be sent
set -euo pipefail
cd "$(dirname "$0")/.."
get() { grep -E "^$1=" .env | head -1 | cut -d= -f2- | tr -d '\r"' || true; }
BUCKET="$(get R2_BUCKET)"; BUCKET="${BUCKET:-parse-doc-demo-pages}"
export RCLONE_CONFIG_R2_TYPE=s3 RCLONE_CONFIG_R2_PROVIDER=Cloudflare RCLONE_CONFIG_R2_REGION=auto RCLONE_CONFIG_R2_NO_CHECK_BUCKET=true
export RCLONE_CONFIG_R2_ACCESS_KEY_ID="$(get ACCESS_KEY_ID)" RCLONE_CONFIG_R2_SECRET_ACCESS_KEY="$(get SECRET_ACCESS_KEY)"
export RCLONE_CONFIG_R2_ENDPOINT="$(get S3_API_ENDPOINT | sed -E 's#^(https?://[^/]*).*#\1#')"
rclone copy public/showcase "r2:$BUCKET" --exclude "wall/**" --transfers 16 --checkers 16 --stats-one-line -P "$@"
rclone check public/showcase "r2:$BUCKET" --exclude "wall/**" --one-way
