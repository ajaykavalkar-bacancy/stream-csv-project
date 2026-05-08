# ARCHITECTURE.md — Streaming Design Decisions

## Why Streaming?

Loading 180,000 rows (10 columns) into memory at once would produce a ~50–80MB JSON payload.
This causes:
- High backend memory pressure
- Long wait before first byte reaches the client
- Browser tab freeze during large JSON.parse()

Streaming solves all three.

---

## Backend: Chunked Transfer Encoding

```
Client                    Node.js / Express
  |                              |
  |--- GET /api/download/csv --->|
  |                              | res.write(header_line)
  |<---- chunk 1 (1000 rows) ----|
  |<---- chunk 2 (1000 rows) ----|
  |         ...                  |
  |<---- chunk N (last rows) ----|
  |<---- res.end() --------------|
```

Key implementation choices:

| Choice | Reason |
|--------|--------|
| `res.write()` loop | No need for Node Transform streams; simpler for pure generation |
| Batch size = 1000 rows | Balance between chunk frequency and overhead |
| Back-pressure via `drain` event | Prevents buffer overflow if client reads slowly |
| `req.on('close')` cancellation | Stops CPU work if client disconnects mid-download |
| `setImmediate` between batches | Yields to event loop; keeps server responsive to other requests |
| No `Content-Length` header | Cannot know final byte size before streaming starts |

---

## Frontend: fetch() + ReadableStream

Angular's `HttpClient` buffers the full response body before emitting.
For large CSV streams this is unusable. Instead we use the native `fetch()` API
which exposes `response.body` as a `ReadableStream`.

```
fetch(url)
  └── res.body.getReader()
        └── reader.read() loop
              ├── decode chunk with TextDecoder
              ├── accumulate into csvText string
              ├── count \n to estimate progress
              └── when done: Blob → object URL → <a>.click()
```

Progress estimation:
- Backend sends `X-Total-Rows` header (e.g. 180000)
- Frontend counts newlines received / total rows → percentage
- Accurate to ±1% (header row counted, but negligible)

---

## Table Display: CDK Virtual Scroll

Rendering 200 rows per page in the DOM is fine with standard `*ngFor`.
But to show all loaded rows without pagination, CDK Virtual Scroll
renders only the ~15 visible rows at a time, recycling DOM nodes as user scrolls.

Architecture uses **pagination** for the table (200 rows/page via API)
because streaming 50k rows into the frontend array would be heavy.
The **download** is the streaming path — table display uses standard paging.

---

## Data Flow Summary

```
[User selects 100k rows]
        │
        ▼
[Angular: GET /api/data?total=100000&page=1&limit=200]
        │
        ▼
[Node: generateRow() × 200, return JSON]
        │
        ▼
[Angular: renders 200 rows in virtual-scroll table]
        │
[User clicks Download CSV]
        │
        ▼
[Angular: fetch('/api/download/csv?total=100000')]
        │
        ▼
[Node: streams 100 batches × 1000 rows via res.write()]
        │
        ▼
[Angular: ReadableStream reader accumulates CSV text]
[Progress bar: 0% → 100%]
        │
        ▼
[Angular: Blob → download trigger → data-export.csv]
```
