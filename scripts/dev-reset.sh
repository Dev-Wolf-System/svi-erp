#!/usr/bin/env bash
# ============================================================================
# SVI dev — limpieza completa de caché y reinicio
# Uso: bash scripts/dev-reset.sh
# ============================================================================
set -e

cd "$(dirname "$0")/.."

echo "🛑 Matando procesos next/turbo..."
pkill -f "next dev" 2>/dev/null || true
pkill -f "next-server" 2>/dev/null || true
pkill -f "turbo run dev" 2>/dev/null || true
sleep 1

echo "🧹 Borrando cachés..."
rm -rf apps/web/.next apps/admin/.next
rm -rf .turbo apps/*/.turbo packages/*/.turbo
rm -rf node_modules/.cache

echo "🔧 Reparando bin symlinks (fix WSL2)..."
npm rebuild --bin-links > /dev/null 2>&1

echo "🚀 Levantando dev..."
npm run dev
