# Vertragsverwaltung

Vertragsverwaltung mit Paperless-NGX Integration.

## Stack

| Schicht    | Technologie                     |
|------------|---------------------------------|
| Frontend   | React 18, TypeScript, Vite, TailwindCSS |
| Backend    | NestJS 10, TypeScript           |
| Datenbank  | PostgreSQL 16                   |
| Cache/Queue| Redis 7                         |
| Dokumente  | Paperless-NGX (extern, via API) |
| Deployment | Docker Compose                  |

## Setup (Entwicklung)

```bash
# 1. Repo klonen
git clone <repo-url>
cd vertragsverwaltung

# 2. .env anlegen
cp .env.example .env
# → .env anpassen (DB-Passwort, JWT-Secret, Paperless-Token)

# 3. Starten
docker compose up -d

# Frontend: http://localhost:5173
# Backend:  http://localhost:3000
# Swagger:  http://localhost:3000/api/docs
```

## Deployment (Production)

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Projektstruktur

```
apps/
├── backend/     # NestJS API
│   └── src/
│       └── modules/
│           ├── auth/           # Login, JWT
│           ├── tenants/        # Mandanten
│           ├── users/          # Benutzer & Rollen
│           ├── contracts/      # Verträge (Kern)
│           ├── documents/      # Upload → Paperless
│           ├── invoices/       # Rechnungen
│           ├── reminders/      # Fälligkeiten, Cron
│           ├── notifications/  # E-Mail
│           └── paperless/      # Paperless API Client
└── frontend/    # React App
    └── src/
        ├── pages/
        ├── components/
        ├── hooks/
        ├── services/    # API-Aufrufe
        ├── store/       # Zustand (Zustand)
        └── types/
```
