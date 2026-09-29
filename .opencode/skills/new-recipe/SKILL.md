---
name: new-recipe
description: Use when adding or creating a new recipe on the Wok This Way site — e.g. "add a recipe for X", "new recipe", "write up this dish", "create a recipe page". Produces the markdown file in docs/_recipes/ with the correct front matter and JSON-LD, and verifies the Jekyll build.
---

# New Recipe

Add one recipe to the Wok This Way site. Everything downstream (the book-page
grid and the recipes index) is generated automatically from the file you create,
so the whole job is: **write one markdown file in `docs/_recipes/`, drop the
photo in `docs/images/`, then verify the build.**

## Step 1 — Collect the details

Get these from the user (ask if missing):

1. **Recipe name** — becomes the `title`.
2. **Photo** — a JPEG to drop into `docs/images/`. If the user hasn't provided
   one, tell them the image is required and wait, or use a placeholder name and
   flag it clearly at the end.
3. **Ingredients** — with both Metric and US columns (the site is
   Europe-first but US-friendly).
4. **Instructions** — ordered steps.
5. **A short one-line summary** (for `description`) and a **one-line caption**
   for under the photo.
6. Optional: a **tip/note** line.

## Step 2 — Create the file

Filename: kebab-case of the name, e.g. `suan-la-baicai.md` → lives at
`docs/_recipes/suan-la-baicai.md`. The URL becomes
`/wokthisway/recipes/suan-la-baicai/`.

The `layout: recipe` is applied automatically via the collection default in
`_config.yml` — do **not** set it in the file. Do **not** write the header, nav,
or footer (the `base` layout handles all of that). Do **not** hand-write the
polaroid image block (the `recipe` layout renders it from `image`/`caption`).

Use exactly this shape (mirror the existing
`docs/_recipes/creamy-kimchi-noodles.md`):

```markdown
---
title: <Recipe Name>
description: <One-line summary used in the meta description and JSON-LD>
date: <YYYY-MM-DD>
image: /images/<filename>.jpeg
caption: <One-line caption shown under the photo>
jsonld:
  "@context": https://schema.org
  "@type": Recipe
  name: <Recipe Name>
  author:
    "@type": Person
    name: "Trygve Falch"
  datePublished: <YYYY-MM-DD>
  image: /images/<filename>.jpeg
  description: <One-line summary>
  recipeIngredient:
    - <metric amount> <ingredient>
    - ...
  recipeInstructions:
    - <step one>
    - ...
---

<1-3 sentence intro in the author's voice — what the dish is, why it works,
a short practical note. This is the "bloggy" voice, not a data dump.>

**Note:** <optional: serves / portion note / key technique>

### Ingredients

| Metric | US  | Ingredient |
|--------|-----|------------|
| 200 g  | 7 oz | <ingredient> |
| 60 ml  | ¼ cup | <ingredient> |
| 1      |     | <ingredient, count> |

### Instructions

1. <step>
2. <step>

<p class="no-rice"><strong>Tip:</strong> <optional tip line></p>
```

### Front matter rules

- `title`, `description`, `date`, `image`, `caption` are the fields the
  collection grid and the recipe layout read. `image` must be an absolute
  path starting with `/images/`.
- `jsonld` is a nested YAML map that gets run through `| jsonify` in
  `_layouts/base.html`. Keep it valid YAML:
  - Quote any value containing a colon or that could be misread — that is why
    `"@context"`, `"@type"`, and `"@type": Person`/`name` are quoted.
  - `recipeIngredient` and `recipeInstructions` are YAML lists (one `- item`
    per line). Keep them consistent with the visible table/ol below.
- If you skip `jsonld` entirely, the page still builds (the `{% if page.jsonld %}`
  guard in the layout handles it), but you lose the Recipe structured data that
  powers rich search results. Include it by default.

### Body rules

- Keep the visible **Ingredients** table and **Instructions** ordered list in
  sync with the `jsonld` `recipeIngredient` / `recipeInstructions`.
- Metric-first, US in a second column, ingredient name in a third.
- Use the `<p class="no-rice">` wrapper for the trailing tip — it gets the
  highlighted "tip" styling. Drop that line if there's no tip.
- No HTML for the page chrome. You may use markdown headings (`###`), tables,
  ordered lists, `**bold**`, and `*italic*`.

## Step 3 — Add the image

Copy the photo into `docs/images/` using a kebab-case filename that matches the
`image:` front-matter path exactly (e.g. `/images/suan-la-baicai.jpeg`). If the
file is a `.jpg`, rename it to `.jpeg` to match the rest of the directory and
update the `image:` path to match.

## Step 4 — Verify the build

There is no CI. Build to a throwaway dir and confirm the recipe landed correctly:

```
jekyll build --source docs --dest /tmp/opencode/_site --quiet
```

Then check (adjust the slug to the new recipe):

```
# page exists at the collection permalink
ls /tmp/opencode/_site/wokthisway/recipes/<slug>/index.html
# layout + JSON-LD applied
grep -c "Wok This Way</h1>" /tmp/opencode/_site/wokthisway/recipes/<slug>/index.html   # expect 1
grep -o '"@type":"Recipe"' /tmp/opencode/_site/wokthisway/recipes/<slug>/index.html      # expect 1
# image is copied to the output
ls /tmp/opencode/_site/images/<filename>.jpeg
# new recipe appears in the book-page grid
grep -o 'href="/wokthisway/recipes/<slug>/"' /tmp/opencode/_site/wokthisway/index.html
```

If the recipe does not appear in the grid, the most common causes are:
the file is not under the underscored `_recipes/` collection dir, or the
`image`/`title` front matter is missing or misspelled.

## Step 5 — Report

Tell the user the file you created, the resulting URL, and that the grid
auto-updates. Do not commit or push unless asked. If you used a placeholder
image, say so explicitly.
