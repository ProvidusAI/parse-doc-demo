#!/usr/bin/env bash
# Upload the site's pages (only those in manifest.json / manifest.local.json: see approved-files.mjs) to the R2
# bucket the site reads from. Only new or changed files are sent; nothing in the bucket is deleted. Needs rclone and node.
# Keys come from .env (git-ignored): ACCESS_KEY_ID, SECRET_ACCESS_KEY, S3_API_ENDPOINT, optional R2_BUCKET.
#   bash scripts/upload-r2.sh                 upload
#   bash scripts/upload-r2.sh --dry-run       show what would be sent
#   bash scripts/upload-r2.sh --ignore-times  re-send everything (e.g. to give old files the Cache-Control header)
set -euo pipefail
cd "$(dirname "$0")/.."
get() { grep -E "^$1=" .env | head -1 | cut -d= -f2- | tr -d '\r"' || true; }
BUCKET="$(get R2_BUCKET)"; BUCKET="${BUCKET:-parse-doc-demo-pages}"
export RCLONE_CONFIG_R2_TYPE=s3 RCLONE_CONFIG_R2_PROVIDER=Cloudflare RCLONE_CONFIG_R2_REGION=auto RCLONE_CONFIG_R2_NO_CHECK_BUCKET=true
export RCLONE_CONFIG_R2_ACCESS_KEY_ID="$(get ACCESS_KEY_ID)" RCLONE_CONFIG_R2_SECRET_ACCESS_KEY="$(get SECRET_ACCESS_KEY)"
export RCLONE_CONFIG_R2_ENDPOINT="$(get S3_API_ENDPOINT | sed -E 's#^(https?://[^/]*).*#\1#')"
FILES="$(mktemp)"; trap 'rm -f "$FILES"' EXIT
node scripts/approved-files.mjs > "$FILES"
# a checkout without the page data would send an empty manifest over the live one and empty the site on its next build
grep -q '/result\.json$' "$FILES" || { echo "No pages in public/showcase/manifest*.json here: run this on the machine with the page data." >&2; exit 1; }
command -v rclone >/dev/null || { echo "rclone is not installed: brew install rclone" >&2; exit 1; }
# browsers keep page files a day instead of re-asking on every visit (paths aren't content-hashed, so not forever)
rclone copy public/showcase "r2:$BUCKET" --files-from "$FILES" --header-upload "Cache-Control: public, max-age=86400" \
  --transfers 16 --checkers 16 --stats-one-line -P "$@"
# a dry run sent nothing, so there is nothing to verify (the check would list every new file as missing)
[[ " $* " == *" --dry-run "* ]] || rclone check public/showcase "r2:$BUCKET" --files-from "$FILES" --one-way
