# paulasquin.com

Home page of Paul Asquin: a short AI Diligence section, then the career and the projects mixed in one reverse-chronological sequence (a left-to-right timeline first, oldest to newest, ending with AI Diligence today): Alveo, Bivwak!, Ocus, Acolad, AIVE, Baracoda, Guardia, Meero, SUWAVE, ion thruster — taken from the 2026 CV; ongoing confidential assignments are deliberately left out. Showcase sites: [ionic.paulasquin.com](https://ionic.paulasquin.com), [suwave.paulasquin.com](https://suwave.paulasquin.com), Alveo (site to come). Then the Revela and Siflo apps and talks/press. French and English, language picked automatically.

**paulasquin.com and aidiligence.eu.** This site is the person: career, projects, talks. [aidiligence.eu](https://aidiligence.eu) ([paulasquin/aidiligence-website](https://github.com/paulasquin/aidiligence-website)) is the company side — AI project leadership, AI and MLOps engineering, AI due diligence, offered by Guardia SAS under the AI Diligence name — with its method, missions and products. Each fact lives on one site and the other links to it: the services are only summed up here (section `#ia`), the career only summed up there, linking to this page's anchors (`#bivwak`, `#alveo`, `#ocus`…, keep them stable). The four facts of the About card are the one deliberate duplicate. No content is shared at runtime: aidiligence.eu loads nothing from other domains (its legal notice says so).

Static site, no build step: three.js 0.186 via an import map, GSAP 3.15 (ScrollTrigger) and Lenis from jsDelivr.

```bash
python3 -m http.server 8795 --bind 127.0.0.1   # http://127.0.0.1:8795/  (?debug exposes window.__field, ?lang=en forces English)
```

## Structure

- `index.html`, `css/style.css` — page and styles. French text is the default, tagged `data-i18n`.
- `js/strings.js` — the English of the tagged elements; `js/i18n.js` applies it (from `paulasquin/showcase-kit`).
- `js/field.js` — one particle field (WebGL points) shared by the page. Each section names a shape (`data-shape`) and the side of the screen it sits on (`data-side`: -1, 0, 1); the particles fly from shape to shape. Shapes: `orb` (hero), `net` (neural network with a forward pass), `galaxy`, `ion` (gridded thruster and its plume), `wave` (the SUWAVE flying wing over a lake), `lung` (bronchial tree and lobes coloured like an EIT ventilation map), and for the career: `docs` (Acolad: pages and translation arcs), `patches` (Ocus: a photo cut into ViT patches), `film` (AIVE: a film strip on a curved screen and its soundtrack), `pool` (Guardia: pool, camera cone, adult and child), `skin` (Baracoda: skin cells, a lesion under UV, a scanning ring), `lens` (Meero: an aperture with straight blades), `agent` (Bivwak!: an agent core, its tools, orbiting documents, a cage). Per-particle animation (plume, waves, breathing, orbits) runs in the vertex shader from a "kind" packed in `w`.
- `js/main.js` — smooth scroll, reveals, counters, timeline, nav, pointer effects, boot.
- `assets/img/` — previews taken from the project sites; `assets/og.jpg` is a capture of the hero.

## Adding a project

Add a `<section class="scene exp" data-shape="…" data-side="±1" style="--accent:…;--accent2:…">` at its place in the reverse chronology (sides alternate; `data-side="-1"` goes with `wrap wrap-right`) with its card, its English strings in `js/strings.js`, a timeline entry, and, if it needs one, a new shape builder in `js/field.js` (`BUILDERS` and `VIEW`). Every shape must fill exactly `n` particles.

## Deployment

GitHub Pages, `main` branch, repository root; the domain is declared by `CNAME`: `paulasquin.com` (GitHub redirects www to it). On 2026-10-18 the certificate stayed at `new` for 10 hours with the apex as primary, then at `dns_changed` overnight with www as primary, despite correct DNS; the domain is verified at account level (github.com/settings/pages, TXT `_github-pages-challenge-paulasquin`, see `tools/ovh_txt.py`). If it sticks again: remove the custom domain, wait 15 minutes, re-add it. On 2026-10-19 the repository was renamed from `paulasquin-site` to `paulasquin.github.io` (user site) to get past that stuck state; the 2019 user site lives on as `paulasquin-website-2019`. DNS at OVH: apex `A`/`AAAA` records to GitHub Pages, `www` CNAME to `paulasquin.github.io.` — set by `tools/ovh_dns.py` (`bws-env run ovh -- uv run -q --with ovh python -I tools/ovh_dns.py`). Once the certificate is `approved` (`gh api repos/paulasquin/paulasquin.github.io/pages --jq .https_certificate.state`), enforce HTTPS: `gh api -X PUT repos/paulasquin/paulasquin.github.io/pages -F https_enforced=true`.

Particles are written premultiplied (alpha = brightest channel) with One/One blending, so they add light over the CSS background of the page.
