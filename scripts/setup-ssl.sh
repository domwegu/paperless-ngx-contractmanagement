#!/bin/bash
# SSL-Zertifikat Setup
# Variante A: Self-signed (für internes Netz)
# Variante B: Let's Encrypt (für öffentlich erreichbare Server)

set -e

CERTS_DIR="$(dirname "$0")/../nginx/certs"
mkdir -p "$CERTS_DIR"

echo "SSL-Zertifikat Setup"
echo "===================="
echo ""
echo "Welche Variante?"
echo "  1) Self-signed Zertifikat (internes Netz, kein öffentlicher DNS)"
echo "  2) Let's Encrypt (öffentlich erreichbar, echter Domainname nötig)"
echo ""
read -p "Auswahl [1/2]: " CHOICE

if [ "$CHOICE" = "1" ]; then
  # Self-signed
  read -p "Hostname/IP (z.B. ka-ithub oder 192.168.1.100): " HOSTNAME
  openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
    -keyout "$CERTS_DIR/key.pem" \
    -out "$CERTS_DIR/cert.pem" \
    -subj "/CN=$HOSTNAME/O=Vertragsverwaltung/C=DE" \
    -addext "subjectAltName=DNS:$HOSTNAME,IP:$HOSTNAME" 2>/dev/null || \
  openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
    -keyout "$CERTS_DIR/key.pem" \
    -out "$CERTS_DIR/cert.pem" \
    -subj "/CN=$HOSTNAME/O=Vertragsverwaltung/C=DE"
  echo ""
  echo "✅ Self-signed Zertifikat erstellt (gültig 10 Jahre)"
  echo "   cert.pem und key.pem in nginx/certs/"
  echo ""
  echo "⚠️  Browser wird eine Warnung zeigen — einmalig Ausnahme hinzufügen"

elif [ "$CHOICE" = "2" ]; then
  # Let's Encrypt via certbot
  read -p "Domain (z.B. vertraege.firma.de): " DOMAIN
  read -p "E-Mail für Let's Encrypt: " EMAIL

  if ! command -v certbot &> /dev/null; then
    echo "certbot nicht gefunden. Installation:"
    echo "  apt install certbot   (Debian/Ubuntu)"
    echo "  oder: https://certbot.eff.org"
    exit 1
  fi

  # Zertifikat holen (Port 80 muss erreichbar sein)
  certbot certonly --standalone -d "$DOMAIN" --email "$EMAIL" --agree-tos -n
  cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$CERTS_DIR/cert.pem"
  cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem"   "$CERTS_DIR/key.pem"

  echo ""
  echo "✅ Let's Encrypt Zertifikat eingerichtet"
  echo ""
  echo "Auto-Renewal einrichten:"
  echo "  crontab -e"
  echo "  0 3 * * * certbot renew --quiet && cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem $(pwd)/nginx/certs/cert.pem && cp /etc/letsencrypt/live/$DOMAIN/privkey.pem $(pwd)/nginx/certs/key.pem && docker compose restart nginx"
fi

echo ""
echo "Nächster Schritt: Production starten"
echo "  cp .env.production.example .env"
echo "  # .env anpassen"
echo "  docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build"
