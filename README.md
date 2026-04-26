# MapPoints — Starter Application

This repository contains the starter application for the **MapPoints AWS Developer Course**.

You will work in this repository throughout all 10 modules, progressively adding AWS services to the same application.

---

## What Is MapPoints?

**MapPoints** is an interactive map SPA where users can:

- Browse geographic points of interest on a world map
- Create new points with a title, description, and coordinates
- Upload photos to individual points
- Import multiple points at once from a CSV file
- Authenticate via AWS Cognito and make protected API calls
- View AI-generated image labels on uploaded photos (module 10 bonus)

---

## Repository Structure

```
gis-app-aws/
├── frontend/                        ← React SPA (Vite + TypeScript) — complete starter
│   ├── src/
│   │   ├── App.tsx                  ← Root component, auth state, feature flag wiring
│   │   ├── api/client.ts            ← Typed API client (reads env vars at runtime)
│   │   ├── components/              ← UI components (map, forms, upload, import)
│   │   ├── config/featureFlags.json ← Active flags for current module
│   │   └── types.ts                 ← Shared TypeScript types
│   ├── .env.example                 ← Template for your local environment variables
│   ├── index.html
│   └── package.json
│
├── backend_node/                    ← Node.js Lambda handler stubs — implement these
│   ├── point_service/handlers/
│   │   ├── getPointsList.ts         ← GET /points
│   │   ├── getPointById.ts          ← GET /points/{pointId}
│   │   └── createPoint.ts           ← POST /points
│   ├── import_service/handlers/
│   │   ├── getUploadUrl.ts          ← GET /upload?pointId=&fileName=
│   │   ├── importPointsFile.ts      ← GET /import?fileName=
│   │   ├── processUploadedPhoto.ts  ← S3 trigger on uploads/
│   │   ├── importFileParser.ts      ← S3 trigger on uploaded/
│   │   ├── catalogBatchProcess.ts   ← SQS trigger
│   │   └── enrichPhoto.ts           ← S3 trigger on uploads/ (module 10)
│   ├── authorization_service/handlers/
│   │   ├── basicAuthorizer.ts       ← Lambda Authorizer (module 7)
│   │   └── postConfirmation.ts      ← Cognito Post Confirmation trigger (module 8)
│   ├── package.json
│   └── tsconfig.json
│
├── module_02_infra_node/            ← CDK starter for module 2 (S3 + CloudFront)
│   ├── lib/module-02-hosting-stack.ts
│   ├── bin/
│   ├── cdk.json
│   └── package.json
│
├── FeatureGuard.tsx                 ← React component: renders fallback when flag is off
├── FeatureFlagsPanel.tsx            ← Dev-only panel for toggling flags in the browser
└── featureFlags.ts                  ← TypeScript type for the FeatureFlags shape
```

---

## Getting Started

### Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 20+ | https://nodejs.org |
| AWS CLI v2 | latest | https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html |
| AWS CDK | 2.x | `npm install -g aws-cdk` |
| AWS account | free tier | https://aws.amazon.com/free |

### Run the frontend locally

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 — the map is visible, all backend-dependent features are shown as disabled placeholders.

### Configure your environment variables

```bash
cp frontend/.env.example frontend/.env.local
```

Edit `.env.local` and fill in values as you deploy each module:

```env
# Module 3+ — Points service API Gateway base URL
VITE_POINTS_API_URL=

# Module 5+ — Import service API Gateway base URL
VITE_IMPORT_API_URL=

# Module 8-9+ — Cognito configuration
VITE_COGNITO_USER_POOL_ID=
VITE_COGNITO_CLIENT_ID=
VITE_COGNITO_DOMAIN=
VITE_COGNITO_REDIRECT_URI=http://localhost:5173
```

**Rules:**
- Leave blank any variable whose backend is not yet deployed — the API client skips calls when the URL is empty.
- For production (deployed to CloudFront) change `VITE_COGNITO_REDIRECT_URI` to your CloudFront URL.

### Bootstrap CDK (once per AWS account/region)

```bash
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
REGION=$(aws configure get region)
npx cdk bootstrap aws://$ACCOUNT/$REGION
```

---

## Module 2 — Deploy the Frontend (CDK starter)

```bash
# Build the frontend first
cd frontend
npm install && npm run build

# Deploy S3 bucket + CloudFront distribution
cd ../module_02_infra_node
npm install
npm run cdk:deploy
```

The stack output contains:

| Output | Description |
|--------|-------------|
| `CloudFrontUrl` | Your public HTTPS frontend URL |
| `BucketName` | S3 bucket name (for reference) |

To tear down:
```bash
npm run cdk:destroy
```

---

## Feature Flags

Feature flags control which parts of the UI and API are active. They live in `frontend/src/config/featureFlags.json`.

**Never enable a flag for a feature you have not implemented yet.** The API client will make real HTTP calls and get errors if the backend is not deployed.

### Flag File Structure

```json
{
  "module": 2,
  "ui": {
    "showMap": true,
    "enableCreatePoint": false,
    "enableUploadPhoto": false,
    "enableCsvImport": false,
    "enableAuthButtons": false,
    "showAiLabels": false
  },
  "api": {
    "enablePointsApi": false,
    "pointsSource": "mock"
  },
  "security": {
    "enableBasicAuthForImport": false,
    "enableCognito": false,
    "requireAuthForCreatePoint": false
  },
  "async": {
    "enableSqsPipeline": false,
    "enableSnsNotifications": false
  },
  "ai": {
    "enableRekognitionLabels": false,
    "enableModeration": false,
    "enableTextDetection": false
  }
}
```

### Flag Progression by Module

| Flag | Enable in module | Description |
|------|-----------------|-------------|
| `ui.showMap` | **2** | Renders the Leaflet map |
| `api.enablePointsApi` | **3** | App fetches points from API instead of hardcoded mock |
| `api.pointsSource=mock` | **3** | Lambda returns static mock data |
| `api.pointsSource=dynamodb` | **4** | Lambda reads from DynamoDB |
| `ui.enableCreatePoint` | **4** | "Add Point" form is enabled |
| `ui.enableUploadPhoto` | **5** | "Upload Photo" button is enabled |
| `ui.enableCsvImport` | **5** | "Import CSV" button is enabled |
| `async.enableSqsPipeline` | **6** | CSV import routes through SQS queue |
| `async.enableSnsNotifications` | **6** | Import completion sends SNS email notification |
| `security.enableBasicAuthForImport` | **7** | `GET /import` requires `Authorization: Basic` header |
| `security.requireAuthForCreatePoint` | **8** | `POST /points` requires Cognito `id_token` |
| `security.enableCognito` | **9** | App uses Cognito for auth (enables token handling) |
| `ui.enableAuthButtons` | **9** | Login / Logout buttons are shown |
| `ai.enableRekognitionLabels` | **10** | App calls Rekognition labels endpoint |
| `ui.showAiLabels` | **10** | AI labels are displayed on point detail |

### FeatureGuard Component

Use `FeatureGuard` to gate UI elements declaratively:

```tsx
import { FeatureGuard } from "../../FeatureGuard";

<FeatureGuard enabled={flags.ui.enableCreatePoint} fallback={<span>Available in module 4</span>}>
  <CreatePointForm onSubmit={handleCreate} />
</FeatureGuard>
```

When `enabled` is `false`, the fallback is rendered. Default fallback: `"Available in next modules"`.

---

## API Gateway URLs

After deploying each module, save the URL and put it in your `.env.local`.

### Points API (`VITE_POINTS_API_URL`)

| Endpoint | Method | Module | Description |
|----------|--------|--------|-------------|
| `/points` | GET | 3 | List all points |
| `/points/{pointId}` | GET | 3 | Get single point (includes `aiLabels` in module 10) |
| `/points` | POST | 4 | Create a new point (protected by Cognito in module 8) |

### Import API (`VITE_IMPORT_API_URL`)

| Endpoint | Method | Module | Description |
|----------|--------|--------|-------------|
| `/upload` | GET | 5 | Get S3 presigned PUT URL for photo (`?pointId=&fileName=`) |
| `/import` | GET | 5 | Get S3 presigned PUT URL for CSV (`?fileName=`) — protected by Basic Auth in module 7 |

### API Response Shapes

**`GET /points`**
```json
[
  {
    "id": "uuid",
    "title": "Eiffel Tower",
    "description": "Iconic iron lattice tower",
    "latitude": 48.8584,
    "longitude": 2.2945,
    "photoUrl": "https://...",
    "createdAt": "2025-01-15T10:00:00Z",
    "tags": ["landmark"],
    "aiLabels": [{ "name": "Tower", "confidence": 99.5 }]
  }
]
```

**`POST /points` request body**
```json
{
  "title": "string (required)",
  "description": "string",
  "latitude": 48.8584,
  "longitude": 2.2945
}
```

**`GET /upload` response**
```json
{ "url": "https://s3.amazonaws.com/..." }
```

---

## Cognito Configuration (Modules 8-9)

After deploying the Cognito stack in module 8, get the outputs:

```bash
aws cloudformation describe-stacks --stack-name <your-stack-name> \
  --query 'Stacks[0].Outputs'
```

| Stack Output | `.env.local` variable |
|---|---|
| `UserPoolId` | `VITE_COGNITO_USER_POOL_ID` |
| `UserPoolClientId` | `VITE_COGNITO_CLIENT_ID` |
| `UserPoolDomain` | `VITE_COGNITO_DOMAIN` |
| CloudFront URL (module 2) | `VITE_COGNITO_REDIRECT_URI` |

The app uses the **Authorization Code Grant** flow:
1. Login button → redirects to Cognito Hosted UI
2. After login → Cognito redirects back with `?code=...`
3. App exchanges the code for `id_token` + `access_token` at `/oauth2/token`
4. Tokens stored in `localStorage`
5. `id_token` sent as `Authorization` header on `POST /points`

---

## Authorization (Module 7)

Module 7 protects `GET /import` with a Lambda Authorizer using HTTP Basic Auth.

The lambda reads a `{github_login}=TEST_PASSWORD` environment variable. The frontend sends:

```
Authorization: Basic base64({github_login}:TEST_PASSWORD)
```

Set the token in the browser before testing the CSV import:

```js
localStorage.setItem("authorization_token", btoa("<your_github_login>:TEST_PASSWORD"));
```

The app reads this value from `localStorage` automatically when `security.enableBasicAuthForImport=true`.

---

## Backend Handler Stubs

All Lambda handlers are in `backend_node/`. Each file has a `TODO` comment describing what to implement. Wire each handler to API Gateway routes or S3/SQS event sources in your own CDK stacks (starting from module 3).

**Do not modify `module_02_infra_node/`** — it is a complete working CDK stack for the hosting layer.

---

## Useful Commands

```bash
# Start frontend dev server
cd frontend && npm run dev

# Build frontend for deployment
cd frontend && npm run build

# Deploy module 2 (S3 + CloudFront)
cd module_02_infra_node && npm run cdk:deploy

# Destroy module 2 stack
cd module_02_infra_node && npm run cdk:destroy

# Check AWS credentials
aws sts get-caller-identity

# Preview CDK changes before deploying
npx cdk diff
```
