const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'ap-southeast-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const S3_BUCKET = process.env.S3_BUCKET || 'stscandidateimages';

const FOLDER_MAP = {
  'ApplicantCNIC': 'CnicFront',
  'ApplicantNICBack': 'CnicBack',
  'ApplicantImages': 'Images',
  'ApplicantDomicileFiles': 'Domicile',
  'ApplicantMatricDegreeFiles': 'MatricDegree',
  'ApplicantExperience': 'ExperienceCertificates'
};

function getImageUrl(objectType, objectName, versionId) {
  if (!objectName) return '';
  const folder = FOLDER_MAP[objectType] || objectType;
  let url = `/api/image/${encodeURIComponent(folder)}/${encodeURIComponent(objectName)}`;
  if (versionId) url += `?versionId=${encodeURIComponent(versionId)}`;
  return url;
}

async function fetchS3Image(objectType, objectName, versionId) {
  const params = {
    Bucket: S3_BUCKET,
    Key: `${decodeURIComponent(objectType)}/${decodeURIComponent(objectName)}`
  };
  if (versionId) params.VersionId = versionId;

  const command = new GetObjectCommand(params);
  const s3Response = await s3.send(command);

  const stream = s3Response.Body;
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  let buffer = Buffer.concat(chunks);
  let contentType = s3Response.ContentType || 'image/jpeg';

  const head = buffer.slice(0, 30).toString('utf8');
  if (head.startsWith('data:')) {
    const commaIdx = buffer.indexOf(44);
    if (commaIdx > 0) {
      const meta = buffer.slice(0, commaIdx).toString('utf8');
      const mimeMatch = meta.match(/data:([^;]+)/);
      contentType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      buffer = Buffer.from(buffer.slice(commaIdx + 1).toString('utf8'), 'base64');
    }
  }

  return { buffer, contentType };
}

module.exports = { getImageUrl, fetchS3Image, s3, S3_BUCKET };
