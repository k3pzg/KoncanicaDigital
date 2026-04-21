# KoncanicaDigital

Minimalni foundation (frontend + backend) s MySQL bazom i osnovnim auth flowom.

## 1) Preduvjeti

- Node.js 20+
- npm 10+
- Docker (preporučeno za lokalni MySQL)

## 2) Instalacija paketa

```bash
npm install
```

> Root više **ne koristi `concurrently`** paket, pa `npm install` prolazi bez tog 403 problema.

## 3) Pokretanje baze

### Opcija A (preporučeno): Docker Compose

```bash
docker compose up -d
```

Ovo podiže MySQL na `localhost:3306`.

### Opcija B: lokalni MySQL server

Ako ne koristiš Docker, ručno kreiraj bazu:

```sql
CREATE DATABASE koncanica_digital;
```

## 4) .env konfiguracija (backend)

```bash
cp backend/.env.example backend/.env
```

Provjeri vrijednosti u `backend/.env`:

```env
PORT=3001
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=root
MYSQL_DATABASE=koncanica_digital
SESSION_TTL_HOURS=24
```

## 5) Migracije i seed

Iz roota projekta:

```bash
npm run db:migrate
npm run db:seed
```

Seed korisnici:

- `admin / admin123`
- `tehnolog / tehnolog123`
- `cuvar / cuvar123`

## 6) Pokretanje backenda i frontenda

### Backend

```bash
npm run dev:backend
```

- URL: `http://localhost:3001`
- Health: `GET http://localhost:3001/health`

### Frontend

```bash
npm run dev:frontend
```

- URL: `http://localhost:5173`

### Oba odjednom

```bash
npm run dev
```

## 7) End-to-end provjera login flowa

1. Otvori `http://localhost:5173`
2. Login: `admin / admin123`
3. Nakon uspješne prijave redirect ide na `/app` (protected route)
4. Klikni **Logout** -> vraća na login ekran (`/login`)

## 8) API auth endpointi

- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/logout`
- `GET /health`

Primjer login requesta:

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```
