#!/bin/bash
# Pterodactyl Startup Sequence untuk Next.js
echo "==========================================="
echo " DUEL STANDBY! SERVER BOOT SEQUENCE"
echo "==========================================="

echo "📦 Installing Dependencies..."
npm ci --production

echo "⏳ Generating Prisma MySQL Client..."
npx prisma generate

PORT=${SERVER_PORT:-3000}
echo "🚀 Starting Next.js Server on port $PORT..."
export PORT=$PORT
npm run start
