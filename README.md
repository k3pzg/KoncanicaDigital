# KoncanicaDigital

Minimalni temelj (frontend + backend) s MySQL bazom, autentifikacijom i modulom Vodni objekti.

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

## 5) Testni korisnici za prijavu
- `admin / admin123`
- `tehnolog / tehnolog123`
- `cuvar / cuvar123`

## 6) Endpointi autentifikacije
- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/logout`
- `GET /health`

## 7) Modul Vodni objekti

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
- Prijava
- Idi na **modul Vodni objekti**
- Dostupno:
  - lista objekata
  - forma za unos/uređivanje
  - brisanje
  - osnovni kartografski prikaz geometrije iz `polygon_geojson` (samo prikaz, bez crtanja/editiranja)

## 8) Modul Riba - faza 1

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
Seed kategorije ribe:
- `mjesecnjak`
- `jednogodisnja_mladj`
- `dvogodisnja_mladj`
- `konzum`
- `matica`

Seed vrste ribe (minimalno za lokalni test):
- `saran_ljuskas`
- `saran_goli`
- `amur`
- `tolstolobik_sivi`
- `tolstolobik_bijeli`
- `som`
- `smud`
- `stuka`

### Frontend
- Prijava na `http://localhost:5173`
- Otvori **modul Riba - faza 1**
- Dostupno:
  - forma za unos događaja
  - forma za unos kontrole (više redaka)
  - pregled trenutnog stanja po objektu i vrsti
  - pregled povijesti unosa (uključuje kategoriju i podrijetlo)
