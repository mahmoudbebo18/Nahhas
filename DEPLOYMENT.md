# Deploying the Field Engineer Portal

How the portal reaches Odoo, why local development needs one Odoo setting, and
the three ways you can wire it up in production.

- [The one thing to understand: how Odoo picks a database](#the-one-thing-to-understand-how-odoo-picks-a-database)
- [Local development](#local-development)
- [Production — pick one of three](#production--pick-one-of-three)
- [Locking down CORS](#locking-down-cors)
- [Build and serve the static app](#build-and-serve-the-static-app)
- [Go-live checklist](#go-live-checklist)
- [Troubleshooting](#troubleshooting)

---

## The one thing to understand: how Odoo picks a database

Almost every "CORS error" you will hit with this stack is really a *database
resolution* error wearing a CORS costume. It is worth 60 seconds.

Odoo resolves the database **per request, before routing**, in
`Request._get_session_and_dbname` (`odoo/http.py`). There are exactly three
mechanisms, tried in this order:

| # | Mechanism | Notes |
|---|---|---|
| 1 | `session_id` cookie | Uses `session.db`, if it still passes the db filter. |
| 2 | `X-Odoo-Database` header | Only if it passes the db filter. Also forces the request **stateless** (`session.can_save = False`). |
| 3 | **monodb** | If the db filter leaves exactly **one** database, use it. |

Three consequences:

- **There is no `?db=` parameter.** Resolution happens before the route is
  matched, so nothing in the query string or JSON body can select a database.
- **A browser can never use mechanism 2.** `X-Odoo-Database` is not a
  CORS-safelisted header, so it triggers a preflight; the preflight carries no
  custom headers, so Odoo cannot resolve the database and returns 404 *before*
  emitting any CORS headers — which the browser reports as a CORS failure. And
  even past that, Odoo's own preflight response advertises only `Origin,
  X-Requested-With, Content-Type, Accept, Authorization, Range` in
  `Access-Control-Allow-Headers`; `X-Odoo-Database` is not on that list, so the
  browser would refuse to send it anyway.
- **Never send 1 and 2 together.** Odoo answers `403 Forbidden — "Cannot use
  both the session_id cookie and the x-odoo-database header."`

> This is why the React app differs from the Batch Roastery mobile app, which
> *does* send `X-Odoo-Database`. React Native is not a browser: no same-origin
> policy, no preflight, no header restrictions. A browser has all three.

**So for any browser client, mechanism 3 is the only option.** Make the server
resolve one database by itself, and the whole problem disappears.

---

## Local development

Two steps, one on each side. No Vite proxy, no `X-Odoo-Database`.

### 1. Odoo — pin the database

In your local `odoo.conf`:

```ini
[options]
db_name = Nahas-Staging-V1.0
list_db = False
http_port = 8019
```

`db_name` alone is enough: with no `dbfilter` set, Odoo treats `db_name` as the
list of exposed databases, one entry leaves one match, and monodb kicks in.

If you genuinely need several databases exposed and want to pick between them
by hostname, use a filter instead — matched with `re.match` (start-anchored
only), so end it with `$`, and escape dots in a literal name:

```ini
dbfilter = ^Nahas-Staging-V1\.0$
```

A ready-to-copy file lives at `odoo.conf.example` in the **Nahhas-Group** repo.

Restart Odoo. Verify:

```bash
curl -i http://localhost:8019/api/field_portal/v1/projects
```

You want `401 {"error": "Authentication required."}` — that means the database
resolved and the route ran. A 404 mentioning "No database is selected" means
`db_name` has not taken effect.

### 2. Portal — point straight at it

`.env`:

```
VITE_API_BASE=http://localhost:8019/api/field_portal/v1
```

```bash
npm install
npm run dev        # http://localhost:5173
```

Calls to `:8019` from `:5173` are cross-origin, and that is intentional — it is
the same request path production uses, so CORS problems surface on your machine
instead of after deploy. The API's `Access-Control-Allow-Origin: *` covers it,
and auth is a Bearer token with `credentials: 'omit'`, so no cookies are
involved.

### Testing on a real phone

`npm run dev` binds to `0.0.0.0` and prints a `http://192.168.x.x:5173`
address. The phone cannot resolve `localhost`, so point the API at the same LAN
IP and restart the dev server:

```
VITE_API_BASE=http://192.168.1.50:8019/api/field_portal/v1
```

Odoo must be listening on `0.0.0.0` too (`http_interface = 0.0.0.0`).

> **Camera and geolocation need a secure context.** Browsers treat `localhost`
> as secure but a plain-HTTP LAN IP as insecure, so the photo screen's camera
> capture will not work over `http://192.168.x.x:5173`. For camera testing use
> a tunnel that terminates TLS (`cloudflared tunnel --url http://localhost:5173`
> or `ngrok http 5173`) and set `VITE_API_BASE` to a tunnelled Odoo URL as well
> — a page on HTTPS cannot call an HTTP API (mixed content).

---

## Production — pick one of three

### Option A — Cross-origin (current plan, least infrastructure)

App on `https://site.nahas.group`, API on `https://erp.nahas.group`. Different
origins, real CORS, exactly like local development.

```
VITE_API_BASE=https://erp.nahas.group/api/field_portal/v1
```

Requirements:

- `erp.nahas.group` already resolves its own database by host — nothing to do.
- Both hosts on HTTPS. A page on HTTPS cannot call an HTTP API.
- Routes already carry `cors=CORS_ORIGIN`; see [Locking down CORS](#locking-down-cors).

Every API call pays a preflight `OPTIONS` round trip on the first request of
each kind. Odoo sets `Access-Control-Max-Age`, so browsers cache the result —
on a site phone with a weak connection this is noticeable but not painful.

**Recommended if** you want to ship without touching infrastructure.

### Option B — Same-origin via reverse proxy (recommended)

Serve the static app *and* proxy `/api` from one host, so the browser only ever
talks to `site.nahas.group`. No CORS anywhere, no preflight, and the header
Odoo sees is a normal same-origin request.

nginx on `site.nahas.group`:

```nginx
server {
    listen 443 ssl http2;
    server_name site.nahas.group;

    # ... ssl_certificate / ssl_certificate_key ...

    # The built SPA.
    root /var/www/field-portal;
    index index.html;

    # Client-side routing: unknown paths must fall back to index.html or a
    # refresh on /subtasks/482/material returns 404.
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Hashed assets are immutable; index.html must never be cached.
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    location = /index.html {
        add_header Cache-Control "no-cache";
    }

    # The API, same origin.
    location /api/field_portal/ {
        proxy_pass https://erp.nahas.group;
        proxy_set_header Host erp.nahas.group;   # so Odoo resolves its db by host
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;                 # photo uploads
        client_max_body_size 25m;                # base64 photos are bulky
    }
}
```

Then `.env.production`:

```
VITE_API_BASE=/api/field_portal/v1
```

`proxy_set_header Host erp.nahas.group` is the load-bearing line — it is what
lets Odoo resolve its database from the host. Do not replace it with
`$host`.

**Recommended if** you control the web host. It removes an entire class of
failure, halves the request count, and the relative `VITE_API_BASE` means the
same build works on staging and production.

### Option C — Odoo serves the SPA itself

Copy `dist/` into an Odoo module's `static/` and add a controller that returns
`index.html` for unmatched portal paths. One origin, one deployment, one TLS
certificate.

Costs: rebuilding the frontend means upgrading an Odoo module, Odoo's static
handler is slower than nginx, and SPA fallback routing has to be hand-written.

**Recommended only if** you cannot add a web host and everything must ship
through the Odoo deployment pipeline.

### Which to choose

| | A — Cross-origin | B — Reverse proxy | C — Inside Odoo |
|---|---|---|---|
| Infrastructure | none | nginx/Caddy host | none |
| CORS | real, must be configured | none | none |
| Preflight cost | yes | no | no |
| Dev/prod parity | high | high (relative base) | low |
| Frontend deploy | copy `dist/` | copy `dist/` | Odoo module upgrade |

Start with **A** if you need to ship this week; move to **B** when you have a
web host. Both use the same build, so switching is a `.env` change.

---

## Locking down CORS

Every route in `field_portal_api.py` is declared `cors=CORS_ORIGIN`, resolved
once at import:

```python
CORS_ORIGIN = os.environ.get('FIELD_PORTAL_CORS_ORIGIN') or '*'
```

To narrow it in production, set the variable in the Odoo service's environment
and **restart Odoo** (it is read at import time):

```ini
# /etc/systemd/system/odoo.service
[Service]
Environment=FIELD_PORTAL_CORS_ORIGIN=https://site.nahas.group
```

On odoo.sh, set it under *Settings → Environment variables*. On Docker, pass
`-e FIELD_PORTAL_CORS_ORIGIN=https://site.nahas.group`.

Only a **single fixed origin** works. The value is emitted verbatim and Odoo
does not send `Vary: Origin`, so a comma-separated list is rejected by every
browser. If you need both a staging and a production frontend, run them against
different Odoo instances, or use Option B where the question does not arise.

**How much does this actually buy you?** Honestly: defence in depth, not much
more. `*` is already safe for this API — a wildcard origin *forbids* credentialed
requests at the browser level, the app sends `credentials: 'omit'`, and every
route requires a Bearer token. A malicious page can fire requests at the API but
only ever receives 401s. Narrowing the origin is still worth doing (it stops
casual probing from a browser and keeps the API out of other people's pages), but
it is not the control that protects your data — the Bearer token is.

Do not confuse this with network exposure. If `erp.nahas.group` should not be
publicly reachable, that is a firewall/VPN decision; CORS is a browser
convention and offers no protection against `curl`.

---

## Build and serve the static app

```bash
npm ci
npm run build        # → dist/
npm run preview      # optional: serve the built bundle locally
```

Two things to get right:

1. **`VITE_API_BASE` is inlined at build time**, not read at runtime. A
   production bundle must be built with the production value present. Vite
   picks up `.env.production` automatically for `npm run build`, which is
   cleaner than editing `.env` before each release:

   ```
   # .env.production
   VITE_API_BASE=https://erp.nahas.group/api/field_portal/v1
   ```

   It is gitignored like every other `.env`, so it must exist on the build
   machine or in CI secrets.

2. **The host must rewrite unknown paths to `index.html`.** The app uses
   client-side routing; without the rewrite, a refresh on
   `/subtasks/482/material` 404s. nginx: `try_files $uri $uri/ /index.html;`.
   Apache: a `.htaccess` `FallbackResource /index.html`. Netlify/Vercel/S3+
   CloudFront: the standard SPA redirect rule.

Cache `index.html` with `no-cache` and `/assets/*` (content-hashed) with a long
`immutable` max-age. Getting this backwards is the classic "engineers still see
last week's build" bug.

---

## Go-live checklist

- [ ] Odoo resolves one database by host (`curl https://erp.nahas.group/api/field_portal/v1/projects` → `401`, not a 404 about databases)
- [ ] `FIELD_PORTAL_CORS_ORIGIN` set to the frontend origin, Odoo restarted
- [ ] Frontend built with the production `VITE_API_BASE`
- [ ] SPA fallback rewrite configured; deep-link refresh tested
- [ ] `index.html` no-cache, `/assets/*` immutable
- [ ] HTTPS on both hosts; no mixed content in the console
- [ ] Upload limit and read timeout raised for photo posts (25 MB / 120 s)
- [ ] `list_db = False` and `admin_passwd` set on the production Odoo
- [ ] Sign-in, one entry of each of the four types, and a photo upload all tested from a real phone
- [ ] Portal token expiry reviewed (`ek_projects_management.portal_token_days`, default 30)

---

## Troubleshooting

**"CORS error" / "No 'Access-Control-Allow-Origin' header" in the console**

Nine times out of ten the database did not resolve. Check with `curl` — which
ignores CORS entirely and shows you the truth:

```bash
curl -i http://localhost:8019/api/field_portal/v1/projects
```

- `404` with "No database is selected" → set `db_name` in `odoo.conf`, restart.
- `401 {"error": "Authentication required."}` → the API is fine; the problem is
  a genuine CORS or URL mistake.

Then check the preflight in isolation:

```bash
curl -i -X OPTIONS http://localhost:8019/api/field_portal/v1/projects \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: authorization"
```

Expect `204` with `Access-Control-Allow-Origin`. If the origin echoed back is
not yours, `FIELD_PORTAL_CORS_ORIGIN` is set to something else.

**`403 — Cannot use both the session_id cookie and the x-odoo-database header`**

Something is sending both. If you reintroduce a dev proxy that stamps
`X-Odoo-Database` on every call, any Odoo session cookie picked up on the same
origin will trigger this on *every* request. Don't send the header at all —
fix database resolution on the server instead.

**Requests work in `curl` but not the browser, and there is no preflight**

Check for mixed content: an HTTPS page cannot call an HTTP API. The browser
blocks it before a request is ever made, so the network tab shows nothing.

**`401` immediately after a successful sign-in**

The token is stored in `localStorage`. In a private window or with
"block third-party cookies and site data" it may not persist. Also confirm the
portal token has not expired (`ek_projects_management.portal_token_days`).

**Everything works locally, breaks on the phone**

`localhost` in `VITE_API_BASE` resolves to the *phone*, not your machine. Use
the LAN IP for both, and make sure Odoo listens on `0.0.0.0`.
