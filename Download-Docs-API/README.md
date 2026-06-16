# Download Document API

Standalone REST API service for the Download Documents Portal. Built with Node.js, Express, MSSQL, and AWS S3. Containerized with Docker for easy deployment.

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** Microsoft SQL Server (MSSQL)
- **Storage:** AWS S3
- **Containerization:** Docker

## Quick Start

```bash
# Install dependencies
npm install

# Create .env from template
cp .env.example .env
# Fill in your actual credentials in .env

# Run locally
npm start

# Run in dev mode (auto-reload)
npm run dev
```

## Docker Deployment

```bash
# Build
docker build -t download-document-api .

# Run with env file
docker run -d --name download-document-api -p 3000:3000 --env-file .env download-document-api
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| GET | `/api/search/:query` | Search by CNIC (13 digits) or FormID |
| GET | `/api/candidate/:formId` | Get full candidate details |
| GET | `/api/image/:type/:name?versionId=x` | Proxy S3 images |

### Search (`GET /api/search/:query`)

- 13-digit number → searches by **CNIC** (multiple results)
- Otherwise → searches by **FormID** (single result)

**Response:**
```json
[
  {
    "applicationId": "12345",
    "fullName": "John Doe",
    "projectName": "Project ABC",
    "appliedFor": "Assistant Director",
    "appliedOn": "01-06-2024 10:30 AM",
    "reviewStatus": "Reviewed",
    "paymentStatus": "Challan Paid"
  }
]
```

### Candidate Details (`GET /api/candidate/:formId`)

Returns full candidate object including:
- Application & payment info
- Review & super review info
- Personal info (name, CNIC, DOB, gender, etc.)
- Address info (domicile, addresses)
- Education (degrees with marksheet/degree images)
- Diplomas (certifications with images)
- Employment & experience
- Images (passport, CNIC, domicile, PRC, degrees)
- Objections (tickets with replies & attachments)
- Queries (with replies & attachments)

### Image Proxy (`GET /api/image/:type/:name?versionId=x`)

Returns actual image binary from S3 with proper `Content-Type` header.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | API port | 3000 |
| `DB_SERVER` | MSSQL server address | — |
| `DB_DATABASE` | Database name | STSDB |
| `DB_USER` | Database user | — |
| `DB_PASSWORD` | Database password | — |
| `DB_PORT` | Database port | 1433 |
| `DB_ENCRYPT` | Use encryption | true |
| `DB_TRUST_SERVER_CERTIFICATE` | Trust self-signed certs | true |
| `AWS_REGION` | AWS S3 region | ap-southeast-1 |
| `S3_BUCKET` | S3 bucket name | stscandidateimages |
| `AWS_ACCESS_KEY_ID` | AWS access key | — |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | — |

## Integration Notes

- Image URLs in responses are **relative paths** (e.g., `/api/image/...`). Prepend the API base URL or configure a proxy.
- CORS is enabled for all origins by default.
