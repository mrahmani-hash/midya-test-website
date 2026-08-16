#!/bin/sh
set -eu

npm ci
npm run build

echo "Built Vite output in dist/"
ls -la dist
