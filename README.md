# Kinder Spiele Seite — Project Guide

Children's board game ranking website where kids vote for their favorite games and see a live leaderboard.

## Tech Stack

- **Site generator:** Jekyll 4.x (static HTML)
- **Frontend:** Vanilla HTML/CSS/JS (no framework, no build step beyond Jekyll)
- **Data backend:** Google Apps Script endpoint backed by a Google Spreadsheet
- **Language:** German UI

## Project Structure

```
├── _config.yml            # Jekyll config + Apps Script endpoint URL
├── _layouts/
│   └── default.html       # Base HTML layout, injects SITE_CONFIG into JS
├── _includes/
│   ├── vote-form.html     # Vote submission form partial
│   └── ranking.html       # Top-10 leaderboard partial
├── assets/
│   ├── css/
│   │   └── style.css      # Responsive styling, kid-friendly design (Comic Neue, gradients)
│   ├── fonts/
│   │   ├── ComicNeue-Regular.woff2  # Self-hosted web font (400)
│   │   └── ComicNeue-Bold.woff2     # Self-hosted web font (700)
│   └── js/
│       └── main.js        # Client-side: fetch rankings, render leaderboard, submit votes
├── index.html             # Home page (uses default layout, includes partials)
└── Gemfile                # Ruby dependencies
```

## Running Locally

```bash
bundle install             # install Jekyll and plugins (first time only)
bundle exec jekyll serve   # serves on http://localhost:4000 with live reload
```

No Node.js required. Jekyll builds to `_site/`.

## Google Apps Script API

Single endpoint configured in `_config.yml` as `google_apps_script_url`.

| Method | Description | Request | Response |
|--------|-------------|---------|----------|
| GET    | Fetch rankings | — | CSV: `Game,Votes\nCatan,5\nMonopoly,3` (pre-aggregated, sorted) |
| POST   | Submit a vote | JSON body: `{"name","nickname","favorite","another"}` | `{"result":"success"}` via redirect |

**POST details:**
- Content-Type must be `application/x-www-form-urlencoded` (Apps Script quirk — body is JSON but content type is form-encoded)
- `favorite` = game selected from the dropdown (may be empty string), `another` = game typed in free-text field (may be empty string); at least one must be non-empty
- Spreadsheet columns: Timestamp, Name, Nickname, Favorite, Another
- Response is a 302 redirect; browser fetch uses `mode: "no-cors"` (opaque response, submission still goes through)
- Rankings update within ~2 seconds after a vote

## Key Features

- Vote submission form (name, nickname, game selection or free-text)
- Live top-10 leaderboard with gold/silver/bronze medals for top 3
- Dropdown auto-populated with top 5 games (computed from rankings data)
- Responsive layout (2-column desktop, 1-column mobile at 768px)

## Architecture Notes

- Fully static site — no server-side logic at runtime
- Rankings are pre-aggregated by the Apps Script; client just parses the 2-column CSV
- Configuration (endpoint URL) is injected from `_config.yml` into JS via the layout template
- HTML is XSS-safe: game names are escaped via `escapeHtml()` before rendering
- Vote submission uses `mode: "no-cors"` fetch — response is opaque, so success is assumed if no network error

## Known Limitations

- `mode: "no-cors"` POST means we can't distinguish server errors from success (opaque response)
- ~2 second delay after voting before the new vote appears in rankings
- No caching of rankings between page loads
- No authentication or rate limiting (relies on Google Apps Script)
