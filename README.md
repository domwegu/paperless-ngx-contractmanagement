# Vertragsverwaltung

Vertragsverwaltung mit Paperless-NGX Integration — self-hosted, mandantenfähig.

## Stack

| Schicht    | Technologie                              |
|------------|------------------------------------------|
| Frontend   | React 18, TypeScript, Vite, TailwindCSS  |
| Backend    | NestJS 10, TypeScript                    |
| Datenbank  | PostgreSQL 16                            |
| Cache/Queue| Redis 7                                  |
| Dokumente  | Paperless-NGX (extern, via API)          |
| Deployment | Docker Compose                           |

## Rollen

| Rolle             | Rechte                                    |
|-------------------|-------------------------------------------|
| `super_admin`     | Plattformweit — alles inkl. Mandanten     |
| `admin`           | Mandanten-Admin — Benutzer + alles        |
| `contract_editor` | Verträge + Dokumente anlegen/bearbeiten   |
| `invoice_editor`  | Nur Rechnungen hochladen/bearbeiten       |
| `viewer`          | Nur lesen                                 |

---

## Setup (Entwicklung)

```bash
git clone https://github.com/domwegu/paperless-ngx-contractmanagement.git
cd paperless-ngx-contractmanagement
cp .env.example .env        # .env anpassen
docker compose up -d
docker compose exec backend npm run seed
```

- Frontend: http://localhost:5173
- Backend/Swagger: http://localhost:3000/api/docs
- Login: `admin@vertragsverwaltung.local` / `Admin1234!`

---

## Production Deployment

### 1. SSL-Zertifikat einrichten

```bash
bash scripts/setup-ssl.sh
```

Wähle zwischen Self-signed (internes Netz) oder Let's Encrypt (öffentlich).

### 2. .env anlegen

```bash
cp .env.production.example .env
nano .env   # DB-Passwort, JWT-Secrets, Mail-Config anpassen
```

### 3. Starten

```bash
bash scripts/deploy.sh
```

Oder manuell:
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

### Updates einspielen

```bash
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

---

## Excel / Power Query Live-Link

1. Einstellungen → API-Token generieren
2. Excel → Daten → Daten abrufen → Aus dem Web
3. URL: `https://dein-server/api/export/contracts.json`
4. Header: `Authorization: Bearer <token>`
5. Daten aktualisieren: **Alle aktualisieren**

---

## Projektstruktur

```
apps/
├── backend/     # NestJS API
│   └── src/modules/
│       ├── auth/           # JWT Login
│       ├── tenants/        # Mandanten
│       ├── users/          # Benutzer & Rollen
│       ├── contracts/      # Verträge
│       ├── documents/      # Dokument-Upload → Paperless
│       ├── invoices/       # Rechnungen
│       ├── reminders/      # Fälligkeiten + Cron
│       ├── notifications/  # E-Mail
│       ├── paperless/      # Paperless API Client
│       └── export/         # Excel + PDF + API-Token
└── frontend/    # React App
    └── src/
        ├── pages/          # Seiten
        ├── components/     # UI-Komponenten
        ├── hooks/          # React Query Hooks
        ├── services/       # API Client
        ├── store/          # Auth Store
        └── utils/          # Formatierung

nginx/
├── nginx.conf              # Dev
└── nginx.prod.conf         # Production (SSL)

scripts/
├── setup-ssl.sh            # SSL-Zertifikat einrichten
└── deploy.sh               # Production Deploy
```
