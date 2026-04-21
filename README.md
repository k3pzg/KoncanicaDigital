# KoncanicaDigital

Minimalni foundation (frontend + backend) s MySQL bazom, auth flowom i Water Objects modulom.

## 1) Preduvjeti
- Node.js 20+
- npm 10+
- Docker (preporučeno za lokalni MySQL)

## 2) Instalacija
```bash
npm install
```

## 3) Baza
```bash
docker compose up -d
cp backend/.env.example backend/.env
npm run db:migrate
npm run db:seed
```

## 4) Pokretanje aplikacije
```bash
npm run dev
```

- Backend: `http://localhost:3001`
- Frontend: `http://localhost:5173`

## 5) Login test korisnici
- `admin / admin123`
- `tehnolog / tehnolog123`
- `cuvar / cuvar123`

## 6) Auth endpointi
- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/logout`
- `GET /health`

## 7) Water Objects modul

### API endpointi
- `GET /water-objects`
- `GET /water-objects/:id`
- `POST /water-objects`
- `PUT /water-objects/:id`
- `DELETE /water-objects/:id`

`object_type` mora biti jedno od:
- `ribnjak`
- `bazen`
- `kanal`
- `zimovnik`
- `rastiliste`
- `maticnjak`

### Frontend
- Otvori `http://localhost:5173`
- Login
- Idi na **Water Objects modul**
- Dostupno:
  - lista objekata
  - create/edit forma
  - brisanje
  - basic map prikaz geometrije iz `polygon_geojson` (samo prikaz, bez crtanja/editiranja)

## 8) Fish module phase 1

### API endpointi
- `GET /fish-species`
- `GET /fish-categories`
- `GET /fish-entry-events`
- `GET /fish-entry-events/:id`
- `POST /fish-entry-events`
- `GET /fish-control-events`
- `GET /fish-control-events/:id`
- `POST /fish-control-events`
- `GET /fish-stock-current`
- `GET /fish-stock-current?waterObjectId=...`

### Seed lookup podaci
Fish categories seed:
- `mjesecnjak`
- `jednogodisnja_mladj`
- `dvogodisnja_mladj`
- `konzum`
- `matica`

Fish species seed (minimalno za lokalni test):
- `saran`
- `amur`
- `stuka`

### Frontend
- Login na `http://localhost:5173`
- Otvori **Fish phase 1 modul**
- Dostupno:
  - Entry form
  - Control form (više lineova)
  - Current stock pregled po objektu i vrsti
  - Entry history pregled (uključuje kategoriju i podrijetlo)
