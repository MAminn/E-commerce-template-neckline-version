# Neckline demo seed

A reusable, brand-safe snapshot of the Neckline demo storefront: catalog,
media references, Noir homepage/CMS content, layout settings, and store
settings. Use it to restore a fresh database locally or on a deployment.

```
seeds/neckline-demo/
├── data.sql        31 INSERTs, wrapped in one transaction
├── media/          8 image files that data.sql references
├── manifest.json   inventory + SHA-256 checksums
└── README.md
```

## What's included

| Table | Rows | Contents |
| --- | --- | --- |
| `vendor` | 1 | Default single-shop store owner |
| `file` | 6 | Media records (filenames only) |
| `category` | 5 | Active categories only |
| `product` | 5 | Demo catalog |
| `product_image` | 5 | Product → file links |
| `product_category` | 6 | Product ↔ category relations |
| `homepage_content` | 1 | `landing-noir` only |
| `layout_settings` | 1 | `landing-noir` only |
| `store_settings` | 1 | Template selection, shipping fee, link-tree config |

## What's excluded

No users, sessions, accounts, orders, order items, payments, promo codes,
analytics, tracking, attribution, webhook logs, or API keys. No `.env`, and
no secrets of any kind. Homepage content for the Classic/Modern/Editorial/
Cesro templates is deliberately left out — this seed is Noir-only.

Four unused prior-brand categories that had been soft-deleted were purged from
`neckline_dev` outright — nothing referenced them. One media record that only
they pointed at was removed along with them, so it is absent here too.

## Prerequisites

1. Schema is already migrated. The server runs migrations automatically on
   first boot, so starting it once is enough.
2. `DATABASE_URL` points at the database you intend to restore into.

The default store vendor `00000000-0000-0000-0000-000000000001` is included
in `data.sql`, so no prior server boot is needed — `product.vendor_id`
resolves on a database that has never run the app.

## Restore

Two steps — database, then media. **Both are required**; `uploads/` is
listed in `.gitignore` and `.dockerignore`, so the image files do not
travel with the repo or a Docker build. Skipping step 2 leaves every
product and hero image returning 404.

### 1. Database

Local Docker container:

```bash
docker exec -i neckline-postgres \
  psql -U postgres -d neckline_dev -v ON_ERROR_STOP=1 \
  -f - < seeds/neckline-demo/data.sql
```

Any reachable database, via `psql`:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f seeds/neckline-demo/data.sql
```

The whole file runs inside one transaction and every statement carries
`ON CONFLICT DO NOTHING`, so it is idempotent — re-running adds nothing and
overwrites nothing. To intentionally replace existing rows, delete them
first, then re-run.

### 2. Media

Copy the bundled images into the repo's `uploads/` directory, preserving
the `homepage/` subfolder:

```bash
mkdir -p uploads/homepage
cp -r seeds/neckline-demo/media/. uploads/
```

PowerShell:

```powershell
New-Item -ItemType Directory -Force uploads\homepage | Out-Null
Copy-Item -Recurse -Force seeds\neckline-demo\media\* uploads\
```

Paths are preserved exactly as `/uploads/<name>.webp` and
`/uploads/homepage/hero-<id>.webp`, matching what the database references
and what the server serves from `<repo-root>/uploads`.

## Verify

```bash
docker exec neckline-postgres psql -U postgres -d neckline_dev -tAc "
SELECT 'products='||(SELECT count(*) FROM product)
||' categories='||(SELECT count(*) FROM category)
||' noir_homepage='||(SELECT count(*) FROM homepage_content WHERE template_id='landing-noir')
||' noir_layout='||(SELECT count(*) FROM layout_settings WHERE template_id='landing-noir');"
```

Expected: `products=5 categories=5 noir_homepage=1 noir_layout=1`.

Confirm the media landed:

```bash
ls uploads/*.webp | wc -l          # >= 6
ls uploads/homepage/*.webp | wc -l # >= 2
```

`manifest.json` carries a SHA-256 for every bundled file if you need to
check integrity after transferring them.

## Branding

All content carries Neckline branding. Every prior-brand string was cleaned out
of the local database first, then this seed was regenerated from it, so the
seed and `neckline_dev` agree:

| Table | Field | Value |
| --- | --- | --- |
| `layout_settings` | header `logoText` | `NECKLINE` |
| `layout_settings` | footer `logoText` | `NECKLINE` |
| `store_settings` | `link_tree_config.brandName` | `NECKLINE` |
| `homepage_content` | return-policy copy (EN + AR) | "Neckline" |
| `homepage_content` | `returnPolicy.supportEmail` | `support@example.com` |

`support@example.com` is a deliberate placeholder — set a real address through
the CMS once one exists, then regenerate this seed.

The storefront positioning copy was rewritten for Neckline too —
`layout_settings.footer.description` now reads "Solid perfumes crafted for
everyday presence — compact, refined, and made to last." No copy from the
previous brand remains in the seed or in `neckline_dev`.

## Notes

- `store_settings.template_selection.landing` is `landing-noir`, so the Noir
  homepage is active immediately after restore — no preview flag needed.
- The five product images are five filenames pointing at identical image
  content. That is inherited from the demo data, not a packaging error.
- Regenerate this seed after changing demo content; `data.sql` is generated
  output, not a file to hand-edit.
