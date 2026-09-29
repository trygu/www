# www

Source for [falch.me](https://falch.me). Deployed via GitHub Pages from the `docs/` directory.

## Structure

```
docs/
├── index.html              # Homepage — the Galaxian browser game
├── _config.yml             # Jekyll config (collections, site data)
├── _layouts/               # Shared base + recipe layouts
├── _recipes/               # One markdown file per recipe (a Jekyll collection)
├── wokthisway/             # "Wok This Way" book site
│   ├── index.md            # Book page + auto-generated recipe grid
│   ├── recommended-products/
│   ├── css/
│   └── js/
└── images/
```

## Adding a recipe

Create a markdown file in `docs/_recipes/` with front matter. The book page and
recipes index pick it up automatically on build.

```yaml
---
title: My Recipe
description: Short one-line summary.
date: 2026-01-01
image: /images/my-recipe.jpeg
caption: One-line caption under the photo.
---
```

Add the recipe photo to `docs/images/`. That's all — no manual HTML needed.
