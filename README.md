# Noon Candles — Shopify theme

A custom Online Store 2.0 theme for **Noon Candles**. It runs on Shopify, so products, collections, cart, checkout, customers, orders, discounts and newsletter sign-ups all come from the Shopify admin. There is no separate backend.

## Brand

| Token | Hex | Use |
|---|---|---|
| Cherry Red | `#4B0B19` | Primary, text, buttons, footer |
| Natural White | `#F0EDE6` | Page background |
| Whipped Cream | `#F8EED5` | Soft panels, cart summary |
| Matcha Green | `#BED698` | Accents, badges, highlights |

The colours can be edited in **Theme settings → Brand colours**.

Logo files are in `brand/svg/` (vector, traced from `brand/source/logo-original.jpg`):

- `noon-logo.svg` / `-white`: stacked mark and wordmark
- `noon-logo-horizontal.svg` / `-white`: header lockup
- `noon-mark.svg` / `-white`: the ن vessel with the flame (the flame is the dot of the letter)
- `noon-wordmark.svg`
- `noon-favicon.svg`, plus PNG exports in `brand/png/`

In the theme, the logo is inlined through `snippets/logo.liquid`, so it follows CSS `color`. Its parts have classes for animation: `.noon-vessel`, `.noon-flame`, `.noon-flame-main`, `.noon-flame-inner`, `.noon-sparkle-l`, `.noon-sparkle-r` and `.noon-wordmark`.

Fonts: **Fraunces** (soft, retro display serif) and **DM Sans** (body), both from Google Fonts.

## Structure

```
layout/      theme.liquid, password.liquid
templates/   JSON templates (home, product, collection, cart, search, pages, blog, customers/*)
sections/    hero, usp-stats, featured-collection (tabs), image-with-text (counters),
             process, reels, testimonials, newsletter, collection-list, rich-text,
             header, announcement-bar, footer, cart-drawer, main-* page sections
snippets/    logo, icon, product-card, price, cart-items, shipping-bar, address-form, …
assets/      base.css, theme.js (vanilla JS, AJAX cart), favicon.svg
config/      settings_schema.json, settings_data.json
locales/     en.default.json
brand/       logo source and exports (not uploaded to Shopify; see .shopifyignore)
```

## Features

- Sticky header with dropdown menus, a mobile drawer and a search overlay
- AJAX cart drawer with a free-shipping progress bar, gift note, and quantity and remove controls
- Product page with a gallery, variant picker (server-rendered price), quantity, dynamic checkout buttons, inventory status, scent-note chips (tag products `note:Vanilla`), candle facts and accordions
- Collection page with Shopify filters (Search & Discovery), sorting and pagination
- Customer login, registration, account, order history, addresses, activation and password reset
- Newsletter forms that create Shopify customers tagged `newsletter`
- Scroll reveals, a letter-by-letter headline reveal, animated counters, a marquee and a reels carousel. All motion respects `prefers-reduced-motion`.

## Develop

```powershell
shopify theme dev --store nooncandles.myshopify.com
```

```powershell
shopify theme check
```

```powershell
shopify theme push --unpublished --store nooncandles.myshopify.com
```

You can also connect this GitHub repo in **Online Store → Themes → Add theme → Connect from GitHub**. The theme files are at the repo root.

## Store setup checklist

1. **Navigation**: create `main-menu` (for example Shop, Gift sets, About, Contact) and a `footer` menu (Shipping, Returns, FAQ, Contact).
2. **Collections**: assign collections to the homepage *Product tabs* blocks in the theme editor.
3. **Products**: tag products `new` for the New badge and `note:<scent>` for scent chips.
4. **Pages**: create *Contact* using the `page.contact` template.
5. **Filters**: install Search & Discovery and add filters such as price, availability and product type.
