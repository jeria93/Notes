# Notes API (Serverless + AWS)

Small practice project using the Serverless Framework, AWS Lambda and DynamoDB to build a simple notes API with JWT-based authentication.

## Tech stack

- Node.js 20
- Serverless Framework v3
- AWS Lambda + API Gateway
- DynamoDB (notes storage)
- AWS Secrets Manager (JWT secret)
- Insomnia (API client, config included)

---

## Getting started

### Prerequisites

- Node.js 20+
- Serverless Framework v3 installed globally:

  ```bash
  npm install -g serverless
  ```

- AWS credentials configured with access to:
  - Lambda, API Gateway, DynamoDB, Secrets Manager

### Install dependencies

```bash
npm install
```

### Deploy

```bash
npx serverless deploy --stage dev
```

Serverless will print all available endpoints after deploy.

---

## Endpoints (overview)

All `/api/notes` endpoints require:

```http
Authorization: Bearer <token>
```

### Auth

- `POST /api/user/signup` – create a new user
- `POST /api/user/login` – log in and get a JWT
- `GET  /api/whoami` – return info about the authenticated user

### Notes

- `GET    /api/notes` – list notes for the current user
- `POST   /api/notes` – create a note
- `PUT    /api/notes` – update a note
- `DELETE /api/notes` – soft delete a note
- `POST   /api/notes/restore` – restore a soft deleted note
- `DELETE /api/notes/permanent-delete` – permanently delete a note

---

## Insomnia collection

An Insomnia config is included:

- `insomnia/notes-api-insomnia.yaml`

Import it in Insomnia and update the bearer token after logging in.
