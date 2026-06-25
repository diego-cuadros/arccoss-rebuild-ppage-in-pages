# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A **Shopify theme** for Arccos Golf, based on the "Concept" theme by RoarTheme and customized by Third and Grove (`config/settings_schema.json` → `theme_info`). It is plain Liquid/JS/CSS with **no build step** — there is no `package.json`, bundler, or compile stage. The `assets/*.js` and `assets/*.css` files are committed and served as-is. There is no git repo here either; this is a working copy of theme files.

## Development workflow

Theme files are edited directly and synced to Shopify via the Shopify CLI. There are two storefronts driven from this one codebase, switched on by domain (see Multi-region below):

- `arccos-dev.myshopify.com` — US store
- `arccos-golf-uk.myshopify.com` — UK store

Common commands (Shopify CLI must be installed and authenticated separately):

```bash
shopify theme dev        # local dev server with hot reload against a store
shopify theme check      # lint Liquid (Theme Check); inline disables use {% # theme-check-disable RuleName %}
shopify theme pull       # pull live theme settings/templates down
shopify theme push       # push local changes to a theme
```

There is no automated test suite. Verification is manual in the storefront / theme editor.

## Architecture

Standard Shopify theme layout: `layout/`, `templates/`, `sections/`, `snippets/`, `assets/`, `config/`, `locales/`. The pieces below are what require reading multiple files to understand.

### JS is one monolith of Web Components

Nearly all interactive behavior lives in `assets/theme.js` (~108 `customElements.define(...)` registrations — e.g. `cart-count`, `menu-drawer`, `modal-element`, `quantity-input`, `product-recommendations`, `sticky-header`). Sections/snippets render these custom-element tags; the logic is attached by the matching class in `theme.js`. When changing component behavior, find the custom element name in the Liquid, then locate its class in `theme.js` — don't expect per-section JS files.

- Global state hangs off `window.theme` (config, settings, helpers like `theme.DOMready`).
- Feature-specific scripts are split out as separate assets loaded per-template: `cart.js`, `collection.js`, `search.js`, `product-bundle.js`, `customer.js`, etc.
- Script load order in `layout/theme.liquid` head: `vendor.js` → `theme.js` → `analytics-events.js` (all `defer`), plus `instant-page.js` as a low-priority module.
- `vendor.js`, `swiper.min.js`, `photoswipe.min.js` are third-party libs — don't hand-edit.

### Custom analytics layer

`assets/analytics-events.js` is a project-specific (non-theme-vendor) layer that publishes events to GTM via `Shopify.analytics.publish('gtmEvent', {...})` (e.g. `email_signup`). When adding tracking, follow this pattern rather than calling `dataLayer.push` directly. GTM itself (`GTM-PTVV5CS2`) and Google Consent Mode (`gcm-integration-script.liquid`) are wired in `layout/theme.liquid`.

### Multi-region store handling

`layout/theme.liquid` branches on `shop.permanent_domain` to render `theme-scripts--us.liquid` or `theme-scripts--uk.liquid`. These snippets hold store-specific third-party tracking (Heatmap.com, Hotjar, GA client-id syncing, etc.) that differs between US and UK. **Region-specific scripts go in these two snippets, not inline in `theme.liquid`.** `geolizr-discount-redirect.liquid` handles geo-based discount redirects.

### Replo landing pages

Many marketing pages are built with the **Replo** page builder, not hand-authored Liquid. These are recognizable by:

- `templates/page.replo.<uuid>.liquid` templates
- `snippets/reploChunk.<uuid>.<n>.liquid` (Replo's chunked output)
- `snippets/replo-head.liquid` (rendered first in `<head>`)

**Do not hand-edit Replo-generated files** — they are machine-generated and will be overwritten by Replo. Edit those pages in the Replo app instead.

### Templates use JSON (Online Store 2.0)

Most templates are `.json` (section groups composed in the theme editor), with many named variants per resource — `product.smart-sensors.json`, `collection.rangefinders.json`, `index.preset-harmony.json`, etc. — selected per product/collection/page in the Shopify admin. A handful remain `.liquid` (e.g. `gift_card.liquid`, the Replo pages). `sections/header-group.json` and `sections/footer-group.json` define the shared header/footer section groups.

### Localization

`locales/` holds ~38 storefront locales plus `*.schema.json` files for theme-editor labels. `en.default.json` is the source of truth. UI strings in Liquid use the `t` filter (e.g. `'general.meta.tags' | t`); add keys to the locale files rather than hardcoding copy.

## Conventions

- CSS is per-feature, loaded alongside its template (`cart.css`, `search.css`, `product-bundle.css`, …). `theme.css` is the global stylesheet; CSS custom properties are emitted by `snippets/css-variables.liquid` and `rtl.css` handles right-to-left.
- RTL is a first-class concern (`theme.config.rtl`, `dir` attribute via `snippets/direction.liquid`) — keep layout changes RTL-safe.
- Suppress Theme Check warnings inline with `{% # theme-check-disable RuleName %}` … `{% # theme-check-enable RuleName %}` rather than globally.
