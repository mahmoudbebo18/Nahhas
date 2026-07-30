# Nahhas Group — Field Engineer Data-Entry Portal

A mobile-first React web app for logging construction site work into Odoo 19
through the existing `field_portal` REST API.

It replaces a deep Odoo navigation path with a guided flow:

> **project → level → work item → sub-task → log an entry**

Entries are **Material**, **Expense**, **Equipment** or **Subcontractor**, with
optional photo attachments. The app is **online-only** — every read and write
goes live to the API. There is no offline queue, no service worker and no local
cache of site data by design.

---

## Quick start (local Odoo)

```bash
npm install
cp .env.example .env      # then set VITE_API_BASE to your local Odoo
npm run dev               # http://localhost:5173
```

`.env` for local testing — match the port your Odoo actually listens on:

```
VITE_API_BASE=http://localhost:8069/api/field_portal/v1
```

The Vite dev server runs on `:5173`, so calls to `:8069` are **cross-origin**.
The API's default `Access-Control-Allow-Origin: *` covers this — no proxy is
configured or needed. Auth is a Bearer token, never a session cookie, so there
is no credentialed-CORS complication.

`npm run dev` binds to `0.0.0.0`, so you can open the LAN address it prints on
a real phone and test the flow with an actual thumb and an actual camera.

### Production

```
VITE_API_BASE=https://erp.nahas.group/api/field_portal/v1
```

Build and serve the static output from `https://site.nahas.group`:

```bash
npm run build        # → dist/
npm run preview      # optional local check of the built bundle
```

Two deployment notes:

- `VITE_API_BASE` is inlined at **build** time, not read at runtime. A
  production build must be made with the production value in `.env`.
- The app uses client-side routing. The host must rewrite unknown paths to
  `index.html`, or a refresh on `/subtasks/482/material` will 404.
- Before going live, tighten the API's `Access-Control-Allow-Origin` from `*`
  to `https://site.nahas.group`.

---

## Signing in

Each engineer signs in with their **Odoo email (or username) and password** —
no API key to copy around. The screen posts them to `POST /auth/token`, which
returns a bearer token.

Only a successful exchange stores anything, so a mistyped password never
displaces a working session. The token is kept in `localStorage` on that device
and sent as `Authorization: Bearer <token>` on every subsequent request. Tap the
avatar in the top bar to see who you are signed in as, or to sign out (which
also clears the cached data — important on a shared site tablet).

A wrong email or password returns 401 and shows a single generic message that
never reveals which of the two was wrong. If the token later expires or is
revoked, the next request returns 401; the app drops it and returns to sign-in
with an explanation. There is no password reset in the portal — the screen
points the engineer at their administrator.

---

## Which API route each screen calls

| Screen | File | Route |
|---|---|---|
| Sign-in | [SetupScreen.jsx](src/screens/SetupScreen.jsx) | `POST /auth/token` (then `GET /auth/whoami` on every launch) |
| Project picker | [ProjectsScreen.jsx](src/screens/ProjectsScreen.jsx) | `GET /projects` |
| Level picker | [LevelsScreen.jsx](src/screens/LevelsScreen.jsx) | `GET /projects/<id>/levels` |
| Item picker | [ItemsScreen.jsx](src/screens/ItemsScreen.jsx) | `GET /levels/<project_id>/<level>/items` |
| Legacy tree | [LegacyTasksScreen.jsx](src/screens/LegacyTasksScreen.jsx) | `GET /projects/<id>/tasks` |
| Sub-task picker | [SubtasksScreen.jsx](src/screens/SubtasksScreen.jsx) | `GET /items/<task_id>/subtasks` |
| Action chooser | [ActionScreen.jsx](src/screens/ActionScreen.jsx) | — |
| Entry forms | [EntryFormScreen.jsx](src/screens/EntryFormScreen.jsx) | `GET /subtasks/<task_id>/products?type=…` then `POST /subtasks/<task_id>/{material,expense,equipment,subcontractor}` |
| Photo upload | [PhotoScreen.jsx](src/screens/PhotoScreen.jsx) | `POST /subtasks/<task_id>/photo` |
| Success sheet | [SuccessSheet.jsx](src/screens/SuccessSheet.jsx) | `POST /subtasks/<task_id>/photo` with `line_id` |

Routes mirror the flow one-to-one, so the phone's back button walks it in
reverse and a URL can be shared mid-flow:

```
/projects
/projects/:projectId/levels
/projects/:projectId/levels/:level/items
/projects/:projectId/tasks          ← legacy (level_aware:false) projects
/items/:taskId/subtasks
/subtasks/:taskId                   ← action chooser
/subtasks/:taskId/:type             ← material | expense | equipment | subcontractor
/subtasks/:taskId/photo
```

### Level-aware vs legacy

`GET /projects` returns `level_aware` per project. When it is `false` the level
step is skipped entirely and the engineer drills the flat task tree from
`GET /projects/<id>/tasks`, following `parent_id` until `is_leaf`. The current
node lives in `?parent=`, so back navigation works inside the tree too. A leaf
lands on the same `/items/<id>/subtasks` screen as the level-aware flow, so
everything downstream is shared.

### `floor_no: 0`

A `floor_no` of `0` is a **real floor** ("Floor 00"), not an empty value.
Every check is explicitly against `null`/`undefined` — see `contextLine()` in
[ItemsScreen.jsx](src/screens/ItemsScreen.jsx).

---

## How the code is organised

```
src/
  lib/apiClient.js      the only fetch(); Bearer header, {error} → thrown ApiError, 401 broadcast
  api/queries.js        every endpoint as a TanStack Query hook / mutation
  api/entryTypes.js     the four entry types and their endpoint quirks
  context/              theme, language+direction, auth, breadcrumb trail
  components/           app shell, sheets, list rows, loading/error/empty states
  components/form/      product select, stepper, date pickers, attachments, submit bar
  screens/              one file per step of the flow
```

**`lib/apiClient.js`** is the only place `fetch` is called. It attaches the
Bearer header, normalises the API's `{"error": "..."}` body into a thrown
`ApiError` (carrying `status`, plus `isAuth` / `isForbidden` / `isNetwork` /
`isRetryable`), and dispatches a window event on 401 so the auth layer can drop
the dead key from one place.

**`api/queries.js`** holds every call as a hook. Reads share a 5-minute stale
time — an engineer backs out and drills in constantly, and re-fetching a
project list on every back press wastes site bandwidth. **Writes are never
auto-retried**: a silently duplicated material line is worse than making the
engineer press "Try again".

Error handling follows the contract:

| Status | Behaviour |
|---|---|
| 401 | key cleared, back to sign-in with "your key is no longer valid" |
| 403 | "Not allowed for this project" — a dead end, no retry button |
| 400 | the server's message shown inline; no auto-retry (the input is wrong) |
| 5xx / network | the message plus a **Try again** button |

### Post-submit flow

On success a confirmation sheet shows what the server actually recorded —
including the **server-computed duration** for equipment and subcontractor
entries — and offers to attach a photo to that exact line via `POST /photo`
with its `line_id`. Its primary button returns to the **action chooser for the
same sub-task**, not the project list: an engineer standing at one wall logs
material, then plant hours, then a photo, and sending them back to the top
would mean re-walking four levels between each one.

---

## Theming

Light is the **default**. The OS `prefers-color-scheme` is deliberately *not*
followed — a site phone left on auto-dark in bright sun is harder to read than
the light theme. Dark is opt-in via the animated sun/moon toggle in the top bar
and persists in `localStorage`.

Colours are CSS custom properties holding `R G B` triplets
([src/index.css](src/index.css)), mapped into Tailwind through a helper so
opacity modifiers (`bg-primary/10`) still work
([tailwind.config.js](tailwind.config.js)). A single `dark` class on `<html>`
re-themes everything; an inline script in [index.html](index.html) applies it
before first paint so there is no flash.

|  | Light | Dark |
|---|---|---|
| background | `#FAF9F6` | `#0A0A0A` |
| surface / cards | `#FFFFFF` | `#161616` |
| text | `#0A0A0A` | `#FAF9F6` |
| primary | `#06412a` | `#3E9E6E` |
| accent | `#C05527` | `#C05527` |

One deliberate departure: `--c-primary` lightens to `#3E9E6E` in dark mode for
**foreground** use (icons, primary buttons, tints), because `#06412a` is
unreadable as text on black. But the top bar keeps the true brand `#06412a` as
its **fill** in both themes via a separate `--c-header` token — painting a
full-width bar in the lightened green put a glaring band across a black screen.
Borders, hovers, disabled and focus states are generated tints of the same set.

The toggle itself is a single morphing SVG rather than two swapped icons: the
disc grows while a masked circle slides in to bite a crescent out of it and the
eight rays retract — all springs on transform/opacity, so it stays smooth on a
mid-range phone.

## Fonts

- **Latin → Inter**, bundled locally from the `@fontsource/inter` npm package.
  No Google Fonts request at runtime.
- **Arabic → Avenir Arabic.** Drop the licensed file at
  `src/assets/fonts/avenir-arabic-light.otf` (`.ttf`/`.woff2`/`.woff` also
  accepted). It is **gitignored** — it is licensed and must not be committed.

The font stack lists Inter first, so Latin always renders in Inter; Arabic code
points are not in Inter and fall through to Avenir Arabic. The `@font-face` is
additionally `unicode-range`-scoped to the Arabic blocks, so even if the file
carries Latin glyphs it can never claim Latin text.

Registration happens at runtime in [src/lib/fonts.js](src/lib/fonts.js) rather
than in CSS. A plain `url('../assets/fonts/…')` would make Vite **fail the
build** whenever the licensed file is absent, blocking anyone who just cloned
the repo; `import.meta.glob` resolves to `{}` instead, so the app builds and
runs either way and Arabic simply falls back to the system face.

## Bilingual & RTL

The UI toggles between English and Arabic from the top bar, which flips `dir`
on `<html>`. Every screen is built on logical properties (`ps-`/`pe-`,
`ms-`/`me-`, `start`/`end`) rather than left/right, so the whole app mirrors
without per-screen work; chevrons and back arrows carry `rtl-flip`.

**Data is never translated.** Project, task and product names come from Odoo in
whichever script they were entered in — often mixed in one list. Each piece of
server data is rendered with its own `dir`, computed by script detection in
[src/lib/text.js](src/lib/text.js), so an Arabic name inside an English list
gets correct punctuation placement instead of dangling brackets.

---

## Gaps found in the API contract

Things the portal needed that the contract does not currently provide. None are
blocking — each is handled with a documented assumption.

1. **No timezone on `start` / `end`.** The contract specifies the literal format
   `"YYYY-MM-DD HH:MM:SS"` but not the timezone. The portal sends the
   engineer's **local wall-clock** reading as typed (an 08:00 site start is sent
   as `08:00:00`). Odoo stores datetimes in UTC and converts using the *user's*
   timezone preference — so if the portal user's Odoo timezone is not set to
   site-local time, equipment and subcontractor hours will land shifted. Worth
   either documenting the expected timezone in the contract or accepting an
   explicit offset.

2. **No UoM list endpoint.** The material spec says qty + "uom (default from
   product)", implying the unit could be changed. `GET .../products` returns
   only the product's own `uom_id`/`uom`, and there is no endpoint listing
   alternative units, so the portal displays the product's unit read-only and
   sends its `uom_id`. A `GET /uoms` (or a `uom_ids` array per product line)
   would be needed to make it selectable.

3. **No partner list endpoint.** `partner_id` is optional on the subcontractor
   write, and there is no endpoint to list allowed partners, so the portal sends
   `null` and hides the field — as specified. A `GET /partners` would be needed
   to surface it later.

4. **`POST /photo` takes one photo per call.** Multi-photo uploads are sent as a
   sequence. Partial success is reported honestly (successful ones stay
   uploaded, failures remain queued for retry) rather than rolled back, because
   there is no batch endpoint and no delete endpoint to undo with.

5. **Legacy leaves may have no sub-tasks.** The contract routes all writes
   through `/subtasks/<task_id>/…`, but a legacy flat tree can end at a leaf
   that has no children. Rather than dead-ending, the sub-task screen offers to
   log directly against the leaf's own task id. Worth confirming that is valid
   server-side.

6. **No read-back of existing entries.** There is no `GET` for lines already
   logged on a sub-task, so the portal cannot show "what I logged here earlier
   today" or detect an accidental duplicate submission. A `GET
   /subtasks/<task_id>/lines` would close the loop.

7. **`GET /projects/<id>/tasks` shape is not fully specified.** The response is
   described as a "flat tree" with `parent_id` and `is_leaf`. The portal accepts
   both a bare array and `{tasks: [...]}`, and normalises `parent_id` whether it
   arrives as `false`, an id, or an `[id, name]` pair — Odoo emits all three
   depending on the serialiser.

---

## Stack

React 18 + Vite 6 · TanStack Query v5 (the entire data layer) · Framer Motion ·
Tailwind CSS 3 (`dark` class strategy) · Lucide icons. All free and
open-source.

`react-router-dom` is the one addition outside the specified list — it is what
makes the phone's hardware back button walk the guided flow in reverse, which
matters a lot when the whole app is a five-level drill-down. It complements the
stack rather than substituting for anything in it.
