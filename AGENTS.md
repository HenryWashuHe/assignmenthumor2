## Project Overview
- This is a Supabase-backed app that reads data from multiple tables and may use joins/views.
- The UI should be creative and engaging, not a generic dashboard.

## Files and Conventions
- Schema file: `schema.sql` at the repo root. Only store SQL schema here.
- Environment variables live in `.env.local` (do not commit); `.env.example` documents required keys.
- Prefer keeping Supabase client setup in a single module (e.g. `src/lib/supabaseClient.ts`).

## Data Access Rules
- Use `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for client reads.
- If server-only access is needed, use `SUPABASE_SERVICE_ROLE_KEY` on the server only.
- Avoid fetching with a service role key in client components.
- Do not create new tables or edit the database/schema as part of feature work.
- For complex joins, prefer:
  - database views, or
  - Supabase `select()` with nested relationships, or
  - RPCs if logic is complex.

## UI Expectations
- Aim for a distinct visual concept (bold typography, rich color, layered backgrounds).
- Prefer meaningful motion (page-load + staggered reveals), not excessive micro-animations.
- Mobile-first: ensure layout and typography scale down cleanly.
- For any new or updated UI design request, ask one multiple-choice question at a time (not a batch), using a short series that narrows the direction (e.g., mood, theme, typography style, color energy, layout density, content emphasis). Keep each question simple and clarify unfamiliar terms on request.

## Implementation Guidance
- Keep data fetching isolated and typed; define interfaces for fetched rows.
- Handle loading and error states with user-friendly empty states.
- Keep list rendering performant (avoid heavy work in render loops).

## Testing / Verification
- If you add data queries, verify them against the schema in `schema.sql`.
- If you build a UI page, verify in both mobile and desktop widths.
