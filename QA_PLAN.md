# QA Test Plan — The Punchline (Project 1: Caption Creation & Rating App)

## Application Overview

"The Punchline" is a humor-captioning platform for Columbia & Barnard students. Users sign in with university Google accounts, upload or pick images, generate AI-powered captions, rate others' captions via swipe/gesture controls, and explore analytics dashboards.

---

## Branch 1: Authentication Flow

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 1.1 | Login page renders | Visit `/login` | Sign-in card with Google button, lock icon, allowed-domains hint |
| 1.2 | Domain restriction display | Visit `/login` | "Allowed: @columbia.edu / @barnard.edu" hint visible |
| 1.3 | Error: wrong domain | Visit `/login?error=domain` | "Wrong account type" banner with clear instructions |
| 1.4 | Error: auth failed | Visit `/login?error=auth_failed` | "Sign-in didn't go through" banner with retry suggestion |
| 1.5 | Unknown error param | Visit `/login?error=xyz` | Generic "Something went wrong" banner |
| 1.6 | Unauthenticated redirect | Visit `/`, `/create`, `/rate`, `/caption-lab`, `/genome`, `/news`, `/chaos-wall` while logged out | 307 redirect to `/login?next=<original_path>` |
| 1.7 | Post-login redirect | Sign in from `/login?next=/create` | Redirect to `/create` after successful auth |
| 1.8 | Non-university domain blocked | Sign in with non-columbia/barnard Google account | Sign out + redirect to `/login?error=domain` |
| 1.9 | Sign out | Click user menu > Sign out | POST to `/auth/signout`, redirect to `/` (which redirects to `/login`) |
| 1.10 | Theme toggle | Toggle dark/light in user menu | Theme changes immediately, persists on page reload via localStorage |
| 1.11 | User menu keyboard | Press Escape while menu is open | Menu closes |
| 1.12 | User menu outside click | Click outside the dropdown | Menu closes |

---

## Branch 2: Landing Page (/)

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 2.1 | Masthead stats | Load homepage | Caption count and humor style count displayed |
| 2.2 | CTA buttons | Click each CTA (Gallery, Studio, Chaos Wall, Rate) | Navigate to correct route |
| 2.3 | Onboarding steps | Load homepage | 3-step guide renders with working links to Studio, Chaos Wall, Rate |
| 2.4 | Featured captions (lead) | Load homepage with data | Lead card with image, caption quote, flavor tag, like count |
| 2.5 | Featured captions (secondary) | Load homepage with data | Up to 3 secondary cards with thumbnails |
| 2.6 | Term of the day | Load homepage | Random term card with term, definition, example, link to Index |
| 2.7 | Community context | Load homepage | Latest context card with truncated text and tags |
| 2.8 | Section nav cards | Load homepage | 5 numbered section cards (Feed, Gallery, Index, Chaos Wall, Rate) linking correctly |
| 2.9 | Empty state (no data) | Load with no Supabase data | Page renders gracefully without featured cards or term |

---

## Branch 3: Studio (/create)

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 3.1 | Upload zone renders | Visit `/create` | Drop zone with supported format hint, click-to-browse |
| 3.2 | Drag-and-drop upload | Drag valid JPEG onto drop zone | File accepted, upload begins |
| 3.3 | Click-to-browse upload | Click drop zone, select file | File accepted, upload begins |
| 3.4 | Invalid file type | Upload a .txt or .bmp file | Error: "Unsupported file type" with format list |
| 3.5 | File too large | Upload file > 10MB | Error: "File too large. Maximum size is 10 MB." |
| 3.6 | HEIC upload (Safari) | Upload .heic file on Safari | Preview renders via native createImageBitmap |
| 3.7 | HEIC upload (Chrome) | Upload .heic file on Chrome | Preview renders via heic2any fallback |
| 3.8 | Upload progress states | Upload valid image | Uploading → Generating → Done phase labels |
| 3.9 | Generation overlay | During caption generation | Full-screen overlay with image preview, spinner, status text |
| 3.10 | Mini-game during wait | Click "Play while you wait" during generation | Pinball game loads in overlay |
| 3.11 | AI suggestions appear | After generation completes | Caption suggestion chips appear, first one auto-selected |
| 3.12 | Click suggestion chip | Click a different suggestion | Caption textarea and preview update |
| 3.13 | Gallery picker toggle | Click "Browse image gallery" | Gallery grid expands with up to 6 images |
| 3.14 | Select gallery image | Click a gallery image | Image selected, sample captions loaded, gallery collapses |
| 3.15 | Generate for gallery image | Select gallery image, click "Generate AI captions" | AI captions generated via `/api/pipeline/generate` |
| 3.16 | Live preview | Type in caption textarea | Preview updates in real-time |
| 3.17 | Character count | Type caption | Character count badge updates |
| 3.18 | Submit caption | Fill caption + image, click Submit | Toast "Caption submitted!", form resets |
| 3.19 | Submit success pulse | Submit caption | Preview card celebrates with pulse animation |
| 3.20 | Submit without image | Have caption but no image selected | Submit button disabled |
| 3.21 | Submit without caption | Have image but empty caption | Submit button disabled |
| 3.22 | Submit without auth | Not signed in | "Sign in to submit" message shown |
| 3.23 | Change image | Click "Change image" after selection | Form resets to upload zone |
| 3.24 | Clear caption | Click "Clear" button | Caption textarea empties |
| 3.25 | Writer room | Load page | Current vibe card, humor vocabulary terms, Chaos Wall link |
| 3.26 | Upload error recovery | Encounter upload error, click "Try again" | Form resets to upload zone |

---

## Branch 4: Gallery (/caption-lab)

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 4.1 | Default deck view | Visit `/caption-lab` | Deck view with top-liked caption card |
| 4.2 | Sort: top liked | Visit `/caption-lab?mode=top` | Captions sorted by like_count descending |
| 4.3 | Sort: most recent | Visit `/caption-lab?mode=recent` | Captions sorted by created_datetime_utc descending |
| 4.4 | Deck: Next/Prev | Click Next then Prev | Card advances and goes back |
| 4.5 | Deck: Surprise | Click Surprise | Random card selected (different from current) |
| 4.6 | Deck: Meta toggle | Click Meta | Flavor tag and like count shown/hidden |
| 4.7 | Keyboard: ArrowRight | Press → key in deck mode | Next card |
| 4.8 | Keyboard: ArrowLeft | Press ← key in deck mode | Previous card |
| 4.9 | Keyboard: S | Press S in deck mode | Surprise (random card) |
| 4.10 | Keyboard: M | Press M in deck mode | Toggle meta |
| 4.11 | Switch to grid | Click "Full grid" | Grid layout of all captions |
| 4.12 | Infinite scroll | Scroll to bottom in grid mode | More captions load via `/api/captions` |
| 4.13 | End of results | Scroll past all captions | "All captions loaded" message |
| 4.14 | Skeleton loading | Infinite scroll triggers | 6 skeleton cards shown while loading |
| 4.15 | Empty state | No public captions | "No public captions with images yet." |
| 4.16 | Examples section | Captions have examples | "How it's made" section with expandable breakdowns |
| 4.17 | Write yours link | Click "Write yours →" | Navigate to `/create` |

---

## Branch 5: Chaos Wall (/chaos-wall)

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 5.1 | Initial batch | Visit `/chaos-wall` | 12 caption cards with random rotations/offsets |
| 5.2 | Shuffle cards | Click "Shuffle cards" | Same cards re-arranged with new positions, glow animation |
| 5.3 | New batch | Click "New batch" | Different set of 12 cards from the pool |
| 5.4 | Card content | Inspect any card | Image, caption quote, flavor tag, like count |
| 5.5 | Variable card sizes | Load page | Some cards span 2 columns (deterministic by hash) |
| 5.6 | Back to Gallery link | Click "Back to Gallery" | Navigate to `/caption-lab` |
| 5.7 | Empty state | No public captions | "No public captions with images yet." |

---

## Branch 6: Rate (/rate)

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 6.1 | Rating deck loads | Visit `/rate` | Card with image, caption, flavor tag, vote buttons |
| 6.2 | Vote funny | Click Funny button | "Funny!" stamp, card exits right, auto-advance after 900ms |
| 6.3 | Vote not funny | Click Not Funny button | "Nope" stamp, card exits left, auto-advance |
| 6.4 | Skip | Click Skip | Card exits left (no vote recorded), advance |
| 6.5 | Undo toast appears | Vote on any caption | Toast with "Voted Funny/Not Funny" + Undo button + countdown bar |
| 6.6 | Undo vote | Click Undo within 6s | Vote deleted from DB, card returns, session count decremented |
| 6.7 | Undo toast expires | Wait 6 seconds | Toast auto-dismisses |
| 6.8 | Keyboard: F | Press F | Vote funny |
| 6.9 | Keyboard: D | Press D | Vote not funny |
| 6.10 | Keyboard: N | Press N | Skip |
| 6.11 | Keyboard: U | Press U after voting | Undo |
| 6.12 | Progress bar | Vote on several captions | Progress bar and "X/Y" counter update |
| 6.13 | Rated badge | Vote on captions | "X rated" badge includes previous + session votes |
| 6.14 | Peek card | Current card visible | Blurred next-card preview behind current |
| 6.15 | Image preload | View current card | Next card's image preloaded in background |
| 6.16 | Duplicate vote prevention | Try voting on same caption twice | Blocked by votedIds set check |
| 6.17 | Double-submit prevention | Rapid-click vote button | submittingRef lock prevents duplicate DB inserts |
| 6.18 | All caught up | Rate all available captions | "All caught up!" with total count and gallery link |
| 6.19 | Profile not found | User has no profile row | "Profile not found" message with instructions |
| 6.20 | Gesture callout | First visit to rate page | Discovery callout: "Try hands-free rating!" with enable button |
| 6.21 | Dismiss callout | Click X on gesture callout | Callout dismissed, persisted in localStorage |
| 6.22 | Enable gestures | Click "Use Gestures" toggle | Camera HUD appears, MediaPipe initializes |
| 6.23 | Gesture tutorial | First gesture activation | Tutorial modal with hand detection feedback |
| 6.24 | Wave right = funny | Wave hand right in camera | Card glow right, funny vote fires |
| 6.25 | Wave left = not funny | Wave hand left in camera | Card glow left, not funny vote fires |
| 6.26 | Gesture cooldown | Vote via gesture | 1.2s cooldown ring animation, "Wait..." status |
| 6.27 | Camera denied | Deny camera permission | Error: "Camera denied — allow access to use gestures." |
| 6.28 | No camera found | Device without camera | Error: "No camera found." |
| 6.29 | Skeleton overlay | Gestures active, hand detected | Green skeleton drawn on canvas overlay |

---

## Branch 7: Feed (/news)

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 7.1 | Headlines load | Visit `/news` | News cards with headline, category badge, date |
| 7.2 | Category filter | Select category, click Filter | Only matching headlines shown |
| 7.3 | Clear filter | Click "Clear" | All categories shown, URL resets to `/news` |
| 7.4 | Headline count | Apply filter | "X headlines" count updates |
| 7.5 | Entity tags | View headline with entities | Colored tags: person (red), org (green), place (brown), event (purple), product (teal), acronym (gray) |
| 7.6 | External source link | Click linked headline | Opens source URL in new tab |
| 7.7 | Non-linked headline | View headline without source_url | Renders as `<article>` (not clickable) |
| 7.8 | Community context sidebar | Load page | Up to 3 context items with tags |
| 7.9 | Entity legend | Load page | Color-coded legend in sidebar |
| 7.10 | Empty state | No active headlines | "No active headlines" message |

---

## Branch 8: The Index (/genome)

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 8.1 | Stats row | Visit `/genome` | 5 stat cards: Captions, Shares, Screenshots, Humor styles, Celebrity subjects |
| 8.2 | Zone switcher | Click each zone button | Corresponding section renders |
| 8.3 | Humor styles (default) | Load page | Ranked flavor rows with bar chart, avg likes, count |
| 8.4 | Expand flavor row | Click a flavor row | Description, top caption quote, top image revealed |
| 8.5 | Collapse flavor row | Click expanded row again | Detail section hides |
| 8.6 | Lexicon zone | Click "Lexicon" | Term cards with word, type badge, definition, example |
| 8.7 | Celebs zone | Click "Celebs" | Ranked celebrity cards with images, caption counts, top caption, flavor |
| 8.8 | Shares zone | Click "Shares" | Bar chart of share destinations with percentages |
| 8.9 | Hours zone | Click "Hours" | 24-hour activity bar chart with formatted hour labels |
| 8.10 | Hall zone | Click "Hall" | Screenshot hall of fame cards with screenshot + like counts |

---

## Branch 9: Context Detail (/contexts/[id])

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 9.1 | Valid context | Visit `/contexts/1` (valid ID) | Context card with community name, priority, text, time window, tags |
| 9.2 | Caption duel | Visit valid context with captions | Two caption cards with hype bars and shared image |
| 9.3 | Invalid ID (NaN) | Visit `/contexts/abc` | 404 not found |
| 9.4 | Nonexistent ID | Visit `/contexts/99999` | "No community context found" message |
| 9.5 | Back link | Click "← Back to home" | Navigate to `/` |
| 9.6 | Tag-matched captions | Context has tags | Captions filtered by tag relevance |

---

## Branch 10: API Routes

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 10.1 | POST /api/pipeline — no auth | Call without session | 401 "Not authenticated" |
| 10.2 | POST /api/pipeline — no file | Call with auth, no file | 400 "No file provided" |
| 10.3 | POST /api/pipeline — bad type | Upload unsupported file type | 400 with supported types list |
| 10.4 | POST /api/pipeline — success | Upload valid image with auth | 200 with imageId, cdnUrl, captions |
| 10.5 | POST /api/pipeline/generate — no auth | Call without session | 401 "Not authenticated" |
| 10.6 | POST /api/pipeline/generate — no URL | Call with auth, no imageUrl | 400 "imageUrl is required" |
| 10.7 | POST /api/pipeline/generate — success | Call with valid imageUrl | 200 with imageId, captions |
| 10.8 | GET /api/captions — default | GET `/api/captions` | 200 with top-liked captions, hasMore flag |
| 10.9 | GET /api/captions — recent | GET `/api/captions?mode=recent` | Captions sorted by date |
| 10.10 | GET /api/captions — cursor | GET `/api/captions?mode=top&cursor=5` | Next page of results |

---

## Branch 11: Cross-Cutting Concerns

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 11.1 | Dark mode all pages | Toggle dark mode, visit each page | Correct dark theme variables applied |
| 11.2 | Mobile nav | View header on 375px viewport | Nav scrolls horizontally, no overflow |
| 11.3 | Image optimization | Inspect any page with images | next/image used with proper sizes, alt text, priority flags |
| 11.4 | No Supabase env | Remove env vars, load any page | Graceful empty states, no crashes |
| 11.5 | Revalidation | Check all page exports | `revalidate = 0` on all data-fetching pages (fresh on every request) |
| 11.6 | No console.log | Search codebase | Zero console.log statements in production code |
| 11.7 | Middleware protection | Visit any non-public route unauthenticated | Redirect to login with next param |
