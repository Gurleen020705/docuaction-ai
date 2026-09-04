# DocuAction AI

Turn documents into **actions**, not just summaries.

Upload a PDF/DOC/DOCX/TXT document (a notice, letter, form, contract, circular…) and DocuAction AI uses **Google Gemini** to extract:

- A plain-language **summary**
- **Deadlines** (parsed to real calendar dates where possible)
- **Requirements** you need to satisfy
- Concrete **action items** you can check off
- **Risks** / consequences of inaction, with severity
- Overall **priority** (LOW / MEDIUM / HIGH)
- **Missing items** the document flags as not yet provided

From there you can track deadlines and actions on a dashboard, generate an **AI-drafted email/response**, and **chat with the document** to ask follow-up questions — all grounded in the document's own text, with no hardcoded AI output.

> Example: upload an internship notice → AI detects the **15 Sept** deadline, requirements (Resume, ID, NOC), flags a **missing NOC**, sets priority to **HIGH**, creates action items, and can draft your application email.

---

## Tech stack

| Layer      | Tech                                                            |
| ---------- | ---------------------------------------------------------------- |
| Frontend   | React + Vite + Tailwind CSS, React Router, Axios                |
| Backend    | Node.js + Express                                                |
| Database   | MongoDB + Mongoose                                               |
| AI         | Google Gemini API (`@google/generative-ai`)                     |
| Auth       | JWT + bcrypt                                                     |
| File I/O   | Multer (upload) + `pdf-parse` (text extraction)                 |

## Project structure

```
docuaction-ai/
├── server/          # Express API
│   ├── src/
│   │   ├── config/       # MongoDB connection
│   │   ├── models/       # User, Document (Mongoose schemas)
│   │   ├── middleware/   # JWT auth, Multer upload, error handler
│   │   ├── controllers/  # Route logic
│   │   ├── routes/       # Express routers
│   │   ├── services/     # Gemini AI service, text extraction
│   │   └── index.js      # App entry point
│   └── .env.example
└── client/          # React app
    └── src/
        ├── pages/        # Login, Register, Dashboard, DocumentDetail
        ├── components/   # Navbar, Upload, ActionCenter, ChatPanel, EmailPanel, Badges
        ├── context/       # AuthContext (JWT session)
        └── api/           # Axios instance
```

## How it works end-to-end

1. **Upload** – user drops a file on the Dashboard → `POST /api/documents/upload` (Multer saves it, scoped to the logged-in user).
2. **Extract text** – `pdf-parse` (or plain-text read) pulls raw text out of the file.
3. **Gemini analyzes it** – the extracted text is sent to Gemini with a strict JSON-schema prompt; the model returns summary, requirements, deadlines, risks, priority, missing items, and action items. Nothing here is hardcoded — if Gemini isn't configured or fails, the document is marked `FAILED` with the real error message.
4. **Persisted** – the structured result is saved on the `Document` in MongoDB, scoped to `user`.
5. **Dashboard** – lists documents with status/priority badges, aggregate stats, and upcoming deadlines.
6. **Document detail page** – shows the full analysis, an **Action Center** (check off tasks), an **AI email generator**, and a **document-specific chat** (grounded in that document's text + analysis).

Every user can only ever see/query/modify their own documents — every backend query is scoped by `req.user._id` from the verified JWT.

## Setup

### Prerequisites

- Node.js 18+
- A running MongoDB instance (local or Atlas)
- A Gemini API key ([Google AI Studio](https://aistudio.google.com/app/apikey))

### 1. Backend

```bash
cd server
cp .env.example .env
# edit .env: set MONGODB_URI, JWT_SECRET, GEMINI_API_KEY
npm install
npm run dev        # or: npm start
```

The API runs on `http://localhost:5000` by default. Health check: `GET /api/health`.

### 2. Frontend

```bash
cd client
npm install
npm run dev
```

The app runs on `http://localhost:5173` and proxies `/api/*` requests to the backend (see `vite.config.js`).

### 3. Use it

1. Open `http://localhost:5173`, register an account.
2. Upload a document from the Dashboard.
3. Wait for AI analysis, then open the document to see the full breakdown, check off actions, generate an email, or chat about it.

## Environment variables (`server/.env`)

See `server/.env.example` for the full list:

- `MONGODB_URI` – MongoDB connection string
- `JWT_SECRET` / `JWT_EXPIRES_IN` – auth token signing
- `GEMINI_API_KEY` – **kept server-side only**, never sent to the client
- `GEMINI_MODEL` – defaults to `gemini-3.6-flash`
- `CLIENT_URL` – for CORS
- `MAX_UPLOAD_MB` – upload size limit (default 10MB)

## Security notes

- Passwords are hashed with bcrypt; the hash is never returned in API responses.
- All document routes require a valid JWT (`Authorization: Bearer <token>`) and are scoped to `req.user._id`.
- The Gemini API key lives only in `server/.env` and is never exposed to the frontend.
- Uploaded files are validated by MIME type and size (multer) before processing.

## Notes for judges / hackathon demo

- The AI analysis, email drafts, and chat replies are **all live Gemini calls** — there is no mocked/fake AI content anywhere in the codebase.
- If a document fails analysis (e.g. scanned/image-only PDF with no extractable text, or a missing/invalid Gemini key), the app surfaces a clear error state instead of pretending to succeed.
