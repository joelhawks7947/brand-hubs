# Brand hubs

Interactive brand guides with a built-in post studio. One engine, one folder per brand.
Each brand builds to a single script that is embedded on that brand's own website and
served from this repo by jsDelivr.

## Brands

| Brand | Folder | Embedded on |
|---|---|---|
| Illawarra Hawks Foundation | `brands/foundation` | Shopify page on illawarrahawksfoundation.org.au |

## Layout

```
engine/                  shared code, no brand content
  hub.css                styles (rendered inside a shadow root)
  hub.js                 guide interactions and the post studio
  build.mjs              builds one brand's embed script
brands/<brand>/
  brand.config.json      name, mount id, font stylesheet, output file name
  brand-data.js          colours, approved pairings, logo colourways
  content.html           the page markup and brand copy
  logos.json             logo artwork as recolourable masks
  shopify-embed.liquid   the two lines that go on the host site
  dist/                  built files (committed, because jsDelivr serves them)
```

Brands never share files. A brand's folder can be lifted out into its own repo later.

For now `content.html` holds the page markup as well as the brand copy. When the second
brand is added, the shared markup moves into `engine/` and only the copy stays with the brand.

## Build

Needs Node 20 or later. There are no dependencies to install.

```
npm run build:foundation
```

This writes `brands/foundation/dist/brand-hub.js` and `dist/preview.html`.
Open `preview.html` in a browser to test. It mimics a host site with a sticky header
and deliberately ugly theme styles, to prove the hub is not affected by the page around it.

## Release

jsDelivr serves a tagged version of this repo. A tag never changes once published,
so every release needs a new version number.

1. Make the change, then run `npm run build:foundation`.
2. Bump `version` in `package.json`.
3. Commit, tag and push:
   ```
   git add -A
   git commit -m "Describe the change"
   git tag v1.0.1
   git push && git push --tags
   ```
4. In Shopify, change the version in the embed line (`@1.0.0` becomes `@1.0.1`).

To roll back, put the previous version number back in the embed line.

The repo must stay public for jsDelivr to serve it.

## Embed on Shopify

1. Create a page, for example with the handle `brand`.
2. In the theme editor, open that page's template and add a **Custom Liquid** section.
3. Paste the contents of `brands/foundation/shopify-embed.liquid`.
4. Set `data-top` to the height of the sticky header in pixels, or leave it at 0.

The hub is public to anyone with the page link. Keep it out of the menus while it is an MVP.

## What the hub does not do

- It never uploads photos. They are read in the visitor's browser only.
- It stores nothing and sets no cookies.
- It loads Libre Baskerville and Open Sans from Google Fonts.

## Outstanding

- The logos are 800 px placeholders taken from the brand draft PDF. Replace `logos.json`
  with artwork made from the vector files, then SVG downloads can be switched on.
- The script is about 400 KB, almost all of it the placeholder logo images.
  Vector artwork will bring that down sharply.

## Adding a brand

1. Copy `brands/foundation` to `brands/<new-brand>`.
2. Replace `brand-data.js`, `content.html`, `logos.json` and `brand.config.json`.
3. Add a `build:<new-brand>` script to `package.json`.
