/* Salon Beleza — comportements et mouvement.
   Principe : le site est complet sans JavaScript ; GSAP, ScrollTrigger et Lenis ne font qu'ajouter la mise en scène.
   Les animations ne touchent que transform / opacity (+ quelques clip-path pour les masques demandés). */
(() => {
  'use strict';

  const root = document.documentElement;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  const PHONE = '0635185293';
  const reduce = root.classList.contains('reduce') || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  const motion = hasGsap && !reduce;

  let lenis = null;
  const nav = $('#nav');

  /* ------------------------------------------------------------------
     Horaires : statut « ouvert / fermé » calculé à l'heure de Brest
     ------------------------------------------------------------------ */
  function initHours() {
    const days = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    const fmt = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', weekday: 'long', hour: 'numeric', minute: 'numeric', hourCycle: 'h23',
    });

    const update = () => {
      const parts = Object.fromEntries(fmt.formatToParts(new Date()).map((p) => [p.type, p.value]));
      const day = days.indexOf(parts.weekday);
      const t = Number(parts.hour) + Number(parts.minute) / 60;
      const open = day > 0 && t >= 9 && t < 19;

      let text;
      if (open) text = 'Ouvert maintenant · jusqu’à 19 h';
      else if (day === 0 || (day === 6 && t >= 19)) text = 'Fermé · réouverture lundi à 9 h';
      else if (t < 9) text = 'Fermé · ouvre à 9 h';
      else text = 'Fermé · ouvre demain à 9 h';

      $$('[data-status]').forEach((el) => {
        el.classList.toggle('is-open', open);
        const label = $('[data-status-text]', el);
        if (label) label.textContent = text;
      });
      $$('[data-hours] [data-day]').forEach((row) => row.classList.toggle('is-today', Number(row.dataset.day) === day));
    };

    update();
    setInterval(update, 60000);
  }

  /* ------------------------------------------------------------------
     Navigation : se cache en descendant, revient en remontant
     ------------------------------------------------------------------ */
  function initNav() {
    let lastY = window.scrollY;
    let ticking = false;
    const fab = $('.fab');
    const hideFabOn = $$('.cta, .find, .footer');
    let fabBlocked = 0;

    const onScroll = () => {
      const y = window.scrollY;
      nav.classList.toggle('is-solid', y > 40);
      if (!root.classList.contains('menu-open')) {
        if (y > 160 && y > lastY + 4) nav.classList.add('is-hidden');
        else if (y < lastY - 4 || y < 80) nav.classList.remove('is-hidden');
      }
      lastY = y;
      if (fab) fab.classList.toggle('is-visible', y > 520 && fabBlocked === 0);
      ticking = false;
    };

    window.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
    }, { passive: true });

    if (fab && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => { fabBlocked += e.isIntersecting ? 1 : -1; });
        fabBlocked = Math.max(0, fabBlocked);
        fab.classList.toggle('is-visible', window.scrollY > 520 && fabBlocked === 0);
      }, { threshold: 0.15 });
      hideFabOn.forEach((el) => io.observe(el));
    }
    onScroll();
  }

  /* ------------------------------------------------------------------
     Menu plein écran (mobile / tablette)
     ------------------------------------------------------------------ */
  const menu = { open: () => {}, close: () => {}, isOpen: () => false };
  function initMenu() {
    const burger = $('.nav__burger');
    const panel = $('#menu');
    if (!burger || !panel) return;

    const setOpen = (open) => {
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
      panel.classList.toggle('is-open', open);
      panel.inert = !open;
      root.classList.toggle('menu-open', open);
      nav.classList.remove('is-hidden');
      if (lenis) open ? lenis.stop() : lenis.start();
      if (open) $('a', panel).focus({ preventScroll: true });
    };

    burger.addEventListener('click', () => setOpen(burger.getAttribute('aria-expanded') !== 'true'));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && panel.classList.contains('is-open')) { setOpen(false); burger.focus(); }
    });
    window.matchMedia('(min-width: 1000px)').addEventListener('change', (e) => { if (e.matches) setOpen(false); });

    menu.open = () => setOpen(true);
    menu.close = () => setOpen(false);
    menu.isOpen = () => panel.classList.contains('is-open');
  }

  /* ------------------------------------------------------------------
     Ancres : défilement doux (Lenis si présent, sinon natif)
     ------------------------------------------------------------------ */
  function initAnchors() {
    $$('a[href^="#"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        const id = a.getAttribute('href');
        if (!id || id === '#') return;
        const target = $(id);
        if (!target) return;
        e.preventDefault();
        const wasOpen = menu.isOpen();
        if (wasOpen) menu.close();

        const go = () => {
          if (lenis) lenis.scrollTo(id === '#accueil' ? 0 : target, { duration: 1.7, easing: (t) => 1 - Math.pow(1 - t, 4) });
          else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
          target.setAttribute('tabindex', '-1');
          target.focus({ preventScroll: true });
          history.replaceState(null, '', id);
        };
        wasOpen ? setTimeout(go, 350) : go();
      });
    });
  }

  /* ------------------------------------------------------------------
     SMS : message prérempli selon l'envie et la date
     ------------------------------------------------------------------ */
  function initComposer() {
    const box = $('[data-composer]');
    if (!box) return;
    const bubble = $('[data-bubble]', box);
    const send = $('[data-sms-send]', box);
    const pick = (name) => $(`input[name="${name}"]:checked`, box).value;

    const update = () => {
      const msg = `Bonjour Axelle, j'aimerais prendre rendez-vous ${pick('quand')} pour ${pick('envie')}. Merci !`;
      bubble.textContent = msg;
      send.href = `sms:${PHONE}?&body=${encodeURIComponent(msg)}`;
    };
    box.addEventListener('change', update);
    update();
  }

  /* ------------------------------------------------------------------
     Éventail : un clic / un appui met une photo en avant (tactile compris)
     ------------------------------------------------------------------ */
  function initFanTap() {
    const items = $$('.fan__item');
    const activate = (item) => items.forEach((it) => it.classList.toggle('is-active', it === item && !it.classList.contains('is-active')));
    items.forEach((item) => {
      item.addEventListener('click', () => activate(item));
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(item); }
      });
    });
    document.addEventListener('click', (e) => { if (!e.target.closest('.fan__item')) items.forEach((it) => it.classList.remove('is-active')); });
  }

  /* ------------------------------------------------------------------
     Carrousel d'avis : flèches, pause, balayage, clavier, arrêt au survol / focus
     ------------------------------------------------------------------ */
  function initCarousel() {
    const box = $('[data-carousel]');
    if (!box) return;
    const viewport = $('.reviews__viewport', box);
    const track = $('.reviews__track', box);
    const slides = $$('.review', box);
    const bar = $('.reviews__bar span', box);
    const counter = $('[data-current]', box);
    const toggle = $('[data-toggle]', box);
    const DURATION = 12000;

    let index = 0;
    let elapsed = 0;
    let playing = !reduce;
    let hovering = false;
    let focusing = false;

    const place = (animate = true) => {
      const s = slides[index];
      const max = track.scrollWidth - viewport.clientWidth;
      const x = Math.min(Math.max(s.offsetLeft - (viewport.clientWidth - s.offsetWidth) / 2, 0), Math.max(max, 0));
      track.style.transition = animate ? '' : 'none';
      track.style.transform = `translate3d(${-x}px,0,0)`;
      if (!animate) { void track.offsetWidth; track.style.transition = ''; }
    };

    const go = (i) => {
      index = (i + slides.length) % slides.length;
      slides.forEach((s, k) => s.classList.toggle('is-active', k === index));
      counter.textContent = String(index + 1);
      elapsed = 0;
      place();
    };

    const setPlaying = (value) => {
      playing = value;
      toggle.setAttribute('aria-pressed', String(!playing));
      toggle.setAttribute('aria-label', playing ? 'Mettre le défilement automatique en pause' : 'Reprendre le défilement automatique');
    };
    setPlaying(playing);

    $('[data-prev]', box).addEventListener('click', () => go(index - 1));
    $('[data-next]', box).addEventListener('click', () => go(index + 1));
    toggle.addEventListener('click', () => setPlaying(!playing));

    viewport.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(index + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(index - 1); }
    });
    slides.forEach((s, k) => s.addEventListener('click', () => { if (k !== index) go(k); }));

    box.addEventListener('pointerenter', () => { hovering = true; });
    box.addEventListener('pointerleave', () => { hovering = false; });
    box.addEventListener('focusin', () => { focusing = true; });
    box.addEventListener('focusout', () => { focusing = false; });

    // balayage tactile / souris
    let startX = null;
    viewport.style.touchAction = 'pan-y';
    viewport.addEventListener('pointerdown', (e) => { startX = e.clientX; });
    window.addEventListener('pointerup', (e) => {
      if (startX === null) return;
      const dx = e.clientX - startX;
      startX = null;
      if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1));
    });

    // minuterie (ne tourne que si la section est visible)
    let visible = false;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.25 }).observe(box);
    } else visible = true;

    let last = performance.now();
    const tick = (now) => {
      const dt = now - last;
      last = now;
      if (playing && visible && !hovering && !focusing && !document.hidden) {
        elapsed += dt;
        if (elapsed >= DURATION) go(index + 1);
      }
      bar.style.transform = `scaleX(${playing ? Math.min(elapsed / DURATION, 1) : 0})`;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    let resizeTimer;
    window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => place(false), 120); });
    window.addEventListener('load', () => place(false));
    place(false);
  }

  /* ==================================================================
     MOUVEMENT (GSAP + ScrollTrigger + Lenis)
     ================================================================== */

  /* Découpe un titre en mots (et lettres) masqués, pour les révélations. */
  function split(el, { chars = false } = {}) {
    const text = el.textContent.replace(/[ \t\n\r]+/g, ' ').trim(); // l'espace insécable reste collée au mot
    el.setAttribute('aria-label', text);
    el.textContent = '';
    const units = [];
    text.split(' ').forEach((word, i, all) => {
      const mask = document.createElement('span');
      mask.className = 'mask';
      mask.setAttribute('aria-hidden', 'true');
      if (chars) {
        [...word].forEach((ch) => {
          const c = document.createElement('span');
          c.className = 'split-char';
          c.textContent = ch;
          mask.appendChild(c);
          units.push(c);
        });
      } else {
        const w = document.createElement('span');
        w.className = 'split-word';
        w.textContent = word;
        mask.appendChild(w);
        units.push(w);
      }
      el.appendChild(mask);
      if (i < all.length - 1) el.appendChild(document.createTextNode(' '));
    });
    return units;
  }

  function initLenis() {
    if (typeof window.Lenis === 'undefined') return;
    lenis = new window.Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }

  /* Bandeaux défilants : la vitesse suit le scroll, le sens suit la direction. */
  function initMarquee() {
    const rows = $$('[data-marquee]').map((row) => {
      const track = $('.marquee__track', row);
      const group = $('.marquee__group', track);
      return { dir: Number(row.dataset.marquee), track, group, x: 0, width: 0, setX: gsap.quickSetter(track, 'x', 'px') };
    });

    const measure = () => {
      rows.forEach((r) => {
        $$('.marquee__group', r.track).slice(1).forEach((g) => g.remove());
        r.width = r.group.offsetWidth;
        const needed = Math.ceil((window.innerWidth * 1.2) / r.width) + 1;
        for (let i = 0; i < needed; i += 1) {
          const clone = r.group.cloneNode(true);
          clone.setAttribute('aria-hidden', 'true');
          r.track.appendChild(clone);
        }
      });
    };
    measure();
    let resizeTimer;
    window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(measure, 200); });

    let boost = 0;
    let flip = 1;
    gsap.ticker.add((time, deltaTime) => {
      const v = lenis ? lenis.velocity : 0;
      boost += (Math.min(Math.abs(v), 60) - boost) * 0.08;
      if (Math.abs(v) > 0.4) flip += ((v >= 0 ? 1 : -1) - flip) * 0.12;
      const speed = (70 + boost * 22) * flip;
      rows.forEach((r) => {
        r.x -= r.dir * speed * (deltaTime / 1000);
        if (r.width) r.x = ((r.x % r.width) - r.width) % r.width;
        r.setX(r.x);
      });
    });
  }

  function countUp(el) {
    const to = Number(el.dataset.count);
    const from = el.dataset.from ? Number(el.dataset.from) : 0;
    const fmt = new Intl.NumberFormat('fr-FR');
    const state = { v: from };
    el.textContent = fmt.format(from);
    gsap.to(state, {
      v: to, duration: 2.4, ease: 'power3.out',
      onUpdate: () => { el.textContent = fmt.format(Math.round(state.v)); },
    });
  }

  function initMagnetic() {
    if (!finePointer) return;
    $$('[data-magnetic]').forEach((el) => {
      const label = $('.btn__label', el) || el.firstElementChild;
      const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3.out' });
      const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3.out' });
      const lx = label && label !== el ? gsap.quickTo(label, 'x', { duration: 0.6, ease: 'power3.out' }) : null;
      const ly = label && label !== el ? gsap.quickTo(label, 'y', { duration: 0.6, ease: 'power3.out' }) : null;

      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        xTo(dx * 0.3); yTo(dy * 0.42);
        if (lx) { lx(dx * 0.12); ly(dy * 0.16); }
      });
      el.addEventListener('pointerleave', () => {
        gsap.to(el, { x: 0, y: 0, duration: 1, ease: 'elastic.out(1, 0.4)', overwrite: 'auto' });
        if (label && label !== el) gsap.to(label, { x: 0, y: 0, duration: 1, ease: 'elastic.out(1, 0.4)', overwrite: 'auto' });
      });
    });
  }

  function initTilt() {
    if (!finePointer) return;
    $$('[data-tilt]').forEach((el) => {
      const glare = $('.card__glare', el);
      gsap.set(el, { transformPerspective: 900 });
      const rx = gsap.quickTo(el, 'rotationX', { duration: 0.6, ease: 'power3.out' });
      const ry = gsap.quickTo(el, 'rotationY', { duration: 0.6, ease: 'power3.out' });
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        ry((px - 0.5) * 16);
        rx(-(py - 0.5) * 16);
        if (glare) { glare.style.setProperty('--gx', `${px * 100}%`); glare.style.setProperty('--gy', `${py * 100}%`); }
      });
      el.addEventListener('pointerleave', () => { rx(0); ry(0); });
    });
  }

  function initCursor() {
    if (!finePointer) return;
    const cursor = $('.cursor');
    const ring = $('.cursor__ring');
    const dot = $('.cursor__dot');
    const label = $('.cursor__label');
    root.classList.add('has-cursor');
    cursor.classList.add('is-hidden');

    const rx = gsap.quickTo(ring, 'x', { duration: 0.55, ease: 'power3' });
    const ry = gsap.quickTo(ring, 'y', { duration: 0.55, ease: 'power3' });
    const dx = gsap.quickTo(dot, 'x', { duration: 0.12, ease: 'power3' });
    const dy = gsap.quickTo(dot, 'y', { duration: 0.12, ease: 'power3' });

    window.addEventListener('pointermove', (e) => {
      cursor.classList.remove('is-hidden');
      rx(e.clientX); ry(e.clientY); dx(e.clientX); dy(e.clientY);
    }, { passive: true });
    document.addEventListener('pointerleave', () => cursor.classList.add('is-hidden'));

    document.addEventListener('pointerover', (e) => {
      const withLabel = e.target.closest('[data-cursor]');
      const interactive = e.target.closest('a, button, input, label, [tabindex="0"]');
      cursor.classList.toggle('has-label', Boolean(withLabel));
      cursor.classList.toggle('is-hover', Boolean(interactive) && !withLabel);
      label.textContent = withLabel ? withLabel.dataset.cursor : '';
    });
  }

  /* Boucle principale des effets au défilement */
  function initScrollMotion() {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });
    const mm = gsap.matchMedia();

    // barre de progression de lecture
    gsap.to('.progress span', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } });

    /* ---------- Hero : parallaxe multicouche + souris ---------- */
    const hero = $('.hero');
    const depthEls = $$('[data-depth]', hero);
    depthEls.forEach((el) => {
      const d = Number(el.dataset.depth);
      gsap.to(el, {
        y: () => (0.5 - d) * hero.offsetHeight * 0.8,
        ease: 'none',
        scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true, invalidateOnRefresh: true },
      });
    });
    gsap.to('.hero__content', {
      y: () => hero.offsetHeight * -0.12, opacity: 0.2, ease: 'none',
      scrollTrigger: { trigger: hero, start: '25% top', end: 'bottom top', scrub: true },
    });

    if (finePointer) {
      const frames = $$('.hero__photo .amande-frame');
      const setters = frames.map((f, i) => ({
        x: gsap.quickTo(f, 'x', { duration: 1.2, ease: 'power3.out' }),
        y: gsap.quickTo(f, 'y', { duration: 1.2, ease: 'power3.out' }),
        k: 16 + i * 14,
      }));
      hero.addEventListener('pointermove', (e) => {
        const nx = e.clientX / window.innerWidth - 0.5;
        const ny = e.clientY / window.innerHeight - 0.5;
        setters.forEach((s) => { s.x(-nx * s.k); s.y(-ny * s.k); });
      });
    }

    // scintillements
    gsap.to('.sparkle', {
      scale: 0.35, opacity: 0.25, duration: 1.4, ease: 'sine.inOut', yoyo: true, repeat: -1,
      stagger: { each: 0.37, repeat: -1, yoyo: true },
    });

    /* ---------- Gouttes de vernis : elles coulent à l'arrivée ---------- */
    $$('.drip').forEach((drip) => {
      const fromTop = drip.classList.contains('drip--top');
      gsap.fromTo(drip, { scaleY: 0.04 }, {
        scaleY: 1, duration: 1.8, ease: 'power3.out', transformOrigin: '50% 0%',
        scrollTrigger: { trigger: drip.parentElement, start: fromTop ? 'top 85%' : 'bottom 92%', once: true },
      });
    });

    /* ---------- Savoir-faire : titre lettre par lettre ---------- */
    const storyChars = split($('#story-title'), { chars: true });
    gsap.from(storyChars, {
      yPercent: 115, duration: 1.1, ease: 'power4.out', stagger: 0.022,
      scrollTrigger: { trigger: '#story-title', start: 'top 82%', once: true },
    });

    /* ---------- Prestations : mots qui glissent en biais ---------- */
    const serviceWords = split($('#services-title'));
    gsap.from(serviceWords, {
      yPercent: 120, skewY: 7, duration: 1.2, ease: 'expo.out', stagger: 0.07,
      scrollTrigger: { trigger: '#services-title', start: 'top 85%', once: true },
    });

    /* ---------- Chiffres : phrase qui bascule + doigts qui poussent ---------- */
    const fingerWords = split($('#fingers-title'));
    gsap.from(fingerWords, {
      yPercent: 100, rotationX: -70, transformOrigin: '0% 100%', duration: 1.1, ease: 'power3.out', stagger: 0.08,
      scrollTrigger: { trigger: '#fingers-title', start: 'top 85%', once: true },
    });
    const hand = gsap.timeline({ scrollTrigger: { trigger: '.fingers__hand', start: 'top 78%', once: true } });
    hand
      .from('.finger__nail', { yPercent: 40, scale: 0.86, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.14 }, 0)
      .from('.finger__body', { scaleY: 0, opacity: 0, duration: 1.1, ease: 'expo.out', stagger: 0.14 }, 0.15)
      .add(() => $$('[data-count]').forEach(countUp), 0.25);

    /* ---------- Galerie : les mots tombent (clin d'œil aux gouttes) ---------- */
    const galleryWords = split($('#gallery-title'));
    gsap.from(galleryWords, {
      yPercent: -120, duration: 1.2, ease: 'bounce.out', stagger: 0.12,
      scrollTrigger: { trigger: '#gallery-title', start: 'top 85%', once: true },
    });
    gsap.from('.fan__card', {
      clipPath: 'inset(100% 0% 0% 0%)', duration: 1.2, ease: 'expo.out', stagger: 0.1,
      scrollTrigger: { trigger: '.fan', start: 'top 82%', once: true },
    });
    // l'éventail s'ouvre au fil du scroll
    const fan = $$('.fan__item');
    gsap.fromTo(fan, { rotation: 0, y: 30 }, {
      rotation: (i, el) => parseFloat(getComputedStyle(el).getPropertyValue('--a')) || 0,
      y: 0, ease: 'power2.out', stagger: 0,
      scrollTrigger: { trigger: '.fan', start: 'top 88%', end: 'top 32%', scrub: 0.9 },
    });

    /* ---------- Avis : titre qui se pose en flou ---------- */
    const reviewWords = split($('#reviews-title'));
    gsap.from(reviewWords, {
      opacity: 0, filter: 'blur(10px)', yPercent: 60, duration: 1.3, ease: 'power3.out', stagger: 0.1,
      scrollTrigger: { trigger: '#reviews-title', start: 'top 85%', once: true },
    });
    // le conteneur, pas les cartes : celles-ci ont déjà une transition CSS sur transform
    gsap.from('.reviews__viewport', {
      y: 60, opacity: 0, duration: 1.2, ease: 'expo.out',
      scrollTrigger: { trigger: '.reviews__viewport', start: 'top 88%', once: true },
    });

    /* ---------- Appel à l'action : lettres qui rebondissent, anneaux qui respirent ---------- */
    const ctaChars = split($('#cta-title'), { chars: true });
    gsap.from(ctaChars, {
      yPercent: 130, rotation: (i) => (i % 2 ? 8 : -8), duration: 1.3, ease: 'back.out(1.5)', stagger: 0.07,
      scrollTrigger: { trigger: '#cta-title', start: 'top 85%', once: true },
    });
    gsap.from('.cta__number-text', {
      yPercent: 40, opacity: 0, duration: 1.2, ease: 'expo.out',
      scrollTrigger: { trigger: '.cta__number', start: 'top 90%', once: true },
    });
    $$('.cta__ring').forEach((ring, i) => {
      gsap.to(ring, { scale: 1.07, duration: 3 + i * 0.8, ease: 'sine.inOut', yoyo: true, repeat: -1 });
      gsap.to(ring, {
        rotation: i % 2 ? -6 : 6, ease: 'none',
        scrollTrigger: { trigger: '.cta', start: 'top bottom', end: 'bottom top', scrub: true },
      });
    });

    /* ---------- Accès : mots qui entrent par la gauche, rideau sur la carte ---------- */
    const findWords = split($('#find-title'));
    gsap.from(findWords, {
      xPercent: -120, duration: 1.3, ease: 'expo.out', stagger: 0.12,
      scrollTrigger: { trigger: '#find-title', start: 'top 85%', once: true },
    });
    const mapShape = $('.find__map .amande');
    const curtain = document.createElement('span');
    curtain.setAttribute('aria-hidden', 'true');
    curtain.style.cssText = 'position:absolute;inset:0;z-index:3;background:var(--nuit);transform-origin:50% 0;pointer-events:none';
    mapShape.appendChild(curtain);
    gsap.to(curtain, {
      scaleY: 0, duration: 1.5, ease: 'expo.inOut',
      scrollTrigger: { trigger: '.find__map', start: 'top 80%', once: true },
      onComplete: () => curtain.remove(),
    });

    /* ---------- Pied de page : le nom géant se lève lettre à lettre ---------- */
    const footerChars = split($('.footer__giant-inner'), { chars: true });
    gsap.from(footerChars, {
      yPercent: 110, duration: 1.4, ease: 'expo.out', stagger: 0.045,
      scrollTrigger: { trigger: '.footer__giant', start: 'top 92%', once: true },
    });

    /* ---------- Petites entrées de texte (variées, jamais la même) ---------- */
    gsap.from('.services__lede, .services__hint', { y: 30, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.12, scrollTrigger: { trigger: '.services__intro', start: 'top 70%', once: true } });
    gsap.from('.gallery__lede', { x: -40, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.gallery__lede', start: 'top 90%', once: true } });
    gsap.from('.reviews__lede, .reviews__controls', { y: 24, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.12, scrollTrigger: { trigger: '.reviews__head', start: 'top 80%', once: true } });
    gsap.from('.cta__lede, .cta__actions .btn', { y: 30, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.1, scrollTrigger: { trigger: '.cta__lede', start: 'top 90%', once: true } });
    gsap.from('.composer', { y: 60, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.composer', start: 'top 90%', once: true } });
    gsap.from('.find__address > *, .find__hours > *', { x: -30, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.09, scrollTrigger: { trigger: '.find__address', start: 'top 88%', once: true } });
    gsap.from('.footer__cols > *', { y: 30, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.1, scrollTrigger: { trigger: '.footer__cols', start: 'top 90%', once: true } });

    /* ---------- Ken Burns lent sur les grandes photos ---------- */
    gsap.fromTo('.hero__photo--a img', { scale: 1.02 }, { scale: 1.14, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });

    /* ---------- Desktop uniquement : sections pinnées ---------- */
    mm.add('(min-width: 900px)', () => {
      /* Savoir-faire : quatre temps pilotés par le scroll */
      const steps = $$('.step');
      const imgs = $$('.story__img');
      const tabs = $$('.story__tabs li');
      const n = steps.length;
      const rail = $('.story__rail span');

      gsap.set(steps.slice(1), { opacity: 0, yPercent: 10 });
      gsap.set(imgs, { scale: 1.12 });
      gsap.set(imgs.slice(1), { autoAlpha: 0 });

      const tl = gsap.timeline({
        defaults: { ease: 'power2.inOut' },
        scrollTrigger: {
          trigger: '.story__pin', start: 'top top', end: () => `+=${window.innerHeight * n * 0.9}`,
          pin: true, scrub: 0.7, anticipatePin: 1, invalidateOnRefresh: true,
          onUpdate: (self) => {
            const active = Math.min(n - 1, Math.floor(self.progress * n + 0.22));
            tabs.forEach((t, i) => t.classList.toggle('is-active', i === active));
          },
        },
      });
      tl.to(rail, { scaleX: 1, ease: 'none', duration: n }, 0);
      for (let i = 1; i < n; i += 1) {
        tl.to(steps[i - 1], { opacity: 0, yPercent: -10, duration: 0.35 }, i - 0.22)
          .fromTo(steps[i], { opacity: 0, yPercent: 10 }, { opacity: 1, yPercent: 0, duration: 0.42 }, i - 0.08)
          .fromTo(imgs[i], { autoAlpha: 0, clipPath: 'circle(0% at 50% 72%)', scale: 1.3 },
            { autoAlpha: 1, clipPath: 'circle(85% at 50% 72%)', scale: 1.12, duration: 0.6, ease: 'power3.out' }, i - 0.18);
      }
      imgs.forEach((img) => tl.to(img, { scale: 1.2, ease: 'none', duration: n }, 0));

      /* Prestations : défilement horizontal piloté par le scroll vertical */
      const track = $('.services__track');
      const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
      const slide = gsap.to(track, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: {
          trigger: '.services__pin', start: 'top top', end: () => `+=${dist()}`,
          pin: true, scrub: 0.8, anticipatePin: 1, invalidateOnRefresh: true,
        },
      });
      $$('.card__img').forEach((img) => {
        gsap.fromTo(img, { xPercent: -6 }, {
          xPercent: 6, ease: 'none',
          scrollTrigger: { trigger: img.closest('.card'), containerAnimation: slide, start: 'left right', end: 'right left', scrub: true },
        });
      });
      $$('.card').forEach((card) => {
        // seules les cartes qui arrivent depuis la droite s'animent : celles déjà à l'écran restent visibles
        if (card.getBoundingClientRect().left < window.innerWidth * 0.92) return;
        gsap.from(card, {
          y: 90, opacity: 0, duration: 1, ease: 'expo.out',
          scrollTrigger: { trigger: card, containerAnimation: slide, start: 'left 96%', toggleActions: 'play none none none' },
        });
      });
    });

    /* ---------- Mobile : entrées simples ---------- */
    mm.add('(max-width: 899px)', () => {
      gsap.from('.step', {
        y: 50, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.1,
        scrollTrigger: { trigger: '.story__steps', start: 'top 80%', once: true },
      });
      gsap.from('.card', {
        x: 60, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.1,
        scrollTrigger: { trigger: '.services__track', start: 'top 85%', once: true },
      });
    });

    return mm;
  }

  /* Préchargeur : l'enseigne s'allume, puis la lumière du salon se fait. */
  function runLoader(onDone) {
    const loader = $('.loader');
    const num = $('.loader__num');
    const state = { v: 0 };

    const finish = () => {
      loader.style.display = 'none';
      root.classList.remove('is-loading');
      root.classList.add('is-ready');
      if (lenis) lenis.start();
      ScrollTrigger.refresh();
      onDone();
    };

    const tl = gsap.timeline({ onComplete: finish });
    gsap.set('.loader__word, .loader__sub', { opacity: 0 });
    tl.to('.loader__tube path', { strokeDashoffset: 0, duration: 1.5, ease: 'power2.inOut' }, 0)
      .to(state, { v: 100, duration: 1.7, ease: 'power1.inOut', onUpdate: () => { num.textContent = Math.round(state.v); } }, 0)
      .to('.loader__word', {
        keyframes: [
          { opacity: 1, duration: 0.05 }, { opacity: 0.12, duration: 0.09 }, { opacity: 1, duration: 0.05 },
          { opacity: 0.25, duration: 0.14 }, { opacity: 1, duration: 0.5 },
        ],
      }, 0.45)
      .to('.loader__sub', { opacity: 1, duration: 0.6 }, 1.1)
      .to('.loader__scene', { scale: 1.06, duration: 1.4, ease: 'power1.in' }, 0.7)
      .to('.loader__flash', { scale: 1, duration: 1, ease: 'power3.in' }, 1.7)
      .to('.loader__count', { opacity: 0, duration: 0.3 }, 1.7);
  }

  /* Entrée du hero : le titre monte dans ses masques, les photos se déploient. */
  function buildHeroIntro(titleWords) {
    const tl = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } });
    tl.from(titleWords, { yPercent: 118, rotation: 5, duration: 1.5, stagger: 0.09 }, 0)
      .from('.hero__lede', { y: 34, opacity: 0, duration: 1.1 }, 0.5)
      .from('.hero__actions .btn', { y: 34, opacity: 0, duration: 1, stagger: 0.1 }, 0.65)
      .from('.hero__photo .amande-frame', { yPercent: 14, scale: 0.8, opacity: 0, duration: 1.5, stagger: 0.14 }, 0.2)
      .from('.hero__photo img', { scale: 1.5, duration: 1.8 }, 0.2)
      .from('.hero__photo .tube', { opacity: 0, duration: 1.2 }, 0.9)
      .from('.hero__tube', { opacity: 0, scale: 0.9, duration: 1.6, stagger: 0.15 }, 0.2)
      .from('.hero__sign .neon', { opacity: 0, duration: 0.01, stagger: 0.25 }, 0.9)
      .from('.hero__sign .neon', { keyframes: [{ opacity: 0.1, duration: 0.07 }, { opacity: 1, duration: 0.07 }, { opacity: 0.2, duration: 0.1 }, { opacity: 1, duration: 0.3 }], stagger: 0.25 }, 0.95)
      .from('.palm', { yPercent: 45, rotation: (i) => (i ? 24 : -22), duration: 1.8, stagger: 0.15 }, 0.3)
      .from('.hero__meta > *, .hero__scroll', { y: 20, opacity: 0, duration: 1, stagger: 0.1 }, 1.1)
      // on anime les enfants : la barre elle-même porte une transition CSS sur transform (masquage au scroll)
      .from('.nav > *', { y: -28, opacity: 0, duration: 1.1, stagger: 0.08 }, 0.8);
    return tl;
  }

  function initMotion() {
    root.classList.add('motion');
    const titleWords = split($('.hero__title'));
    initLenis();
    const heroIntro = buildHeroIntro(titleWords);
    initScrollMotion();
    initMarquee();
    initMagnetic();
    initTilt();
    initCursor();

    let started = false;
    const start = () => { if (started) return; started = true; runLoader(() => heroIntro.play()); };
    Promise.race([
      document.fonts ? document.fonts.ready : Promise.resolve(),
      new Promise((resolve) => setTimeout(resolve, 1500)),
    ]).then(start);

    window.addEventListener('load', () => ScrollTrigger.refresh());
    if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());
  }

  /* ------------------------------------------------------------------
     Démarrage
     ------------------------------------------------------------------ */
  initHours();
  initNav();
  initMenu();
  initComposer();
  initFanTap();
  initCarousel();

  if (motion) {
    try {
      initMotion();
    } catch (err) {
      // si la mise en scène échoue, le site reste entièrement lisible
      console.error('[Salon Beleza] mouvement désactivé :', err);
      root.classList.remove('motion', 'is-loading');
      root.classList.add('is-ready', 'reduce');
      const loader = $('.loader');
      if (loader) loader.style.display = 'none';
    }
  } else {
    root.classList.remove('is-loading');
    root.classList.add('is-ready');
  }
  initAnchors();
})();
