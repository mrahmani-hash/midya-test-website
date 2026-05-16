#!/bin/sh
set -e
mkdir -p _site
for f in \
  index.html styles.css script.js fx-extra.js \
  favicon.svg favicon-16x16.png favicon-32x32.png \
  apple-touch-icon.png og-image.png og-image.jpg midya-photo.png \
  waterloo-logo.svg york-logo.svg \
  site.webmanifest robots.txt sitemap.xml
do
  if [ -f "$f" ]; then
    cp "$f" _site/
  fi
done
# Social preview image must match og:image URL (query string is cache-bust only)
if [ -f og-image.jpg ]; then
  cp og-image.jpg _site/og-image.jpg
fi
echo "Built _site:"
ls -la _site
