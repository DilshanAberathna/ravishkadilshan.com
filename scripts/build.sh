#!/usr/bin/env bash
# Assemble the public site into dist/. The admin panel is deployed separately (Vercel).
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf dist
mkdir dist
cp -r index.html style.css app.js theme.js published.js content.json assets CNAME .nojekyll dist/
[ -d media ] && cp -r media dist/
rm -f dist/media/.gitkeep
echo "Built dist/:"
find dist -type f | sort
