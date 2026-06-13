/* ============================================================
   ChinaRoom — interactions & animations
   GSAP + ScrollTrigger, vanilla JS
   ============================================================ */

(function () {
  'use strict';

  document.documentElement.classList.add('js');

  var hasGsap = typeof gsap !== 'undefined';
  if (hasGsap && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
  }

  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ================= Preloader ================= */
  var preloader = document.getElementById('preloader');

  function hidePreloader() {
    if (!preloader) return;
    preloader.classList.add('is-done');
    document.body.style.overflow = '';
    startHeroAnimation();
  }

  document.body.style.overflow = 'hidden';
  window.addEventListener('load', function () {
    setTimeout(hidePreloader, prefersReduced ? 0 : 1400);
  });
  // Safety: never block longer than 3.5s (slow CDN etc.)
  setTimeout(hidePreloader, 3500);

  /* ================= Custom cursor ================= */
  var cursor = document.getElementById('cursor');
  var follower = document.getElementById('cursorFollower');
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  if (cursor && follower && finePointer && hasGsap && !prefersReduced) {
    var cx = 0, cy = 0, fx = 0, fy = 0;
    window.addEventListener('mousemove', function (e) {
      cx = e.clientX; cy = e.clientY;
      gsap.set(cursor, { x: cx, y: cy });
    });
    gsap.ticker.add(function () {
      fx += (cx - fx) * 0.12;
      fy += (cy - fy) * 0.12;
      gsap.set(follower, { x: fx, y: fy });
    });
    document.querySelectorAll('a, button, .product-card, .cat-card, summary').forEach(function (el) {
      el.addEventListener('mouseenter', function () { follower.classList.add('is-hover'); });
      el.addEventListener('mouseleave', function () { follower.classList.remove('is-hover'); });
    });
  } else {
    if (cursor) cursor.style.display = 'none';
    if (follower) follower.style.display = 'none';
  }

  /* ================= Header on scroll ================= */
  var header = document.getElementById('header');
  function onScrollHeader() {
    if (!header) return;
    header.classList.toggle('is-scrolled', window.scrollY > 40);
  }
  window.addEventListener('scroll', onScrollHeader, { passive: true });
  onScrollHeader();

  /* ================= Mobile menu ================= */
  var burger = document.getElementById('burger');
  var mobileMenu = document.getElementById('mobileMenu');

  function closeMenu() {
    if (!burger || !mobileMenu) return;
    burger.classList.remove('is-active');
    burger.setAttribute('aria-expanded', 'false');
    mobileMenu.classList.remove('is-open');
    mobileMenu.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  if (burger && mobileMenu) {
    burger.addEventListener('click', function () {
      var open = mobileMenu.classList.toggle('is-open');
      burger.classList.toggle('is-active', open);
      burger.setAttribute('aria-expanded', String(open));
      mobileMenu.setAttribute('aria-hidden', String(!open));
      document.body.style.overflow = open ? 'hidden' : '';
    });
    mobileMenu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', closeMenu);
    });
  }

  /* ================= Hero entrance ================= */
  var heroPlayed = false;
  function startHeroAnimation() {
    if (heroPlayed) return;
    heroPlayed = true;

    var lines = document.querySelectorAll('.hero__line > span');
    if (!lines.length) return;

    if (hasGsap && !prefersReduced) {
      gsap.to(lines, {
        y: 0,
        duration: 1.2,
        ease: 'power4.out',
        stagger: 0.13,
        delay: 0.1
      });
      var heroReveal = document.querySelectorAll('.hero [data-reveal], .page-hero [data-reveal], .hero__kicker');
      gsap.to(heroReveal, {
        opacity: 1,
        y: 0,
        duration: 1,
        ease: 'power3.out',
        stagger: 0.12,
        delay: 0.55
      });
    } else {
      lines.forEach(function (s) { s.style.transform = 'none'; });
      document.querySelectorAll('.hero [data-reveal], .page-hero [data-reveal]').forEach(function (el) {
        el.style.opacity = '1';
        el.style.transform = 'none';
      });
    }
  }

  /* ================= Scroll reveal ================= */
  function setupReveals() {
    var items = Array.prototype.filter.call(
      document.querySelectorAll('[data-reveal]'),
      function (el) { return !el.closest('.hero') && !el.closest('.page-hero'); }
    );

    if (hasGsap && typeof ScrollTrigger !== 'undefined' && !prefersReduced) {
      items.forEach(function (el) {
        gsap.to(el, {
          opacity: 1,
          y: 0,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 88%',
            once: true
          }
        });
      });
    } else {
      // IntersectionObserver fallback
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.style.transition = 'opacity .8s ease, transform .8s ease';
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'none';
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12 });
      items.forEach(function (el) { io.observe(el); });
    }
  }
  setupReveals();

  /* ================= Split-word title animation ================= */
  if (hasGsap && typeof ScrollTrigger !== 'undefined' && !prefersReduced) {
    document.querySelectorAll('[data-split]').forEach(function (title) {
      // wrap each word
      var walk = function (node) {
        Array.prototype.slice.call(node.childNodes).forEach(function (child) {
          if (child.nodeType === 3) {
            var frag = document.createDocumentFragment();
            child.textContent.split(/(\s+)/).forEach(function (part) {
              if (/^\s+$/.test(part) || part === '') {
                frag.appendChild(document.createTextNode(part));
              } else {
                var w = document.createElement('span');
                w.className = 'word';
                var inner = document.createElement('span');
                inner.textContent = part;
                w.appendChild(inner);
                frag.appendChild(w);
              }
            });
            node.replaceChild(frag, child);
          } else if (child.nodeType === 1) {
            walk(child);
          }
        });
      };
      walk(title);

      var spans = title.querySelectorAll('.word > span');
      gsap.set(spans, { yPercent: 110 });
      gsap.to(spans, {
        yPercent: 0,
        duration: 1,
        ease: 'power4.out',
        stagger: 0.045,
        scrollTrigger: {
          trigger: title,
          start: 'top 85%',
          once: true
        }
      });
    });
  }

  /* ================= Parallax ================= */
  if (hasGsap && typeof ScrollTrigger !== 'undefined' && !prefersReduced) {
    document.querySelectorAll('[data-parallax] img').forEach(function (img) {
      gsap.to(img, {
        yPercent: 14,
        ease: 'none',
        scrollTrigger: {
          trigger: img.closest('section') || img,
          start: 'top top',
          end: 'bottom top',
          scrub: true
        }
      });
    });

    document.querySelectorAll('[data-parallax-img]').forEach(function (wrap) {
      gsap.fromTo(wrap, { y: 40 }, {
        y: -40,
        ease: 'none',
        scrollTrigger: {
          trigger: wrap,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1
        }
      });
    });

    /* Gallery horizontal drift */
    var strip = document.querySelector('[data-gallery-strip]');
    if (strip) {
      var drift = function () {
        var amount = Math.max(0, strip.scrollWidth - window.innerWidth + 56);
        return -amount;
      };
      gsap.to(strip, {
        x: drift,
        ease: 'none',
        scrollTrigger: {
          trigger: strip.closest('section'),
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1.2,
          invalidateOnRefresh: true
        }
      });
    }

    /* Process line fill */
    var processLine = document.querySelector('[data-process-line] span');
    if (processLine) {
      gsap.to(processLine, {
        width: '100%',
        ease: 'none',
        scrollTrigger: {
          trigger: '.process__track',
          start: 'top 75%',
          end: 'bottom 60%',
          scrub: 1
        }
      });
    }
  }

  /* ================= Counters ================= */
  function animateCounter(el) {
    var target = parseInt(el.getAttribute('data-counter'), 10) || 0;
    if (hasGsap && !prefersReduced) {
      var obj = { v: 0 };
      gsap.to(obj, {
        v: target,
        duration: 1.8,
        ease: 'power2.out',
        onUpdate: function () { el.textContent = Math.round(obj.v); }
      });
    } else {
      el.textContent = target;
    }
  }
  var counterIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        counterIO.unobserve(entry.target);
      }
    });
  }, { threshold: 0.6 });
  document.querySelectorAll('[data-counter]').forEach(function (el) { counterIO.observe(el); });

  /* ================= Magnetic buttons ================= */
  if (finePointer && hasGsap && !prefersReduced) {
    document.querySelectorAll('[data-magnetic]').forEach(function (btn) {
      btn.addEventListener('mousemove', function (e) {
        var r = btn.getBoundingClientRect();
        var x = e.clientX - r.left - r.width / 2;
        var y = e.clientY - r.top - r.height / 2;
        gsap.to(btn, { x: x * 0.22, y: y * 0.32, duration: 0.4, ease: 'power3.out' });
      });
      btn.addEventListener('mouseleave', function () {
        gsap.to(btn, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
      });
    });
  }

  /* ================= Tilt on category cards ================= */
  if (finePointer && hasGsap && !prefersReduced) {
    document.querySelectorAll('[data-tilt]').forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect();
        var rx = ((e.clientY - r.top) / r.height - 0.5) * -4;
        var ry = ((e.clientX - r.left) / r.width - 0.5) * 4;
        gsap.to(card, { rotateX: rx, rotateY: ry, transformPerspective: 900, duration: 0.5, ease: 'power2.out' });
      });
      card.addEventListener('mouseleave', function () {
        gsap.to(card, { rotateX: 0, rotateY: 0, duration: 0.8, ease: 'elastic.out(1, 0.5)' });
      });
    });
  }

  /* ================= Spotlight on advantage cards ================= */
  document.querySelectorAll('.adv-card').forEach(function (card) {
    card.addEventListener('mousemove', function (e) {
      var r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  /* ================= Catalog filters ================= */
  var filterBtns = document.querySelectorAll('.filter-btn');
  var grid = document.getElementById('productsGrid');
  var countEl = document.getElementById('catalogCount');

  function applyFilter(filter) {
    if (!grid) return;
    var cards = grid.querySelectorAll('.product-card');
    var visible = 0;

    cards.forEach(function (card) {
      var match = filter === 'all' || card.getAttribute('data-category') === filter;
      if (match) visible++;
      if (hasGsap && !prefersReduced) {
        if (match) {
          card.classList.remove('is-hidden');
          gsap.fromTo(card,
            { opacity: 0, y: 30, scale: 0.97 },
            { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: 'power3.out', delay: 0.05 * visible, overwrite: true }
          );
        } else {
          gsap.killTweensOf(card);
          card.classList.add('is-hidden');
        }
      } else {
        card.classList.toggle('is-hidden', !match);
        card.style.opacity = match ? '1' : '';
        card.style.transform = 'none';
      }
    });

    if (countEl) countEl.textContent = visible;
    if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
  }

  if (filterBtns.length && grid) {
    filterBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        filterBtns.forEach(function (b) {
          b.classList.remove('filter-btn--active');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('filter-btn--active');
        btn.setAttribute('aria-selected', 'true');
        applyFilter(btn.getAttribute('data-filter'));
      });
    });

    // Deep links: catalog.html#kitchens etc.
    var hash = window.location.hash.replace('#', '');
    if (hash) {
      var target = Array.prototype.find.call(filterBtns, function (b) {
        return b.getAttribute('data-filter') === hash;
      });
      if (target) target.click();
    }
  }

  /* ================= Order modal ================= */
  var modal = document.getElementById('orderModal');
  var modalProduct = document.getElementById('modalProduct');
  var modalSuccess = document.getElementById('modalSuccess');

  function openModal(productName) {
    if (!modal) return;
    if (modalProduct) modalProduct.textContent = productName ? 'Товар: ' + productName : '';
    if (modalSuccess) modalSuccess.classList.remove('is-visible');
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    var firstInput = modal.querySelector('input');
    if (firstInput) setTimeout(function () { firstInput.focus(); }, 350);
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  document.addEventListener('click', function (e) {
    var orderBtn = e.target.closest('.js-order');
    if (orderBtn) {
      openModal(orderBtn.getAttribute('data-product') || '');
      return;
    }
    if (e.target.closest('[data-modal-close]')) closeModal();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeModal(); closeMenu(); }
  });

  /* ================= Forms ================= */
  function bindForm(formId, successId) {
    var form = document.getElementById(formId);
    var success = document.getElementById(successId);
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var valid = true;
      form.querySelectorAll('[required]').forEach(function (input) {
        var empty = !input.value.trim();
        input.classList.toggle('is-error', empty);
        if (empty) valid = false;
      });
      var phone = form.querySelector('input[type="tel"]');
      if (phone && phone.value.trim()) {
        var digits = phone.value.replace(/\D/g, '');
        if (digits.length < 10) {
          phone.classList.add('is-error');
          valid = false;
        }
      }
      if (!valid) return;

      // Здесь подключите отправку: fetch('/api/lead', {...}) / Telegram-бот / CRM
      if (success) success.classList.add('is-visible');
      form.querySelectorAll('input, textarea').forEach(function (i) { i.value = ''; });

      setTimeout(function () {
        if (success) success.classList.remove('is-visible');
        if (formId === 'modalForm') closeModal();
      }, 3500);
    });

    form.querySelectorAll('input, textarea').forEach(function (input) {
      input.addEventListener('input', function () { input.classList.remove('is-error'); });
    });
  }
  bindForm('ctaForm', 'formSuccess');
  bindForm('modalForm', 'modalSuccess');

  /* ================= Floating messenger button ================= */
  (function () {
    if (document.querySelector('.msg-fab')) return;
    var wrap = document.createElement('div');
    wrap.className = 'msg-fab';
    wrap.innerHTML =
      '<a class="msg-fab__btn msg-fab__btn--wa" href="https://wa.me/78352000000?text=%D0%97%D0%B4%D1%80%D0%B0%D0%B2%D1%81%D1%82%D0%B2%D1%83%D0%B9%D1%82%D0%B5!%20%D0%98%D0%BD%D1%82%D0%B5%D1%80%D0%B5%D1%81%D1%83%D0%B5%D1%82%20%D0%BC%D0%B5%D0%B1%D0%B5%D0%BB%D1%8C%20%D0%B8%D0%B7%20%D0%9A%D0%B8%D1%82%D0%B0%D1%8F" target="_blank" rel="noopener" aria-label="Написать в WhatsApp"><svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="M12 0a12 12 0 0 0-10.4 18L0 24l6.2-1.6A12 12 0 1 0 12 0Zm0 22a10 10 0 0 1-5.1-1.4l-.4-.2-3.7 1 1-3.6-.2-.4A10 10 0 1 1 12 22Zm5.5-7.5c-.3-.2-1.8-.9-2-1s-.5-.2-.7.1-.8 1-.9 1.2-.3.2-.6.1a8.2 8.2 0 0 1-2.4-1.5 9 9 0 0 1-1.7-2.1c-.2-.3 0-.5.1-.6l.5-.5a2 2 0 0 0 .3-.5.6.6 0 0 0 0-.5c0-.2-.7-1.7-1-2.3s-.5-.5-.7-.5h-.6a1.1 1.1 0 0 0-.8.4 3.4 3.4 0 0 0-1 2.5 5.9 5.9 0 0 0 1.2 3.1 13.4 13.4 0 0 0 5.1 4.5 17.2 17.2 0 0 0 1.7.6 4.1 4.1 0 0 0 1.9.1 3.1 3.1 0 0 0 2-1.4 2.5 2.5 0 0 0 .2-1.4c-.1-.1-.3-.2-.6-.3Z"/></svg></a>' +
      '<a class="msg-fab__btn msg-fab__btn--tg" href="https://t.me/chinaroom" target="_blank" rel="noopener" aria-label="Написать в Telegram"><svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="M11.94 0A12 12 0 1 0 24 12 12 12 0 0 0 11.94 0Zm5.87 8.16-1.97 9.3c-.15.66-.54.82-1.09.51l-3-2.21-1.45 1.4a.76.76 0 0 1-.6.29l.21-3.05 5.56-5.02c.24-.21-.05-.33-.37-.12l-6.87 4.33-2.96-.93c-.64-.2-.66-.64.14-.95l11.57-4.46c.53-.2 1 .12.83.91Z"/></svg></a>';
    document.body.appendChild(wrap);
  })();

  /* ================= File input filename display ================= */
  document.querySelectorAll('input[type="file"]').forEach(function (input) {
    input.addEventListener('change', function () {
      var label = input.closest('.form__file');
      var txt = label && label.querySelector('.form__file-text');
      if (!txt) return;
      if (input.files && input.files.length) {
        txt.textContent = input.files.length === 1 ? input.files[0].name : 'Файлов: ' + input.files.length;
        label.classList.add('is-filled');
      } else {
        txt.textContent = 'Прикрепить фото или дизайн-проект';
        label.classList.remove('is-filled');
      }
    });
  });

  /* ================= Smooth anchor offset ================= */
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var id = link.getAttribute('href');
      if (id.length < 2) return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      var top = target.getBoundingClientRect().top + window.scrollY - 90;
      window.scrollTo({ top: top, behavior: prefersReduced ? 'auto' : 'smooth' });
    });
  });

})();
