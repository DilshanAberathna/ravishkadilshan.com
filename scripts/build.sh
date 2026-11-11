#!/usr/bin/env bash
# Assemble the public site into dist/. The local admin and server are not deployed.
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf dist
mkdir dist
cp -r index.html style.css app.js theme.js published.js assets CNAME .nojekyll dist/
echo "Built dist/:"
find dist -type f | sort
