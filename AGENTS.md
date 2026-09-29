# AGENTS.md

Source for [falch.me](https://falch.me). A static site deployed via GitHub Pages
from the `docs/` directory. There is **no CI / no GitHub Actions** — a push to
`main` is deployed directly by GitHub Pages.

## How to build locally

There is no `Gemfile` in the repo. Jekyll is expected to be available on PATH.
Build to a throwaway dir (never write build output into the repo):

```
jekyll build --source docs --dest /tmp/<something>/_site
```

Verify a change by inspecting the generated files under that temp dir. If
`jekyll` isn't installed, `gem install jekyll` works.

## Layout

```
docs/
├── index.html              # Homepage — the hand-written Galaxian canvas game.
│                           # No Liquid. Do not restructure casually.
├── _config.yml             # Jekyll site data + the recipes collection
├── _layouts/
│   ├── base.html           # Shared chrome: header, nav, footer, JSON-LD block
│   └── recipe.html         # Recipe page wrapper (polaroid + title + content)
├── _recipes/               # One .md file per recipe (Jekyll collection)
├── wokthisway/
│   ├── index.md            # Book page + auto-generated recipe grid
│   ├── recipes/index.md    # Recipes index (also auto-generated grid)
│   ├── recommended-products/index.html   # static, hand-written
│   ├── css/style.css
│   └── js/nav.js           # shared mobile-nav behaviour
└── images/                 # recipe photos, book cover, favicons
```

## Conventions

- **Recipes live in `docs/_recipes/`** (note the leading underscore — that is
  what makes them a Jekyll collection, not plain pages). Each file is one recipe.
  The grid on the book page and the recipes index are **generated from the
  collection**, so you never edit a list by hand — just add the markdown file.
- Recipe URL = `/wokthisway/recipes/<slug>/` where `<slug>` is the filename
  without `.md` (kebab-case).
- **Adding a new recipe:** use the `new-recipe` skill. It has the full template,
  the JSON-LD requirements, and the build-verification steps.
- Shared header/nav/footer come from `_layouts/base.html`. Do not duplicate that
  markup into content files — pages should set `layout: base` (recipes get
  `layout: recipe` automatically via collection defaults in `_config.yml`).
- Site-wide data (title, author, email, Amazon URL) is in `_config.yml` under the
  top-level keys; reference it as `{{ site.amazon }}`, `{{ site.email }}`, etc.
- Keep external links (`target="_blank"`) with `rel="noopener"`.
- `wokthisway/recommended-products/index.html` is static HTML that reuses the
  wokthisway CSS and nav — edit it in place, it is not a layout.

## Things to be careful about

- The Galaxian game (`docs/index.html`) is a single self-contained file. Changing
  it risks breaking the game; there are no tests for it.
- The root `index.html` must stay Liquid-free — it is the one page that is pure
  static HTML and must survive the Jekyll build byte-for-byte.
