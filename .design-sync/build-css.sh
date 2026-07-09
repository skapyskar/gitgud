#!/usr/bin/env bash
# Compile the app's Tailwind v4 stylesheet into a standalone CSS file for the
# design-system bundle, prefixed with web-font imports + font-var definitions.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p .design-sync/.cache
npx @tailwindcss/cli -i src/app/globals.css -o .design-sync/.cache/tw.css --minify >/dev/null 2>&1 || npx @tailwindcss/cli -i src/app/globals.css -o .design-sync/.cache/tw.css
cat .design-sync/fonts.css .design-sync/.cache/tw.css > .design-sync/.cache/kit.css
echo "kit.css: $(wc -c < .design-sync/.cache/kit.css) bytes"
