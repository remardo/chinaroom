# ChinaRoom — Shared Build Contracts

All lanes MUST follow this file. It guarantees consistent chrome, no duplicate
data flow, and no file collisions. Project root: `C:\Users\remardo\chinaroom`.
Flat static site (no build step). All pages live in root, links are relative
flat (e.g. `catalog.html`, `kitchens.html`).

## Brand / CSS
- Single stylesheet: `css/style.css` (dark premium theme). DO NOT edit it for
  per-lane component styles — create your own `css/<lane>.css` and link it only
  on the pages that need it. Reuse existing classes/vars where possible:
  - Colors via vars: `--bg --bg-soft --bg-card --gold --gold-soft --red --cream --text --text-muted --line`.
  - Components already styled: `.btn .btn--gold .btn--ghost .btn--small .btn--full`,
    `.section .section__label .section__title (em + [data-split]) .section__head .section__sub`,
    `.product-card` (+ `__media __badge __body __cat __title __row __price __old`),
    `.page-hero .page-hero__title .page-hero__sub .breadcrumbs`,
    `.cat-card`, `.review`, `.faq__item`, `.form .form__group`, `.modal`,
    `.catalog__filters .filter-btn .catalog__count`, `.page-gallery`, `.spec-list`.
  - Reveal animation: add `data-reveal` (fades up on scroll), `data-split` on titles,
    `data-magnetic` on buttons, `data-tilt` on cards. Handled by `js/main.js`.
- Fonts already loaded globally: Cormorant (display) + Manrope (body).

## Canonical <head> block (use on every NEW page; lanes D/E refresh existing)
```html
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{{PAGE TITLE — include "из Китая" + "ChinaRoom"}}</title>
<meta name="description" content="{{150-160 chars, keyword-rich}}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="https://china-room.ru/{{FILENAME}}">
<meta name="geo.region" content="RU-CU">
<meta name="geo.placename" content="Чебоксары">
<meta name="geo.position" content="56.1439;47.2489">
<meta name="ICBM" content="56.1439, 47.2489">
<meta property="og:type" content="website">
<meta property="og:locale" content="ru_RU">
<meta property="og:site_name" content="ChinaRoom — Китайская Комната">
<meta property="og:title" content="{{OG TITLE}}">
<meta property="og:description" content="{{OG DESC}}">
<meta property="og:url" content="https://china-room.ru/{{FILENAME}}">
<meta property="og:image" content="https://china-room.ru/img/interiors/{{IMG}}.jpg">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/svg+xml" href="favicon.svg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant:wght@400;500;600;700&family=Manrope:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="css/style.css">
<!-- plus your own <link rel="stylesheet" href="css/<lane>.css"> if needed -->
<!-- plus relevant JSON-LD (BreadcrumbList + page type) -->
```

## Canonical SCRIPTS block (bottom of <body>, every page) — self-hosted + deferred
```html
<script defer src="js/vendor/gsap.min.js"></script>
<script defer src="js/vendor/ScrollTrigger.min.js"></script>
<script defer src="js/main.js"></script>
```
GSAP/ScrollTrigger are now LOCAL in `js/vendor/`. Never reference the jsdelivr CDN again.
`js/main.js` already guards for `typeof gsap`/`ScrollTrigger` so `defer` order is safe.

## Canonical HEADER (use verbatim on every NEW page; lanes D/E replace existing headers with this)
Includes messenger CTAs with PREFILLED text (task 1.3) and new nav items (Проекты, Блог).
```html
<header class="header" id="header">
  <div class="container header__inner">
    <a href="index.html" class="logo" aria-label="ChinaRoom — на главную">
      <svg class="logo__mark" viewBox="0 0 64 64" width="40" height="40" aria-hidden="true"><circle cx="32" cy="32" r="29" fill="none" stroke="currentColor" stroke-width="3"/><path d="M20 20h24M20 32h24M20 44h24M26 20v24M38 20v24" stroke="currentColor" stroke-width="3" fill="none"/></svg>
      <span class="logo__text">China Room<small>Китайская Комната</small></span>
    </a>
    <nav class="nav" id="nav" aria-label="Основная навигация">
      <a href="catalog.html" class="nav__link">Каталог</a>
      <a href="projects.html" class="nav__link">Проекты</a>
      <a href="index.html#process" class="nav__link">Как мы работаем</a>
      <a href="blog.html" class="nav__link">Блог</a>
      <a href="index.html#reviews" class="nav__link">Отзывы</a>
      <a href="index.html#contacts" class="nav__link">Контакты</a>
    </nav>
    <div class="header__actions">
      <a href="tel:+78352000000" class="header__phone">+7 (835) 200-00-00</a>
      <a href="https://t.me/chinaroom" class="header__icon" aria-label="Telegram" rel="noopener" target="_blank"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M11.94 0A12 12 0 1 0 24 12 12 12 0 0 0 11.94 0Zm5.87 8.16-1.97 9.3c-.15.66-.54.82-1.09.51l-3-2.21-1.45 1.4a.76.76 0 0 1-.6.29l.21-3.05 5.56-5.02c.24-.21-.05-.33-.37-.12l-6.87 4.33-2.96-.93c-.64-.2-.66-.64.14-.95l11.57-4.46c.53-.2 1 .12.83.91Z"/></svg></a>
      <a href="https://wa.me/78352000000?text=Здравствуйте!%20Интересует%20мебель%20из%20Китая%20под%20заказ" class="header__icon" aria-label="WhatsApp" rel="noopener" target="_blank"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 0a12 12 0 0 0-10.4 18L0 24l6.2-1.6A12 12 0 1 0 12 0Zm0 22a10 10 0 0 1-5.1-1.4l-.4-.2-3.7 1 1-3.6-.2-.4A10 10 0 1 1 12 22Zm5.5-7.5c-.3-.2-1.8-.9-2-1s-.5-.2-.7.1-.8 1-.9 1.2-.3.2-.6.1a8.2 8.2 0 0 1-2.4-1.5 9 9 0 0 1-1.7-2.1c-.2-.3 0-.5.1-.6l.5-.5a2 2 0 0 0 .3-.5.6.6 0 0 0 0-.5c0-.2-.7-1.7-1-2.3s-.5-.5-.7-.5h-.6a1.1 1.1 0 0 0-.8.4 3.4 3.4 0 0 0-1 2.5 5.9 5.9 0 0 0 1.2 3.1 13.4 13.4 0 0 0 5.1 4.5 17.2 17.2 0 0 0 1.7.6 4.1 4.1 0 0 0 1.9.1 3.1 3.1 0 0 0 2-1.4 2.5 2.5 0 0 0 .2-1.4c-.1-.1-.3-.2-.6-.3Z"/></svg></a>
      <button class="burger" id="burger" aria-label="Открыть меню" aria-expanded="false"><span></span><span></span><span></span></button>
    </div>
  </div>
</header>
<div class="mobile-menu" id="mobileMenu" aria-hidden="true">
  <nav class="mobile-menu__nav" aria-label="Мобильная навигация">
    <a href="catalog.html" class="mobile-menu__link">Каталог</a>
    <a href="projects.html" class="mobile-menu__link">Проекты</a>
    <a href="index.html#process" class="mobile-menu__link">Как мы работаем</a>
    <a href="blog.html" class="mobile-menu__link">Блог</a>
    <a href="index.html#reviews" class="mobile-menu__link">Отзывы</a>
    <a href="index.html#contacts" class="mobile-menu__link">Контакты</a>
  </nav>
  <div class="mobile-menu__footer">
    <a href="tel:+78352000000" class="mobile-menu__phone">+7 (835) 200-00-00</a>
    <p>Чебоксары · Доставка по всей России</p>
  </div>
</div>
```
NOTE: on `index.html` keep the existing anchor links (`#about` etc.) but ADD
`projects.html` and `blog.html` nav items and the prefilled WhatsApp text.

## Canonical FOOTER (use verbatim on every NEW page; lanes D/E keep existing but add Проекты/Блог links + regional links column)
The existing footer in index.html is the reference. Add to the "Компания" column:
`<a href="projects.html">Проекты</a>` and `<a href="blog.html">Блог</a>`.
Add a regional line in footer__bottom or geo block linking the regional landing pages
(see Lane C output: moskva.html, spb.html, kazan.html, nnovgorod.html, ekaterinburg.html).

## Messenger CTA convention (task 1.3) — reuse everywhere
- WhatsApp: `https://wa.me/78352000000?text=<URL-encoded RU greeting mentioning the page context>`
- Telegram: `https://t.me/chinaroom`
- A floating mobile messenger button is OWNED BY LANE D (added globally via js/main.js).
  Other lanes: do NOT add a floating button; just use inline wa.me links with prefilled text.

## IMAGES (local — task 0.4). NEVER hotlink Freepik again.
Interiors (`img/interiors/`): hero-living, kitchen-1..3, sofa-1..3, bedroom-1..3,
wardrobe-1..2, table-1..2, bathroom-1..2, light-1..2, interior-1..2 (.jpg).
Products (`img/products/`): p01.jpg … p40.jpg.
Reference as `img/interiors/<name>.jpg` / `img/products/pNN.jpg`. Always add
`width`/`height` or `loading="lazy"` (lazy on everything below the fold; the
LCP/hero image keeps `fetchpriority="high"` and NO lazy).

## products.json schema (OWNED BY LANE A — single source of truth for catalog + product pages)
File: `data/products.json`. Array of objects:
```json
{
  "id": "sofa-shanghai",            // slug, unique, used in product.html?id=
  "name": "Диван модульный «Шанхай»",
  "category": "sofas",              // one of: kitchens|sofas|bedrooms|wardrobes|tables|bathroom|light
  "categoryLabel": "Мягкая мебель",
  "price": 148000,                   // RUB int
  "oldPrice": 236000,                // RUB int or null
  "badge": "Хит",                   // "Хит" | "Новинка" | null
  "image": "img/products/p01.jpg",
  "gallery": ["img/products/p01.jpg", "img/interiors/sofa-1.jpg"],
  "short": "Итальянский дизайн, модульная конфигурация.",
  "specs": [["Материал","Велюр, массив"],["Размер","320×180 см"],["Срок","35–45 дней"]],
  "description": "2-4 предложения для страницы товара."
}
```
Categories MUST match the 7 category slugs above (same as existing
`data-category` filter values and category page filenames).
~100 products, ~14 per category, realistic RU furniture names + plausible RUB prices.

## Verification (all lanes)
No build/test harness. Verify by: (1) HTML well-formed, (2) open the page in a
browser mentally / check no broken local asset paths, (3) all `<img>` point to
existing local files, (4) scripts use the self-hosted deferred block,
(5) `node -e` JSON.parse for products.json validity.
```
