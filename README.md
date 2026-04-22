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

`npm run dev` koristi `concurrently` (cross-platform), pa radi i u Windows PowerShellu bez Bash/WSL ovisnosti.

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

## 9) Real data onboarding (legacy import)

Source dump/schema: `energovi_koncanicasmart`.

Import skripta:
- `backend/src/scripts/import-legacy-phase1.js`

Podržani modovi:
- dry run (default): ne zapisuje podatke, ispisuje sažetak
- apply (`--apply`): zapisuje podatke u novu bazu

### Komande
```bash
# Dry run za obje faze (vodni objekti + nasadi)
npm run import:legacy:dry

# Primjena importa (idempotentno)
npm run import:legacy:apply

# Samo faza vodnih objekata
npm --workspace backend run import:legacy:dry -- --phase=water

# Samo faza nasada ribe
npm --workspace backend run import:legacy:dry -- --phase=fish
```

### ENV opcije (po potrebi)
- `LEGACY_DB_NAME` (default: `energovi_koncanicasmart`)
- `LEGACY_PONDS_TABLE` (default: `ponds`)
- `LEGACY_FISH_EVENTS_TABLE` (default: `fish_events`)

### Što skripta radi
- **Faza 1 – vodni objekti (`ponds` -> `water_objects`)**
  - mapira polja prema dogovorenom mapiranju
  - mapira tipove objekata na novi enum
  - sprječava duplikate po `code` (`ON DUPLICATE KEY UPDATE`)
  - pokušava pretvoriti `polygon_wkt` u `polygon_geojson` (WKT `POLYGON`/`MULTIPOLYGON` ili već JSON string)

- **Faza 2 – nasadi ribe (`fish_events` -> `fish_entry_events`)**
  - uzima samo `event_type = nasad`
  - preskače testne redove
  - mapira species/category na nove lookup tablice
  - prijavljuje unmapped species/category
  - parsira podrijetlo iz `notes` (`interni_objekt` / `mrijestiliste` / `ostalo`)
  - upisuje događaje idempotentno (preskače već postojeće iste zapise)
  - nakon upisa ažurira `fish_stock_current`

### Summary output
Skripta na kraju ispisuje:
- koliko je objekata importirano / preskočeno
- koliko je fish entry događaja importirano / preskočeno
- listu unmapped species
- listu unmapped category vrijednosti
