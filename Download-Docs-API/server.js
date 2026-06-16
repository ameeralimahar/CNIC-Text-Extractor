const express = require('express');
const cors = require('cors');
const compression = require('compression');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(compression());
app.use(express.json());

// Routes
app.use('/api/image', require('./routes/image'));
app.use('/api/search', require('./routes/search'));
app.use('/api/candidate', require('./routes/candidate'));

app.get('/', (req, res) => {
  res.json({
    message: 'Download Documents API is running',
    endpoints: [
      'GET /api/search/:query - Search by CNIC (13 digits) or FormID',
      'GET /api/candidate/:formId - Get full candidate details with all documents',
      'GET /api/image/:type/:name?versionId=x - Proxy S3 images'
    ]
  });
});

// Error middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`Download Documents API running on http://localhost:${PORT}`);
  try {
    const { getPool } = require('./db');
    await getPool();
    console.log('DB pool connected');
  } catch (e) { console.log('DB will connect on first request'); }
});
