# paulasquin.com

Home page of Paul Asquin: the freelance AI activity (AI Diligence), the career (Acolad, Ocus, AIVE, Guardia, Baracoda, Meero — taken from the 2026 CV; ongoing confidential assignments are deliberately left out) and the projects, each linking to its own showcase site — [ionic.paulasquin.com](https://ionic.paulasquin.com), [suwave.paulasquin.com](https://suwave.paulasquin.com), Alveo (site to come) — plus the Revela and Siflo apps and talks/press. French and English, language picked automatically.

Static site, no build step: three.js 0.186 via an import map, GSAP 3.15 (ScrollTrigger) and Lenis from jsDelivr.

```bash
python3 -m http.server 8795 --bind 127.0.0.1   # http://127.0.0.1:8795/  (?debug exposes window.__field, ?lang=en forces English)
```

## Structure

- `index.html`, `css/style.css` — page and styles. French text is the default, tagged `data-i18n`.
- `js/strings.js` — the English of the tagged elements; `js/i18n.js` applies it (from `paulasquin/showcase-kit`).
- `js/field.js` — one particle field (WebGL points) shared by the page. Each section names a shape (`data-shape`) and the side of the screen it sits on (`data-side`: -1, 0, 1); the particles fly from shape to shape. Shapes: `orb` (hero), `net` (neural network with a forward pass), `galaxy`, `ion` (gridded thruster and its plume), `wave` (the SUWAVE flying wing over a lake), `lung` (bronchial tree and lobes coloured like an EIT ventilation map), and for the career: `docs` (Acolad: pages and translation arcs), `patches` (Ocus: a photo cut into ViT patches), `film` (AIVE: a film strip on a curved screen and its soundtrack), `pool` (Guardia: pool, camera cone, adult and child), `skin` (Baracoda: skin cells, a lesion under UV, a scanning ring), `lens` (Meero: an aperture with straight blades). Per-particle animation (plume, waves, breathing, orbits) runs in the vertex shader from a "kind" packed in `w`.
- `js/main.js` — smooth scroll, reveals, counters, timeline, nav, pointer effects, boot.
- `assets/img/` — previews taken from the project sites; `assets/og.jpg` is a capture of the hero.

## Adding a project

Add a `<section class="scene project" data-shape="…" data-side="±1" style="--accent:…;--accent2:…">` with its card, its English strings in `js/strings.js`, a timeline entry, and, if it needs one, a new shape builder in `js/field.js` (`BUILDERS` and `VIEW`). Every shape must fill exactly `n` particles.

## Deployment

GitHub Pages, `main` branch, repository root; the domain is declared by `CNAME`. DNS at OVH: apex `A`/`AAAA` records to GitHub Pages, `www` CNAME to `paulasquin.github.io.` — set by `tools/ovh_dns.py` (`bws-env run ovh -- uv run -q --with ovh python -I tools/ovh_dns.py`). Once the certificate is `approved` (`gh api repos/paulasquin/paulasquin-site/pages --jq .https_certificate.state`), enforce HTTPS: `gh api -X PUT repos/paulasquin/paulasquin-site/pages -F https_enforced=true`.

Particles are written premultiplied (alpha = brightest channel) with One/One blending, so they add light over the CSS background of the page.
