#!/bin/bash

echo "=== Installing dependencies ==="
npm install

echo "=== Generating Prisma Client ==="
npx prisma generate

echo "=== Building Next.js ==="
npm run build

echo "=== Copying static files for standalone ==="
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public

echo "=== Starting server on port ${PORT:-5080} ==="
node .next/standalone/server.js
