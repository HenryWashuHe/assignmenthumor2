# Post-Testing Summary — The Punchline (Project 1)

## What was tested, issues found, and fixes applied

- **Tested the full authentication flow** including Google OAuth redirect, domain restriction (columbia.edu / barnard.edu), error banners for wrong domain and auth failures, and post-login redirect preservation via the `next` query parameter. Verified that all protected routes (/, /create, /rate, /caption-lab, /genome, /news, /chaos-wall) properly redirect unauthenticated users to `/login?next=<path>`. All auth paths work correctly.

- **Found and fixed a critical bug in the rating system**: the `caption_votes` table requires `created_datetime_utc` as NOT NULL with no database default, but the vote insertion in `RatingDeck.tsx` was missing this field entirely. This meant every single vote submission would fail with a database constraint error. Fixed by adding `created_datetime_utc: new Date().toISOString()` to the insert payload. This was the most severe bug found — rating was completely broken.

- **Tested the caption creation pipeline end-to-end**: image upload with file type validation (JPEG, PNG, WebP, GIF, HEIC) and 10MB size limit, the generation overlay with pinball mini-game wait screen, AI caption suggestion chips that auto-populate the editor, gallery image selection with sample caption loading, live caption preview, and caption submission with toast confirmation. The full upload-to-submit flow works correctly including error recovery.

- **Verified the gallery and chaos wall render correctly**: deck view with Next/Prev/Surprise/Meta controls, grid view with infinite scroll pagination via the `/api/captions` endpoint (cursor-based), keyboard shortcuts (arrow keys, S, M), and the chaos wall's shuffle/new-batch functionality with randomized card rotations. Infinite scroll loads additional pages seamlessly with skeleton loading states.

- **Fixed nav overflow on mobile viewports**: the sticky header nav contains 6 navigation links plus the sign-in/user-menu button, which overflowed on screens narrower than ~768px and caused horizontal page scrolling. Added `overflow-x: auto` with hidden scrollbar and `flex-shrink: 0` / `white-space: nowrap` on nav links so the nav scrolls independently without breaking the page layout.

- **Fixed a dead "Back to stormboard" link** on the context detail page (`/contexts/[id]`) — this linked to a route that doesn't exist in the application. Updated both instances (empty state and main view) to read "Back to home" and correctly link to `/`.

- **Tested the gesture-based rating system code path**: MediaPipe HandLandmarker initialization with GPU-first/CPU-fallback, wave detection using velocity thresholds (0.15) with consistency checks (55% of frame deltas must match direction), 1.2-second cooldown between gestures, camera HUD with skeleton overlay, discovery callout for new users persisted via localStorage, and the tutorial modal on first activation. WASM files are properly served from `/public/mediapipe/wasm/`.

- **Verified the analytics dashboard (The Index)** renders all 6 zones correctly: humor style rankings with expandable rows showing top caption + image, the lexicon with typed term cards, celebrity subjects ranked by total likes, share destination bar charts with percentages, 24-hour activity histogram, and the screenshot hall of fame. All data aggregation happens server-side with proper null handling and graceful empty states.
