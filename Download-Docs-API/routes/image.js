const express = require('express');
const router = express.Router();
const { fetchS3Image } = require('../utils/s3');

router.get('/:objectType/:objectName', async (req, res) => {
  const { objectType, objectName } = req.params;
  const versionId = req.query.versionId;

  try {
    const { buffer, contentType } = await fetchS3Image(objectType, objectName, versionId);
    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=86400');
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Content-Length', String(buffer.length));
    res.end(buffer);
  } catch (err) {
    console.error('Image proxy error:', err.message);
    res.status(404).send('Image not found');
  }
});

module.exports = router;
