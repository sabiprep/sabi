# Sabi

Sabi is an adaptive JAMB UTME preparation platform. Its backend provides authenticated student accounts, academic configuration, question delivery, and the foundation for evidence-based learning intelligence.

## Requirements

- Node.js 22
- npm
- A Supabase project for backend/authentication
- Gemini API key for live AI tutor features (optional for local UI/API development)

## Local development

1. Install dependencies:

   ```bash
   npm ci
   ```

2. Create a local `.env` file. Never commit it.

   ```dotenv
   NODE_ENV=development
   SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVER_ONLY_SERVICE_ROLE_KEY
   GEMINI_API_KEY=YOUR_GEMINI_API_KEY
   SABI_APP_URL=http://localhost:5173
   ALLOWED_ORIGINS=http://localhost:5173
   ```

   The service-role key is server-only. Never prefix it with `VITE_`, expose it to browser code, or commit it.

3. Start the application:

   ```bash
   npm run dev
   ```

## Verification commands

```bash
npm run lint
npm test
npm run build
```

The backend CI workflow runs these checks and applies the Phase 1 SQL migrations to a disposable PostgreSQL 16 database. The fixture is test-only and must never be applied to Supabase.

## Architecture

- `server.ts` is the Express/Vercel API entry point.
- `server/config.ts` centralizes environment and CORS configuration.
- `server/lib/supabaseAdmin.ts` creates the server-only Supabase client and fails closed when production credentials are missing.
- `server/middleware/` contains authentication, role authorization, validation, rate limiting, and error handling.
- `server/validation/` contains request schemas.
- `supabase/migrations/` contains ordered, additive SQL migrations.
- `supabase/tests/` contains disposable database fixtures and migration assertions.

## Phase 1 database foundation

The academic catalogue is stored in:

- `jamb_subjects`: stable subject slugs and display labels.
- `jamb_syllabus_versions`: version metadata and provenance for subject syllabuses.
- `jamb_topics` and `jamb_subtopics`: hierarchical academic taxonomy.
- `exam_configurations` and `exam_configuration_subjects`: centralized CBT configuration.
- `course_subject_combinations` and its subject join table: institution/course combinations with verification status.

Legacy topic labels imported from the question bank are marked `draft` with their source recorded. They are not represented as JAMB-verified syllabus content. A verified syllabus version requires a reviewed authoritative source.

## Database change safety

- Do not apply production migrations without explicit approval.
- A migration file in Git does not prove it has been applied to Supabase.
- Check the target project, migration ledger, schema, RLS policies, grants, and default privileges before applying changes.
- Keep service-role access intact; client access to academic catalogues is read-only and audit records are server-only.
- Run Supabase security/performance advisors after schema changes.

## Deployment

Vercel deploys the application from the repository's configured production branch. Confirm the project and deployment target before changing environment variables or promoting a deployment.
