# Koncanica Digital – Project Context

## 1. Arhitektura

### Tehnološki stack
- Backend: Node.js
- Frontend: React + Vite
- Baza: MySQL
- Lokalna baza se diže kroz Docker
- Lokalni development je podešen tako da `npm run dev` radi na Windows PowerShellu bez Bash/WSL ovisnosti

### Struktura
Projekt je postavljen kao clean, modularni workspace projekt s odvojenim:
- `backend`
- `frontend`

### Backend arhitektura
Backend je organiziran modularno, po principu:
- app builder
- config
- modules
- repositories
- services
- routes
- validation
- scripts

### Frontend arhitektura
Frontend je organiziran modularno, s:
- app shell
- route layer
- feature modulima
- shared API slojem
- layout komponentama

### Auth i session
- login/logout/me flow je implementiran
- token/session podatak se sprema u `localStorage`
- postoji ProtectedRoute logika za zaštićene rute

---

## 2. Moduli

### 2.1 Health
Postoji backend endpoint:
- `GET /health`

### 2.2 Auth
Implementirano:
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`

Seed korisnici:
- `admin / admin123`
- `tehnolog / tehnolog123`
- `cuvar / cuvar123`

### 2.3 Water Objects
Naziv modula i tablice:
- `water_objects`

Podržani tipovi objekata:
- ribnjak
- bazen
- kanal
- zimovnik
- rastiliste
- maticnjak

Model:
- `id`
- `code`
- `object_type`
- `area_total_m2`
- `area_productive_m2`
- `max_depth_m`
- `max_volume_m3`
- `centroid_wkt`
- `polygon_geojson`
- `is_active`
- `notes`
- `created_at`
- `updated_at`

CRUD endpointi:
- `GET /water-objects`
- `GET /water-objects/:id`
- `POST /water-objects`
- `PUT /water-objects/:id`
- `DELETE /water-objects/:id`

Frontend:
- lista objekata
- create/edit forma
- map prikaz geometrije
- Leaflet karta s OpenStreetMap podlogom
- bez crtanja i bez editiranja geometrije na karti

### 2.4 Fish Phase 1
Implementirane tablice:
- `fish_species`
- `fish_categories`
- `fish_entry_events`
- `fish_control_events`
- `fish_control_lines`
- `fish_stock_current`

#### Lookup tablice
`fish_species`
- koristi se nova logika, ne stara legacy `species` tablica kao konačni lookup

`fish_categories`
Seed kategorije:
- `mjesecnjak`
- `jednogodisnja_mladj`
- `dvogodisnja_mladj`
- `konzum`
- `matica`

#### Fish entry
Jedan red = jedan ulaz ribe u objekt

Polja uključuju:
- objekt
- datum događaja
- vrsta događaja
- vrsta ribe
- kategorija
- broj komada
- prosječna masa
- ukupna masa
- podrijetlo
- napomena

#### Fish control
Kontrola se vodi po vrsti, ne po kategoriji.

Postoji:
- control header
- više control lineova

#### Fish stock current
Trenutno stanje se vodi:
- po objektu
- po vrsti

Prikazuje:
- objekt
- vrstu ribe
- ukupno komada
- prosječnu masu
- ukupnu masu
- zadnje osvježenje
- datum osvježenja

#### Fish history
Postoje prikazi:
- povijest unosa
- povijest kontrola

---

## 3. Logika

### 3.1 Fish logika
Prihvaćen model:
- trenutno stanje po vrsti je fakt
- trenutno stanje po kategoriji se ne vodi još kao operativni truth layer
- ulazna povijest po kategorijama i podrijetlu mora ostati zapisana
- kontrola refresh-a trenutno stanje po vrsti

### 3.2 Fish stock pravila
Nakon unosa `fish_entry_event`:
- ako za kombinaciju `(water_object_id, species_id)` nema reda u `fish_stock_current`, kreira se
- ako postoji, stanje se ažurira zbrajanjem
- `weight_avg_kg` se računa iz `weight_total_kg / count_total`
- `last_refresh_type = entry`

Nakon unosa `fish_control_event` + `fish_control_lines`:
- `fish_stock_current` se refresh-a po procjenama iz kontrole
- `weight_avg_kg` se računa iz `estimated_weight_total_kg / estimated_count_total`
- `last_refresh_type = control`

### 3.3 Podrijetlo
Dozvoljeni `source_kind`:
- `interni_objekt`
- `mrijestiliste`
- `uvoz`
- `ostalo`

UI logika:
- ako je `interni_objekt`, koristi se dropdown za izvorni objekt
- ako nije `interni_objekt`, koristi se tekstualni opis

### 3.4 Legacy import logika
Legacy source:
- stari SQL dump `energovi_koncanicasmart`

Import skripta:
- `backend/src/scripts/import-legacy-phase1.js`

Podržava:
- dry run
- apply
- `--phase=water|fish|all`

#### Faza 1: water import
Source:
- legacy tablica `ponds`

Mapiranje:
- `pond_name -> code`
- `pond_type -> object_type`
- `max_area_m2 -> area_total_m2`
- `max_depth -> max_depth_m`
- `max_volume_m3 -> max_volume_m3`
- `centroid_wkt -> centroid_wkt`
- `polygon_wkt -> polygon_geojson`
- `is_active -> is_active`
- `napomena -> notes`

Pravila:
- idempotentno
- bez duplikata po `code`
- mapiranje tipova objekata
- podrška za JSON string ili WKT geometriju

#### Faza 2: fish import
Source:
- legacy tablica `fish_events`

Pravila:
- uzima samo `event_type = nasad`
- testne redove izbacuje
- mapira species/category
- svi legacy zapisi `Šaran` idu privremeno u `Šaran goli`
- notes se čuva
- parsira podrijetlo
- nakon unosa ažurira `fish_stock_current`

Legacy import je tijekom rada dodatno korigiran zbog:
- stvarnih legacy naziva stupaca
- raspadnutih znakova / encodinga
- mapiranja legacy tipova objekata
- normalizacije species/category stringova

---

## 4. Trenutno stanje

### 4.1 Foundation
Gotovo:
- clean project
- modularna struktura
- backend shell
- frontend shell
- health endpoint

### 4.2 Auth
Gotovo:
- login
- logout
- me endpoint
- protected app shell
- seed korisnici

### 4.3 Water Objects
Gotovo:
- migracija
- backend CRUD
- frontend lista + forma
- spremanje objekata
- map prikaz geometrije
- Leaflet tile layer i poligon render rade

### 4.4 Fish Phase 1
Gotovo:
- lookup tablice
- entry form
- control form
- stock view
- entry history
- control history
- stock update logika
- frontend preveden na hrvatski u velikoj mjeri

### 4.5 Windows lokalni development
Gotovo:
- `npm run dev` je podešen da radi na Windows PowerShellu

### 4.6 Real data onboarding
Legacy baza je lokalno učitana u Docker MySQL kao:
- `energovi_koncanicasmart`

Import water faze:
- uspješno provedena
- `Water objects imported: 94`
- `Water objects skipped: 0`

Fish dry run nakon mapiranja:
- `Fish entry events imported: 70`
- `Fish rows skipped: 66`

Razlozi skipa:
- `invalid_numeric_or_date: 8`
- `species_linjak_unmapped: 1`
- `category_empty_or_null: 10`
- `test_row: 47`

Nakon `apply --phase=fish`:
- stvarni podaci su vidljivi u aplikaciji
- u "Trenutno stanje" i "Povijest unosa" se vide stvarni objekti i stvarni nasadi
- testni podaci su i dalje vidljivi u aplikaciji (`TEST-R-01`)

### 4.7 Uočeni problemi koji i dalje postoje
Eksplicitno viđeno u UI-u:
- još se pojavljuje `mm/dd/yyyy`
- još se pojavljuju vrijednosti bez dijakritika, npr.:
  - `Mjesecnjak`
  - `Dvogodisnja mladj`
  - `Jednogodisnja mladj`

Fish import status:
- `Linjak` još nije ušao
- redovi bez kategorije još nisu uključeni
- za 8 redova s `invalid_numeric_or_date` još nije napravljen detaljan audit/fix

---

## 5. Next steps

## 5.1 Neposredno sljedeći korak
Zadnji započeti, a nedovršeni task je bio:

- testne redove i dalje ne importirati
- `Linjak` treba ući u sustav
- redove bez kategorije ne bacati, nego ih importirati s `NULL category_id`
- za `invalid_numeric_or_date` redove napraviti detaljan audit prije automatskog importa

To je zadnji eksplicitno definiran nedovršeni zadatak.

### Točno traženo za taj korak
- dodati fish species:
  - `code: linjak`
  - `label: Linjak`
- `category_empty_or_null` redove više ne skipati, nego ih importirati s `NULL category_id`
- testne redove i dalje držati vani
- dodati audit izlaz za `invalid_numeric_or_date` redove:
  - legacy id
  - water object / pond
  - species
  - category
  - event_date
  - count_in
  - weight_avg_kg
  - weight_total_kg
  - exact invalid field / fields
  - exact reason

## 5.2 Nakon toga
Kad se završi gornji korak, sljedeći logični koraci prema razgovoru su:
- ukloniti testne podatke iz nove baze (`TEST-R-01` i povezani testni fish zapisi)
- napraviti data audit importiranih stvarnih podataka po objektima i vrstama
- potvrditi poslovnu ispravnost importiranog stocka i nasada

## 5.3 Još nije planirano za odmah
Eksplicitno je više puta rečeno da se još ne radi:
- fish phase 2
- procjena current stock po kategoriji
- feeding
- reporting
- control import iz legacy baze
- izlov import iz legacy baze
- ručno crtanje geometrije na karti
