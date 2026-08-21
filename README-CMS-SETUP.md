# Harf-e-Raast CMS Setup

This version connects the existing frontend to Decap CMS without redesigning the frontend.

## Required structure

- `index.html` — existing premium frontend
- `cms-render.js` — CMS-to-frontend bridge
- `her-manifest.json` — list of CMS content files
- `generate-manifest.js` — regenerates manifest on each Netlify build
- `netlify.toml` — runs the manifest generator
- `admin/index.html` — Decap CMS loader
- `admin/config.yml` — Decap CMS configuration
- `_products/*.json` — existing sample products
- `_collections/*.json` — existing collections
- `_journal/*.json` — existing journal articles
- `_data/*.json` — existing site settings

Do not delete the `_products`, `_collections`, `_journal`, or `_data` folders.

After deployment, the CMS entries are editable from `/admin/`. Changes committed by Decap CMS are picked up by the next Netlify build, which regenerates `her-manifest.json`.
