#!/bin/bash

echo "=== Installing dependencies ==="
npm install

echo "=== Generating Prisma Client ==="
npx prisma generate

echo "=== Building Next.js (standalone) ==="
npm run build

echo "=== Copying static files ==="
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public

echo "=== Copying database ==="
cp prisma/dev.db .next/standalone/prisma/dev.db 2>/dev/null || true
cp .env .next/standalone/.env 2>/dev/null || true

echo "=== Starting server on port ${PORT:-3000} ==="
cd .next/standalone
node server.js
