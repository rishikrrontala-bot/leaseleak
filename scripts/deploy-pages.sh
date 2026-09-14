#!/usr/bin/env bash
# Build with the GitHub Pages base path and push dist/ to the gh-pages branch.
set -euo pipefail
cd "$(dirname "$0")/.."
BASE_PATH=/leaseleak/ npm run build
mkdir -p dist/app dist/pricing
cp dist/index.html dist/404.html; cp dist/index.html dist/app/index.html; cp dist/index.html dist/pricing/index.html
touch dist/.nojekyll
rm -rf /tmp/ll-pages && cp -r dist /tmp/ll-pages && cd /tmp/ll-pages
git init -q && git checkout -q -b gh-pages && git add -A
git -c user.name="Rishik Rontala" -c user.email="297979650+rishikrrontala-bot@users.noreply.github.com" commit -q -m "Deploy LeaseLeak to GitHub Pages"
git push -f -q https://github.com/rishikrrontala-bot/leaseleak.git gh-pages
echo "deployed: https://rishikrrontala-bot.github.io/leaseleak/"
