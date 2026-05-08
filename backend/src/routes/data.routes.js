const express = require('express');
const { generateRow, getPagedData } = require('../services/data.service.js');

const router = express.Router();

const CSV_HEADER = 'id,firstName,lastName,email,department,salary,joiningDate,country,status,score\n';
const BATCH = 1000;
const MAX_TOTAL = 180000;
const MAX_LIMIT = 500;

function parseTotal(raw) {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return 50000;
  return Math.min(n, MAX_TOTAL);
}

router.get('/data', (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 100, MAX_LIMIT);
  const total = parseTotal(req.query.total);

  const result = getPagedData(page, limit, total);
  res.json(result);
});

router.get('/download/csv', (req, res) => {
  const total = parseTotal(req.query.total);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="data-export.csv"');
  res.setHeader('Transfer-Encoding', 'chunked');
  res.setHeader('X-Total-Rows', total);
  res.setHeader('Access-Control-Expose-Headers', 'X-Total-Rows');

  res.write(CSV_HEADER);

  let cancelled = false;
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

    if (i > total) {
      res.end();
      return;
    }

    if (ok) {
      setImmediate(writeBatch);
    } else {
      res.once('drain', writeBatch);
    }
  }

  writeBatch();
});

module.exports = router;
