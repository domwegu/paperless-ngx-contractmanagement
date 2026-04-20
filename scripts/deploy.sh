#!/bin/bash
# Production Deploy Script
set -e

echo "🚀 Vertragsverwaltung — Production Deploy"
echo "========================================="

# Prüfungen
if [ ! -f ".env" ]; then
  echo "❌ .env nicht gefunden. Bitte anlegen:"
  echo "   cp .env.production.example .env && nano .env"
  exit 1
fi

if [ ! -f "nginx/certs/cert.pem" ] || [ ! -f "nginx/certs/key.pem" ]; then
  echo "❌ SSL-Zertifikate fehlen. Bitte ausführen:"
  echo "   bash scripts/setup-ssl.sh"
  exit 1
fi

# Git pull
echo "📥 Aktuellen Code laden..."
git pull

# Build + Start
echo "🔨 Container bauen und starten..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Warten bis Backend bereit
echo "⏳ Warte auf Backend..."
sleep 10
for i in {1..12}; do
  if docker compose exec -T backend wget -q --spider http://localhost:3000/api/auth/me 2>/dev/null; then
    break
  fi
  echo "   Warte... ($i/12)"
  sleep 5
done

# Seed falls noch nicht gelaufen
echo "🌱 Prüfe Datenbank..."
docker compose exec -T backend npm run seed 2>/dev/null || echo "   Seed bereits ausgeführt oder übersprungen"

echo ""
echo "✅ Deploy abgeschlossen!"
echo ""
echo "   App erreichbar unter: https://$(hostname)"
echo "   Logs: docker compose logs -f"
