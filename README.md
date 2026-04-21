# KoncanicaDigital (Clean Foundation)

Ovaj repozitorij sadrži **čistu osnovu** nove aplikacije, potpuno odvojenu od stare.

## Struktura

- `frontend/` – React + Vite frontend shell
- `backend/` – Express backend shell

## Što je uključeno

- modularna struktura projekta
- frontend shell s routingom
- login placeholder ekran
- backend API shell
- `/health` endpoint
- priprema za bazu (konfiguracijski sloj + mjesto za module)

---

## Lokalno pokretanje (korak po korak)

### 0) Instalacija paketa (jednom)

U rootu projekta pokreni:

```bash
npm install
```

---

## Backend

### 1) Kako pokrenuti backend (komanda)

```bash
npm run dev:backend
```

### 2) Na kojem portu radi

- Zadani port je: **3001**
- Konfiguracija je u `backend/.env.example` (`PORT=3001`)

### 3) Koji je health endpoint

- **GET** `http://localhost:3001/health`

### 4) Kako ga testirati

U novom terminalu:

```bash
curl http://localhost:3001/health
```

Očekivani odgovor (primjer):

```json
{
  "status": "ok",
  "service": "koncanica-digital-backend",
  "timestamp": "2026-04-21T12:00:00.000Z"
}
```

---

## Frontend

### 5) Kako pokrenuti frontend

```bash
npm run dev:frontend
```

### 6) Na kojem portu radi

- Zadani port je: **5173**

### 7) Kako otvoriti aplikaciju u browseru

- Otvori: **http://localhost:5173**

---

## Opcionalno: pokreni oba servisa odjednom

```bash
npm run dev
```

To pokreće i backend i frontend paralelno.
