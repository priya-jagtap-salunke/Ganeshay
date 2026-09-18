# Bappaji.com — AI Review Draft Generator

Mobile-friendly page for **one shared WhatsApp link** → **different English review draft per visitor**.

Customers edit the draft, copy it, then open your real Google Review URL. **Nothing is posted automatically.**

---

## Folder structure

```
review-generator/
├── index.html
├── README.md
├── css/
│   └── styles.css
└── js/
    ├── config.js                 ⭐ Google URL + AI config
    ├── app.js                    UI only
    ├── aiAdapter.js              ⭐ AI backend hook
    └── generator/
        ├── index.js              generateUniqueReview()
        ├── visitor.js            Anonymous session ID
        ├── composer.js           Local variation engine
        ├── pools.js              English sentence pools
        ├── history.js            Duplicate detection
        ├── random.js             Seeded randomness
        └── globalDedup.js        Optional cross-device dedup
```

---

## How unique visitor generation works

```
Customer A opens link  →  new session ID  →  unique Draft A
Customer B opens link  →  new session ID  →  unique Draft B
Customer C opens link  →  new session ID  →  unique Draft C
```

1. **Anonymous visitor ID** — `crypto.randomUUID()` stored in `sessionStorage` (no login, no PII).
2. **Seeded combinatorial engine** — visitor ID + time + crypto random picks different sentences from large English pools (30+ openings × 25+ product lines × 20+ service lines × …).
3. **Session history** — drafts seen in this session are fingerprinted; near-duplicates are rejected and regenerated.
4. **Optional global dedup** — enable `GLOBAL_DEDUP` in config when you add a backend to track fingerprints across devices.

**One URL for everyone.** You do not create separate links per customer.

---

## Run locally

```bash
cd review-generator
npx serve .
```

Open the URL on your phone (e.g. `http://192.168.x.x:3000` on same Wi‑Fi).

> Must be served over HTTP — ES modules do not work with `file://`.

---

## 1. Paste Google Review URL

**File:** `review-generator/js/config.js`

```javascript
export const GOOGLE_REVIEW_URL =
  'PASTE_MY_GOOGLE_REVIEW_LINK_HERE';
```

Replace with your actual Google Maps review link. **Review on Google** opens this URL only — it does not modify or create the link.

---

## 2. AI API configuration (optional)

**File:** `review-generator/js/config.js`

```javascript
export const AI_API = {
  enabled: true,
  endpoint: 'https://your-domain.com/api/generate-review',
  provider: 'openai',
};
```

**Never put API keys in frontend code.** Your backend:

- Stores `OPENAI_API_KEY` (or similar) as a secret
- Accepts POST `{ visitorId, history, attempt, instructions }`
- Returns `{ draft: "English review text..." }`

See `js/aiAdapter.js` for the full request body.

If AI is disabled or fails → **local English variation engine** runs automatically.

### Optional global dedup (recommended at high volume)

```javascript
export const GLOBAL_DEDUP = {
  enabled: true,
  endpoint: 'https://your-domain.com/api/review-draft/register',
};
```

POST `{ fingerprint, visitorId }` → `{ duplicate: boolean }`

---

## Deploy as live website

### bappaji.com subfolder

Upload `review-generator/` → `https://bappaji.com/review/`

### Netlify / Vercel

- Publish directory: `review-generator`
- Deploy

### WhatsApp message

```
📝 Share your experience: https://bappaji.com/review/
```

---

## Features

| Feature | Detail |
|--------|--------|
| Language | **English only** |
| Uniqueness | Per-visitor draft on every open |
| Length | ~30–80 words |
| Keywords | 2–4 used naturally per draft |
| Anti-dup | Session fingerprints + optional server |
| Privacy | Anonymous session ID only |
| Google | Opens your URL — never auto-posts |

---

## Customize variation

Add sentences to `js/generator/pools.js`:

- `OPENINGS`
- `PRODUCT_DESCRIPTIONS`
- `EXPERIENCE_STATEMENTS`
- `SERVICE_STATEMENTS`
- `ECO_STATEMENTS`
- `CLOSINGS`

More sentences = lower chance of collision across thousands of visitors.
