/* ============================================================
   ChinaRoom — catalog & product-detail rendering from data/products.json
   Works alongside js/main.js (which owns filtering, modal, reveals).
   ============================================================ */
(function () {
  'use strict';

  var grid = document.getElementById('productsGrid');
  var detail = document.getElementById('productDetail');
  if (!grid && !detail) return;

  var fmt = function (n) { return n.toLocaleString('ru-RU').replace(/,/g, ' ') + ' ₽'; };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
  }); };

  function load() {
    return fetch('data/products.json', { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('products.json ' + r.status);
      return r.json();
    });
  }

  /* ---------- Catalog card ---------- */
  function cardHTML(p) {
    var badge = p.badge
      ? '<span class="product-card__badge' + (p.badge === 'Новинка' ? ' product-card__badge--new' : '') + '">' + esc(p.badge) + '</span>'
      : '';
    var old = p.oldPrice ? '<span class="product-card__old">' + fmt(p.oldPrice) + '</span>' : '';
    var href = 'product.html?id=' + encodeURIComponent(p.id);
    return '' +
      '<article class="product-card" data-category="' + esc(p.category) + '" itemscope itemtype="https://schema.org/Product">' +
        '<a class="product-card__media" href="' + href + '" aria-label="' + esc(p.name) + '">' +
          '<img src="' + esc(p.image) + '" alt="' + esc(p.name) + ' — мебель из Китая под заказ" loading="lazy" width="740" height="574" itemprop="image">' +
          badge +
        '</a>' +
        '<div class="product-card__body">' +
          '<p class="product-card__cat">' + esc(p.categoryLabel) + '</p>' +
          '<h3 class="product-card__title"><a href="' + href + '" itemprop="name">' + esc(p.name) + '</a></h3>' +
          '<p class="product-card__desc">' + esc(p.short) + '</p>' +
          '<div class="product-card__row" itemprop="offers" itemscope itemtype="https://schema.org/Offer">' +
            '<meta itemprop="priceCurrency" content="RUB">' +
            '<span class="product-card__price" itemprop="price" content="' + p.price + '">' + fmt(p.price) + '</span>' +
            old +
            '<link itemprop="availability" href="https://schema.org/InStock">' +
          '</div>' +
          '<button class="btn btn--small btn--gold js-order" data-product="' + esc(p.name) + '">Запросить расчёт</button>' +
        '</div>' +
      '</article>';
  }

  function renderCatalog(products) {
    grid.innerHTML = products.map(cardHTML).join('');
    var countEl = document.getElementById('catalogCount');
    if (countEl) countEl.textContent = String(products.length);

    // Re-apply deep link (catalog.html#sofas) now that cards exist.
    var hash = window.location.hash.replace('#', '');
    if (hash) {
      var btn = document.querySelector('.filter-btn[data-filter="' + hash + '"]');
      if (btn) btn.click();
    }
  }

  /* ---------- Product detail ---------- */
  function getId() {
    var m = window.location.search.match(/[?&]id=([^&]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  }

  function injectJsonLd(p) {
    var data = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: p.name,
      image: p.gallery.map(function (g) { return 'https://china-room.ru/' + g; }),
      description: p.description,
      category: p.categoryLabel,
      brand: { '@type': 'Brand', name: 'ChinaRoom' },
      offers: {
        '@type': 'Offer', priceCurrency: 'RUB', price: p.price,
        availability: 'https://schema.org/InStock',
        url: 'https://china-room.ru/product.html?id=' + p.id
      }
    };
    var s = document.createElement('script');
    s.type = 'application/ld+json';
    s.textContent = JSON.stringify(data);
    document.head.appendChild(s);
  }

  function renderDetail(products) {
    var id = getId();
    var p = products.filter(function (x) { return x.id === id; })[0] || products[0];
    if (!p) { detail.innerHTML = '<div class="container"><p>Товар не найден.</p></div>'; return; }

    document.title = p.name + ' — мебель из Китая под заказ | ChinaRoom';
    var md = document.querySelector('meta[name="description"]');
    if (md) md.setAttribute('content', p.short + ' Доставка по России за 30–45 дней. ChinaRoom.');
    var canon = document.querySelector('link[rel="canonical"]');
    if (canon) canon.setAttribute('href', 'https://china-room.ru/product.html?id=' + p.id);
    injectJsonLd(p);

    var old = p.oldPrice ? '<span class="product-card__old">' + fmt(p.oldPrice) + '</span>' : '';
    var save = p.oldPrice ? '<span class="pd__save">−' + Math.round((1 - p.price / p.oldPrice) * 100) + '%</span>' : '';
    var thumbs = p.gallery.map(function (g, i) {
      return '<button class="pd__thumb' + (i === 0 ? ' is-active' : '') + '" data-src="' + esc(g) + '" aria-label="Фото ' + (i + 1) + '"><img src="' + esc(g) + '" alt="" loading="lazy"></button>';
    }).join('');
    var specs = (p.specs || []).map(function (s) {
      return '<li><span>' + esc(s[0]) + '</span><b>' + esc(s[1]) + '</b></li>';
    }).join('');

    detail.innerHTML = '' +
      '<div class="container">' +
        '<nav class="breadcrumbs" aria-label="Хлебные крошки">' +
          '<a href="index.html">Главная</a><span>/</span>' +
          '<a href="catalog.html">Каталог</a><span>/</span>' +
          '<a href="catalog.html#' + esc(p.category) + '">' + esc(p.categoryLabel) + '</a><span>/</span>' +
          '<span aria-current="page">' + esc(p.name) + '</span>' +
        '</nav>' +
        '<div class="pd">' +
          '<div class="pd__gallery">' +
            '<div class="pd__main"><img id="pdMain" src="' + esc(p.gallery[0]) + '" alt="' + esc(p.name) + '" width="900" height="700"></div>' +
            '<div class="pd__thumbs">' + thumbs + '</div>' +
          '</div>' +
          '<div class="pd__info">' +
            '<p class="product-card__cat">' + esc(p.categoryLabel) + '</p>' +
            '<h1 class="pd__title">' + esc(p.name) + '</h1>' +
            '<div class="pd__price-row"><span class="pd__price">' + fmt(p.price) + '</span>' + old + save + '</div>' +
            '<p class="pd__desc">' + esc(p.description) + '</p>' +
            '<ul class="spec-list pd__specs">' + specs + '</ul>' +
            '<button class="btn btn--gold btn--full js-order" data-product="' + esc(p.name) + '" data-magnetic>Запросить расчёт</button>' +
            '<p class="pd__note">Цена ориентировочная «под ключ» до Чебоксар. Точную стоимость с доставкой в ваш город рассчитаем за 15 минут.</p>' +
          '</div>' +
        '</div>' +
      '</div>';

    // Thumb switching
    var main = document.getElementById('pdMain');
    detail.querySelectorAll('.pd__thumb').forEach(function (t) {
      t.addEventListener('click', function () {
        main.src = t.getAttribute('data-src');
        detail.querySelectorAll('.pd__thumb').forEach(function (x) { x.classList.remove('is-active'); });
        t.classList.add('is-active');
      });
    });

    renderRelated(products, p);
  }

  function renderRelated(products, p) {
    var box = document.getElementById('relatedGrid');
    if (!box) return;
    var rel = products.filter(function (x) { return x.category === p.category && x.id !== p.id; }).slice(0, 4);
    box.innerHTML = rel.map(cardHTML).join('');
  }

  /* ---------- Boot ---------- */
  load().then(function (products) {
    if (grid) renderCatalog(products);
    if (detail) renderDetail(products);
  }).catch(function (err) {
    if (grid) grid.innerHTML = '<p style="color:var(--text-muted)">Не удалось загрузить каталог. Обновите страницу.</p>';
    if (detail) detail.innerHTML = '<div class="container"><p style="color:var(--text-muted)">Не удалось загрузить товар.</p></div>';
    if (window.console) console.error(err);
  });
})();
