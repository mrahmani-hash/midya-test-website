#!/bin/sh
set -e
mkdir -p _site
for f in \
  index.html styles.css script.js \
  favicon.svg favicon-16x16.png favicon-32x32.png \
  apple-touch-icon.png og-image.png og-image.jpg midya-photo.png \
  site.webmanifest robots.txt sitemap.xml
do
  if [ -f "$f" ]; then
    cp "$f" _site/
  fi
done
echo "Built _site:"
ls -la _site
