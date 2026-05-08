const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const dataRoutes = require('./routes/data.routes.js');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: ['http://localhost:4200', 
    'http://localhost:4201',
  'https://your-frontend-app.vercel.app' 
],
  exposedHeaders: ['X-Total-Rows']
}));

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api', dataRoutes);

// Global error handler — must come last and accept 4 args.
app.use((err, req, res, _next) => {
  console.error('[error]', err);
  if (res.headersSent) {
    return res.end();
  }
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
