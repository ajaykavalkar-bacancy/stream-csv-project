# StreamCSV — Large Dataset Streaming App

Node.js streaming backend + Angular frontend for 50k–180k row CSV export.

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.18-000000?logo=express&logoColor=white)
![Angular](https://img.shields.io/badge/Angular-17-DD0031?logo=angular&logoColor=white)
![Angular CDK](https://img.shields.io/badge/Angular%20CDK-VirtualScroll-DD0031?logo=angular&logoColor=white)
![Material](https://img.shields.io/badge/Angular%20Material-17-3F51B5?logo=angular&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)

---

## Project Structure

```
stream-csv-project/
├── backend/                          # Node.js + Express
│   ├── src/
│   │   ├── server.js
│   │   ├── routes/data.routes.js
│   │   └── services/data.service.js
│   ├── package.json
│   └── .env
├── frontend/                         # Angular 17 standalone
│   ├── src/
│   │   ├── app/
│   │   │   ├── app.component.ts / .scss
│   │   │   ├── app.config.ts
│   │   │   ├── models/record.model.ts
│   │   │   ├── services/data.service.ts
│   │   │   └── components/data-table/
│   │   ├── environments/environment.ts
│   │   └── main.ts
│   ├── angular.json
│   └── package.json
└── README.md
```

---

## Setup

Both projects target Node 18+. Use [nvm](https://github.com/nvm-sh/nvm) if your system Node is older.

### Backend (port 3000)

```bash
cd backend
npm install
npm run dev          # nodemon — auto-reloads on changes
# or: npm start      # plain node
```

### Frontend (port 4200)

```bash
cd frontend
npm install
npm start            # ng serve, http://localhost:4200
```

Run both in separate terminals. The frontend reads `apiUrl` from
[`src/environments/environment.ts`](frontend/src/environments/environment.ts)
(`http://localhost:3000/api`).

---

## API Endpoints

| Method | Path                  | Query Params                                | Description                                    |
|--------|-----------------------|---------------------------------------------|------------------------------------------------|
| GET    | `/api/health`         | —                                           | Liveness check, returns `{status, timestamp}`. |
| GET    | `/api/data`           | `page` (1), `limit` (100, max 500), `total` (50000, max 180000) | Paginated JSON for the table. |
| GET    | `/api/download/csv`   | `total` (50000, max 180000)                 | Streamed CSV via chunked transfer encoding.    |

`/api/download/csv` exposes an `X-Total-Rows` response header so the client can compute progress.

### Row schema (10 columns)

`id, firstName, lastName, email, department, salary, joiningDate, country, status, score`

---

## Streaming Approach

Loading 180,000 rows in one buffered response would force ~50–80MB through memory on both
ends and freeze the browser tab during JSON parsing. Instead, the app streams end-to-end.

### Backend — `Transfer-Encoding: chunked`

```
Client                    Express
  |--- GET /api/download/csv -->|
  |                              | res.write(header_line)
  |<---- chunk 1 (1000 rows) ----|
  |<---- chunk 2 (1000 rows) ----|
  |          ...                 |
  |<---- chunk N + res.end() ----|
```

- **Batch size 1000 rows** — balances chunk frequency vs. write overhead.
- **`setImmediate` between batches** — yields to the event loop so the server stays
  responsive to other requests during a long export.
- **Back-pressure handling** — `res.write()` returns `false` when the OS send buffer is
  full; the next batch waits for the `'drain'` event before resuming. Prevents unbounded
  in-process buffering when the client reads slowly.
- **Cancellation** — `req.on('close')` flips a `cancelled` flag so generation stops if
  the client disconnects mid-download.
- **No `Content-Length`** — the final byte size isn't known up front; chunked encoding
  is the whole reason this works.

### Frontend — native `fetch()` + `ReadableStream`

Angular's `HttpClient` buffers the full response body before emitting, which defeats
streaming. The download path uses the platform `fetch()` API and reads
`response.body.getReader()` directly:

```
fetch(url)
  └── res.body.getReader()
        └── reader.read() loop
              ├── decode chunk via TextDecoder
              ├── accumulate into csvText
              ├── count '\n' to estimate progress
              └── on done: Blob → object URL → <a>.click()
```

Progress is computed from the `X-Total-Rows` header divided into the running newline
count, capped at 99% until the final chunk arrives. Unsubscribing the Observable calls
`AbortController.abort()`, which trips the backend's `req.on('close')` handler — the
server stops generating immediately.

### Table display

The table itself does not stream — it pages through `/api/data` (200 rows/request) and
renders the visible window with **CDK Virtual Scroll**, which keeps only ~15 DOM rows
mounted regardless of page size. Streaming is reserved for the export, where the full
dataset has to leave the server.

---

## Scripts

| Workspace | Command          | What it does                              |
|-----------|------------------|-------------------------------------------|
| backend   | `npm run dev`    | Start under nodemon (auto-reload).        |
| backend   | `npm start`      | Start with plain `node`.                  |
| frontend  | `npm start`      | `ng serve` on `:4200`.                    |
| frontend  | `npm run build`  | Production build (uses `environment.prod.ts`). |
