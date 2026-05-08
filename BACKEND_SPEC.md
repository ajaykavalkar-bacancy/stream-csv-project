# BACKEND_SPEC.md — Node.js Streaming CSV Backend

## Tech Stack
- Node.js 18+
- Express 4.x
- No ORM needed (dummy data generator)
- CORS enabled for Angular dev server

## Project Setup
```
backend/
├── src/
│   ├── server.js          # Express entry point
│   ├── routes/
│   │   └── data.routes.js # /api/data and /api/download routes
│   ├── services/
│   │   └── data.service.js # Dummy data generator + CSV streamer
│   └── utils/
│       └── csvStream.js   # Transform stream: JSON rows → CSV lines
├── package.json
└── .env
```

## API Endpoints

### GET /api/data
Returns paginated JSON for the frontend table.

**Query Params:**
| Param  | Type   | Default | Description              |
|--------|--------|---------|--------------------------|
| page   | number | 1       | Page number              |
| limit  | number | 100     | Rows per page (max 500)  |
| total  | number | 50000   | Total rows to simulate   |

**Response:**
```json
{
  "total": 50000,
  "page": 1,
  "limit": 100,
  "data": [ { ...row } ]
}
```

### GET /api/download/csv
Streams CSV file. Uses `Transfer-Encoding: chunked`.

**Query Params:**
| Param | Type   | Default | Description              |
|-------|--------|---------|--------------------------|
| total | number | 50000   | Total rows to stream     |

**Response Headers:**
```
Content-Type: text/csv
Content-Disposition: attachment; filename="data-export.csv"
Transfer-Encoding: chunked
X-Total-Rows: <number>
```

**Behavior:**
1. Write CSV header line immediately
2. Generate rows in batches of 1000
3. Write each batch to response stream with `res.write()`
4. Call `res.end()` when all rows written
5. Handle `req.on('close')` to abort generation if client disconnects

## Data Schema (10 columns)
```
id, firstName, lastName, email, department, salary, joiningDate, country, status, score
```

| Column      | Type    | Example                     |
|-------------|---------|-----------------------------|
| id          | integer | 1                           |
| firstName   | string  | John                        |
| lastName    | string  | Doe                         |
| email       | string  | john.doe@example.com        |
| department  | string  | Engineering / HR / Sales... |
| salary      | number  | 75000                       |
| joiningDate | date    | 2021-03-15                  |
| country     | string  | USA / India / UK...         |
| status      | string  | Active / Inactive / Pending |
| score       | number  | 0–100 float                 |

## Streaming Implementation Details

```js
// data.service.js — key streaming logic
const DEPARTMENTS = ['Engineering','HR','Sales','Marketing','Finance','Operations'];
const COUNTRIES   = ['USA','India','UK','Germany','Canada','Australia'];
const STATUSES    = ['Active','Inactive','Pending'];

function generateRow(i) {
  return {
    id: i,
    firstName: FIRST_NAMES[i % FIRST_NAMES.length],
    lastName:  LAST_NAMES[i % LAST_NAMES.length],
    email:     `user${i}@example.com`,
    department: DEPARTMENTS[i % DEPARTMENTS.length],
    salary:    40000 + Math.floor(Math.random() * 100000),
    joiningDate: randomDate('2015-01-01', '2024-12-31'),
    country:   COUNTRIES[i % COUNTRIES.length],
    status:    STATUSES[i % STATUSES.length],
    score:     parseFloat((Math.random() * 100).toFixed(2))
  };
}

// Stream CSV route
router.get('/download/csv', (req, res) => {
  const total = Math.min(parseInt(req.query.total) || 50000, 180000);
  const BATCH = 1000;
  let cancelled = false;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="data-export.csv"');
  res.setHeader('Transfer-Encoding', 'chunked');
  res.setHeader('X-Total-Rows', total);
  res.setHeader('Access-Control-Expose-Headers', 'X-Total-Rows');

  // Write header
  res.write('id,firstName,lastName,email,department,salary,joiningDate,country,status,score\n');

  req.on('close', () => { cancelled = true; });

  let i = 1;
  function writeBatch() {
    if (cancelled) return;
    const end = Math.min(i + BATCH - 1, total);
    let chunk = '';
    for (; i <= end; i++) {
      const r = generateRow(i);
      chunk += `${r.id},${r.firstName},${r.lastName},${r.email},${r.department},${r.salary},${r.joiningDate},${r.country},${r.status},${r.score}\n`;
    }
    const ok = res.write(chunk);
    if (i > total) { res.end(); return; }
    // Back-pressure handling
    if (ok) setImmediate(writeBatch);
    else res.once('drain', writeBatch);
  }
  writeBatch();
});
```

## CORS Config
```js
app.use(cors({
  origin: 'http://localhost:4200',
  exposedHeaders: ['X-Total-Rows']
}));
```

## package.json dependencies
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
```
