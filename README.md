# KoncanicaDigital

Minimalni foundation (frontend + backend) s MySQL bazom i osnovnim auth flowom.

---

## 1) Preduvjeti

Instalirano:

- Node.js 20+
- npm 10+
- Docker Desktop (preporučeno)

Provjera:

```bash
node -v
npm -v
docker --version
2) Instalacija paketa

Iz root foldera:

npm install
cd backend && npm install
cd ../frontend && npm install
cd ..
3) Pokretanje baze
Opcija A (preporučeno): Docker
docker compose up -d

Provjera:

docker ps

Moraš vidjeti:

koncanica_mysql

Ako container ne radi → provjeri Docker Desktop.

Opcija B: lokalni MySQL

Ako ne koristiš Docker:

CREATE DATABASE koncanica_digital;
4) .env konfiguracija (backend)
cp backend/.env.example backend/.env

Provjeri:

PORT=3001

MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=root
MYSQL_DATABASE=koncanica_digital

SESSION_TTL_HOURS=24
5) Migracije i seed

Iz roota:

npm run db:migrate
npm run db:seed

Očekivani output:

Migration 001_init.sql applied successfully.
Seed completed for admin, tehnolog, cuvar users.
6) Pokretanje aplikacije
Backend
npm run dev:backend

Radi na:

http://localhost:3001

Health:

GET http://localhost:3001/health
Frontend

U novom terminalu:

npm run dev:frontend

Radi na:

http://localhost:5173
Oba odjednom
npm run dev
7) Login podaci
Username	Password	Role
admin	admin123	admin
tehnolog	tehnolog123	tehnolog
cuvar	cuvar123	cuvar
8) End-to-end test

Otvori:

http://localhost:5173

Login:

admin / admin123
Očekivano:
redirect na /app
vidiš "Zaštićeni app shell"
Logout:
vraća na /login
9) API endpointi
Auth
POST   /auth/login
GET    /auth/me
POST   /auth/logout
Health
GET    /health
10) Primjer login requesta
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"admin\",\"password\":\"admin123\"}"
11) Najčešći problemi
Docker ne radi

Greška:

failed to connect to docker API

Rješenje:

pokreni Docker Desktop
Port 3306 zauzet

Rješenje:

promijeni u docker-compose.yml na 3307:3306
promijeni .env port na 3307
Migracija puca

Ako vidiš SQL error:

ponovno pokreni:

docker compose down -v
docker compose up -d
npm run db:migrate
Seed puca

Razlog:

migracija nije prošla

Rješenje:

prvo db:migrate, pa db:seed
12) Reset baze (clean start)
docker compose down -v
docker compose up -d
npm run db:migrate
npm run db:seed
13) Trenutni scope

Implementirano:

auth (login/logout/me)
user roles (admin, tehnolog, cuvar)
session management
protected routes
frontend login

Nije implementirano:

ponds (ribnjaci)
fish logika
bulk operacije
karta
reporti
14) Sljedeći korak

Minimalni CRUD za ponds:

tablica ponds
API:
GET /ponds
POST /ponds
PUT /ponds/:id
DELETE /ponds/:id
frontend lista + forma
