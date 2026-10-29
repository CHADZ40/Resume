/* ═════════════════════════════════════════════════════════════
   SOKHOM MENGHOUR — Portfolio interactions & motion
   ═════════════════════════════════════════════════════════════ */
(() => {
  const root = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  const animate = hasGsap && !reduced;

  window.__ready = true;
  if (!animate) root.classList.remove('anim');

  /* ───────── Text splitting (keeps inline markup like <em>) ───────── */
  function split(el, type) {
    if (el.dataset.split) return $$(type === 'chars' ? '.char' : '.word', el);
    el.dataset.split = el.innerHTML;
    const walk = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(' '); return; }
            const word = document.createElement('span');
            word.className = 'word';
            if (type === 'chars') {
              word.style.whiteSpace = 'nowrap';
              [...part].forEach((ch) => {
                const c = document.createElement('span');
                c.className = 'char';
                c.textContent = ch;
                word.append(c);
              });
            } else word.textContent = part;
            frag.append(word);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1) walk(child);
      });
    };
    walk(el);
    return $$(type === 'chars' ? '.char' : '.word', el);
  }
  const unsplit = (el) => { if (el.dataset.split) { el.innerHTML = el.dataset.split; delete el.dataset.split; } };

  /* ───────── Theme ───────── */
  const themeBtn = $('.theme-btn');
  themeBtn?.addEventListener('click', (e) => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    const apply = () => {
      root.dataset.theme = next;
      try { localStorage.setItem('menghour-theme', next); } catch (_) {}
      aurora?.syncColors();
    };
    if (!document.startViewTransition || reduced) return apply();
    const r = themeBtn.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    document.startViewTransition(apply).ready.then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 900, easing: 'cubic-bezier(.76,0,.24,1)', pseudoElement: '::view-transition-new(root)' }
      );
    });
  });

  /* ───────── WebGL aurora background ───────── */
  const aurora = (() => {
    const canvas = $('.aurora');
    const gl = canvas?.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
    if (!gl) { if (canvas) canvas.style.display = 'none'; return null; }

    const vs = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
    const fs = `precision mediump float;
      uniform vec2 r;uniform float t;uniform vec2 m;uniform vec3 c1,c2,c3,bg;uniform float k;
      float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
        return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+1.),f.x),f.y);}
      float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}
      void main(){
        vec2 uv=gl_FragCoord.xy/r;vec2 p=uv;p.x*=r.x/r.y;
        float s=t*.045;
        vec2 q=vec2(fbm(p*1.3+s),fbm(p*1.3-s+3.1));
        float f=fbm(p*1.1+q*1.8+vec2(s*2.,-s)+(m-.5)*.35);
        vec3 col=mix(c1,c2,smoothstep(.25,.8,q.x));
        col=mix(col,c3,smoothstep(.5,.9,q.y)*.55);
        float g=smoothstep(.38,.95,f)*(.25+.75*uv.y);
        g+=(1.-smoothstep(0.,.55,distance(uv,m)))*.12;
        gl_FragColor=vec4(mix(bg,col,clamp(g*k,0.,1.)),1.);
      }`;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { canvas.style.display = 'none'; return null; }
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = Object.fromEntries(['r', 't', 'm', 'c1', 'c2', 'c3', 'bg', 'k'].map((n) => [n, gl.getUniformLocation(prog, n)]));

    const hex = (v) => { const x = v.trim().replace('#', ''); return [0, 2, 4].map((i) => parseInt(x.slice(i, i + 2), 16) / 255); };
    function syncColors() {
      const cs = getComputedStyle(root);
      gl.uniform3fv(u.c1, hex(cs.getPropertyValue('--a1')));
      gl.uniform3fv(u.c2, hex(cs.getPropertyValue('--a2')));
      gl.uniform3fv(u.c3, hex(cs.getPropertyValue('--a3')));
      gl.uniform3fv(u.bg, hex(cs.getPropertyValue('--bg')));
      gl.uniform1f(u.k, root.dataset.theme === 'light' ? .5 : .62);
    }
    const scale = .5;
    function resize() {
      canvas.width = Math.max(1, Math.round(innerWidth * scale));
      canvas.height = Math.max(1, Math.round(innerHeight * scale));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(u.r, canvas.width, canvas.height);
    }
    const mouse = { x: .5, y: .7, tx: .5, ty: .7 };
    addEventListener('pointermove', (e) => { mouse.tx = e.clientX / innerWidth; mouse.ty = 1 - e.clientY / innerHeight; }, { passive: true });
    addEventListener('resize', resize);
    resize(); syncColors();
    const start = performance.now();
    (function frame(now) {
      mouse.x += (mouse.tx - mouse.x) * .04;
      mouse.y += (mouse.ty - mouse.y) * .04;
      gl.uniform1f(u.t, reduced ? 8 : (now - start) / 1000);
      gl.uniform2f(u.m, mouse.x, mouse.y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!reduced) requestAnimationFrame(frame);
    })(start);
    return { syncColors };
  })();

  /* ───────── Clock (Phnom Penh) ───────── */
  const clock = $('.clock');
  if (clock) {
    const fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Phnom_Penh' });
    const tick = () => { clock.textContent = fmt.format(new Date()); };
    tick(); setInterval(tick, 15000);
  }

  /* ───────── Smooth scroll ───────── */
  let lenis = null;
  if (animate && window.Lenis) {
    lenis = new Lenis({ lerp: .09, wheelMultiplier: 1 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  const scrollTo = (target) => {
    if (lenis) lenis.scrollTo(target, { offset: 0, duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4) });
    else if (typeof target === 'number') window.scrollTo({ top: target, behavior: reduced ? 'auto' : 'smooth' });
    else target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  };

  /* ───────── Mobile menu ───────── */
  const menuBtn = $('.menu-btn'), menu = $('.menu');
  const setMenu = (open) => {
    root.classList.toggle('menu-open', open);
    menuBtn?.setAttribute('aria-expanded', String(open));
    menuBtn?.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu?.setAttribute('aria-hidden', String(!open));
    if (lenis) open ? lenis.stop() : lenis.start();
    else document.body.style.overflow = open ? 'hidden' : '';
  };
  menuBtn?.addEventListener('click', () => setMenu(!root.classList.contains('menu-open')));

  /* ───────── Anchor links ───────── */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    const target = id === '#top' ? 0 : $(id);
    if (target === null) return;
    e.preventDefault();
    if (root.classList.contains('menu-open')) setMenu(false);
    scrollTo(target);
    history.replaceState(null, '', id === '#top' ? location.pathname : id);
  });

  /* ───────── Nav: active section + hide on scroll ───────── */
  const nav = $('.nav'), pill = $('.nav-pill'), indicator = $('.nav-indicator');
  const navLinks = $$('.nav-pill a');
  function moveIndicator(link) {
    if (!indicator) return;
    if (!link) { indicator.style.opacity = 0; return; }
    indicator.style.opacity = 1;
    indicator.style.width = `${link.offsetWidth}px`;
    indicator.style.transform = `translateX(${link.offsetLeft}px)`;
  }
  const sections = navLinks.map((a) => $(a.getAttribute('href'))).filter(Boolean);
  function updateActive() {
    const mid = innerHeight * .4;
    let current = null;
    sections.forEach((s, i) => { const r = s.getBoundingClientRect(); if (r.top < mid && r.bottom > mid) current = navLinks[i]; });
    navLinks.forEach((a) => a.classList.toggle('is-active', a === current));
    moveIndicator(current);
  }
  pill?.addEventListener('mouseover', (e) => { const a = e.target.closest('a'); if (a) moveIndicator(a); });
  pill?.addEventListener('mouseleave', updateActive);

  let lastY = scrollY;
  const progressBar = $('.progress i');
  function onScroll() {
    const y = scrollY;
    const max = document.documentElement.scrollHeight - innerHeight;
    if (progressBar) progressBar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    if (!root.classList.contains('menu-open')) nav?.classList.toggle('is-hidden', y > lastY && y > 300);
    nav?.classList.toggle('is-scrolled', y > 80);
    lastY = y;
    updateActive();
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', updateActive);

  /* ───────── Spotlight cards ───────── */
  document.addEventListener('pointermove', (e) => {
    const card = e.target.closest?.('.spot');
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${e.clientX - r.left}px`);
    card.style.setProperty('--my', `${e.clientY - r.top}px`);
  }, { passive: true });

  /* ───────── Lazy live-site previews ───────── */
  const frames = $$('iframe[data-src]');
  const loadFrame = (f) => { f.addEventListener('load', () => f.classList.add('is-loaded'), { once: true }); f.src = f.dataset.src; f.removeAttribute('data-src'); };
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => entries.forEach((en) => { if (en.isIntersecting) { loadFrame(en.target); io.unobserve(en.target); } }), { rootMargin: '400px' });
    frames.forEach((f) => io.observe(f));
  } else frames.forEach(loadFrame);

  /* ───────── Copy email ───────── */
  const mailBtn = $('.mail-btn');
  mailBtn?.addEventListener('click', async () => {
    const email = mailBtn.dataset.copy;
    try { await navigator.clipboard.writeText(email); } catch (_) { location.href = `mailto:${email}`; return; }
    mailBtn.classList.add('copied');
    clearTimeout(mailBtn._t);
    mailBtn._t = setTimeout(() => mailBtn.classList.remove('copied'), 1800);
  });

  /* ───────── Animated <details> ───────── */
  $$('.term').forEach((d) => {
    const summary = $('summary', d), body = $('.term-body', d);
    summary.addEventListener('click', (e) => {
      if (reduced || !body.animate) return;
      e.preventDefault();
      if (d._anim) d._anim.cancel();
      const opening = !d.open;
      if (opening) d.open = true;
      const full = body.scrollHeight;
      d._anim = body.animate(
        { height: opening ? ['0px', `${full}px`] : [`${full}px`, '0px'], opacity: opening ? [0, 1] : [1, 0] },
        { duration: opening ? 650 : 450, easing: 'cubic-bezier(.22,1,.36,1)' }
      );
      if (opening && hasGsap) gsap.from($$('tr', body), { y: 14, opacity: 0, stagger: .04, duration: .6, ease: 'power3.out', delay: .1 });
      d._anim.onfinish = () => { if (!opening) d.open = false; d._anim = null; if (hasGsap) ScrollTrigger.refresh(); };
    });
  });

  /* ───────── Lightbox (FLIP) ───────── */
  const lb = $('.lightbox'), lbImg = $('.lb-img'), lbClose = $('.lb-close');
  let lbSource = null;
  function flip(from, to, reverse) {
    const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
    const dx = a.left + a.width / 2 - (b.left + b.width / 2), dy = a.top + a.height / 2 - (b.top + b.height / 2);
    const s = a.width / b.width;
    const frames = [{ transform: `translate(${dx}px, ${dy}px) scale(${s})`, borderRadius: '20px' }, { transform: 'none', borderRadius: '18px' }];
    return to.animate(reverse ? frames.reverse() : frames, { duration: 700, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' });
  }
  function openLightbox(btn) {
    lbSource = btn;
    lbImg.src = btn.dataset.full;
    lbImg.alt = $('img', btn).alt;
    $('.lb-title', lb).textContent = btn.dataset.title;
    $('.lb-desc', lb).textContent = btn.dataset.desc;
    lb.hidden = false;
    lenis?.stop();
    const go = () => {
      requestAnimationFrame(() => lb.classList.add('open'));
      if (!reduced && lbImg.animate) flip($('img', btn), lbImg);
      lbClose.focus();
    };
    lbImg.complete ? go() : lbImg.addEventListener('load', go, { once: true });
  }
  function closeLightbox() {
    if (lb.hidden) return;
    lb.classList.remove('open');
    const done = () => { lb.hidden = true; lbImg.getAnimations().forEach((a) => a.cancel()); lenis?.start(); lbSource?.focus({ preventScroll: true }); };
    if (!reduced && lbImg.animate && lbSource) flip($('img', lbSource), lbImg, true).onfinish = done;
    else done();
  }
  $$('.poster').forEach((p) => p.addEventListener('click', () => openLightbox(p)));
  lbClose?.addEventListener('click', closeLightbox);
  lb?.addEventListener('click', (e) => { if (e.target === lb) closeLightbox(); });
  addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    closeLightbox();
    if (root.classList.contains('menu-open')) setMenu(false);
  });

  /* ───────── Text scramble rotator ───────── */
  const rotWord = $('.rotator-word');
  if (rotWord && !reduced) {
    const words = ['Software developer', 'AI enthusiast', 'Visual designer', 'Quick learner', 'Problem solver'];
    const glyphs = '!<>-_\\/[]{}—=+*^?#01';
    let i = 0;
    setInterval(() => {
      i = (i + 1) % words.length;
      const from = rotWord.textContent, to = words[i];
      const len = Math.max(from.length, to.length);
      const queue = [...Array(len)].map((_, k) => ({ from: from[k] || '', to: to[k] || '', start: Math.floor(Math.random() * 14), end: Math.floor(Math.random() * 14) + 14 }));
      let frame = 0;
      (function step() {
        let out = '', done = 0;
        queue.forEach((q) => {
          if (frame >= q.end) { done++; out += q.to; }
          else if (frame >= q.start) out += glyphs[Math.floor(Math.random() * glyphs.length)];
          else out += q.from;
        });
        rotWord.textContent = out;
        if (done < queue.length) { frame++; requestAnimationFrame(step); }
      })();
    }, 2800);
  }

  /* ───────── Everything below needs GSAP ───────── */
  if (!animate) {
    $$('.count').forEach((el) => { el.textContent = (+el.dataset.to).toFixed(+el.dataset.dec || 0); });
    onScroll();
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  const mm = gsap.matchMedia();

  /* Custom cursor */
  if (finePointer) {
    root.classList.add('has-cursor');
    const cur = $('.cursor'), dot = $('.cursor-dot'), ring = $('.cursor-ring'), label = $('.cursor-label');
    const dx = gsap.quickTo(dot, 'x', { duration: .12, ease: 'power3' }), dy = gsap.quickTo(dot, 'y', { duration: .12, ease: 'power3' });
    const rx = gsap.quickTo(ring, 'x', { duration: .5, ease: 'power3' }), ry = gsap.quickTo(ring, 'y', { duration: .5, ease: 'power3' });
    addEventListener('pointermove', (e) => { dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY); }, { passive: true });
    document.addEventListener('pointerover', (e) => {
      const lab = e.target.closest('[data-cursor]');
      const link = e.target.closest('a, button, summary, [data-magnetic]');
      cur.classList.toggle('is-label', !!lab);
      cur.classList.toggle('is-link', !lab && !!link);
      if (lab) label.textContent = lab.dataset.cursor;
    });
    addEventListener('pointerdown', () => cur.classList.add('is-down'));
    addEventListener('pointerup', () => cur.classList.remove('is-down'));
    document.addEventListener('pointerleave', () => gsap.to(cur, { opacity: 0, duration: .3 }));
    document.addEventListener('pointerenter', () => gsap.to(cur, { opacity: 1, duration: .3 }));

    /* Magnetic elements */
    $$('[data-magnetic]').forEach((el) => {
      const xTo = gsap.quickTo(el, 'x', { duration: .6, ease: 'power3' }), yTo = gsap.quickTo(el, 'y', { duration: .6, ease: 'power3' });
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * .35);
        yTo((e.clientY - r.top - r.height / 2) * .35);
      });
      el.addEventListener('pointerleave', () => {
        gsap.to(el, { x: 0, y: 0, duration: 1, ease: 'elastic.out(1, .4)', overwrite: true });
      });
    });

    /* Hero photo 3D tilt */
    const photo = $('.hero-photo');
    if (photo) {
      const img = $('img', photo);
      addEventListener('pointermove', (e) => {
        if (scrollY > innerHeight) return;
        const px = e.clientX / innerWidth - .5, py = e.clientY / innerHeight - .5;
        gsap.to(photo, { rotateY: px * 18, rotateX: -py * 18, duration: 1, ease: 'power3', transformPerspective: 900 });
        gsap.to(img, { x: -px * 14, y: -py * 14, duration: 1, ease: 'power3' });
      }, { passive: true });
    }
  }

  /* Intro: preloader → hero */
  const heroChars = $$('.hero-title .split').flatMap((el) => split(el, 'chars'));
  const loaderNum = $('.loader-num');
  const counter = { v: 0 };
  const intro = gsap.timeline({ defaults: { ease: 'expo.out' } });
  intro
    .from('.loader-name > *', { yPercent: 110, duration: 1, stagger: .08 })
    .to(counter, { v: 100, duration: 1.4, ease: 'power2.inOut', onUpdate: () => { loaderNum.textContent = Math.round(counter.v); } }, '<.1')
    .to('.loader-bar i', { scaleX: 1, duration: 1.4, ease: 'power2.inOut' }, '<')
    .to('.loader-inner', { y: -30, opacity: 0, duration: .6, ease: 'power3.in' })
    .to('.loader', { clipPath: 'inset(0 0 100% 0)', duration: 1.1, ease: 'expo.inOut' }, '-=.15')
    .set('.loader', { display: 'none' })
    .from(heroChars, { yPercent: 115, rotate: 6, duration: 1.4, stagger: .035 }, '-=.6')
    .from('.hero-badge', { scale: 0, rotate: -180, duration: 1.4 }, '<.4')
    .to('.nav, .hero-meta', { opacity: 1, duration: 1 }, '<')
    .from('.nav', { y: -30, duration: 1.2 }, '<')
    .to('.hero .reveal-up', { opacity: 1, y: 0, duration: 1.4, stagger: .1 }, '<.1')
    .from('.hero-photo img', { scale: 1.4, duration: 2 }, '<')
    .add(() => { $$('.hero-title em.split').forEach(unsplit); onScroll(); });

  /* Hero scroll parallax */
  gsap.to('.hero-title', { yPercent: -18, opacity: .2, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero-photo', { yPercent: -40, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

  /* Marquee — velocity reactive */
  const track = $('.marquee-track');
  if (track) {
    track.insertAdjacentHTML('beforeend', track.innerHTML);
    const loop = gsap.to(track, { xPercent: -50, duration: 38, ease: 'none', repeat: -1 });
    let dir = 1;
    ScrollTrigger.create({
      onUpdate: (self) => {
        const v = self.getVelocity();
        if (v) dir = v > 0 ? 1 : -1;
        gsap.to(loop, { timeScale: dir * (1 + Math.min(Math.abs(v) / 250, 6)), duration: .2, overwrite: true });
        gsap.to(loop, { timeScale: dir, duration: 1.2, delay: .2, ease: 'power2.out', overwrite: false });
      }
    });
  }

  /* Statement — words light up while scrolling */
  const statement = $('.statement');
  if (statement) {
    const words = split(statement, 'words');
    gsap.fromTo(words, { opacity: .12 }, {
      opacity: 1, stagger: .1, ease: 'none',
      scrollTrigger: { trigger: statement, start: 'top 80%', end: 'bottom 45%', scrub: true }
    });
  }

  /* Display headings — mask wipe */
  $$('.display').forEach((h) => {
    gsap.fromTo(h, { clipPath: 'inset(0 0 100% 0)', y: 60 }, {
      clipPath: 'inset(0 0 -20% 0)', y: 0, duration: 1.4, ease: 'expo.out',
      scrollTrigger: { trigger: h, start: 'top 88%' }
    });
  });
  $$('.eyebrow, .split-head > p, .link-arrow').forEach((el) => {
    gsap.from(el, { opacity: 0, y: 20, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%' } });
  });

  /* Batched card reveals */
  const reveal = (sel, opts = {}) => {
    gsap.set(sel, { opacity: 0, y: 60, ...opts.from });
    ScrollTrigger.batch(sel, {
      start: 'top 90%',
      onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, scale: 1, rotate: 0, duration: 1.2, stagger: .09, ease: 'expo.out', overwrite: true })
    });
  };
  reveal('.tile', { from: { scale: .96 } });
  reveal('.term');
  reveal('.c-card');
  reveal('.socials a', { from: { y: 30, scale: .6 } });

  /* Tag pop-in */
  $$('.tags').forEach((t) => gsap.from($$('li', t), { opacity: 0, scale: .6, y: 10, stagger: .03, duration: .7, ease: 'back.out(2)', scrollTrigger: { trigger: t, start: 'top 90%' } }));

  /* Counters */
  $$('.count').forEach((el) => {
    const to = +el.dataset.to, dec = +el.dataset.dec || 0, o = { v: 0 };
    ScrollTrigger.create({
      trigger: el, start: 'top 92%', once: true,
      onEnter: () => gsap.to(o, { v: to, duration: 2.2, ease: 'expo.out', onUpdate: () => { el.textContent = o.v.toFixed(dec); } })
    });
  });

  /* GPA ring + bars */
  $$('.ring-card, .chart-card').forEach((c) => {
    gsap.from(c, { opacity: 0, y: 60, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: c, start: 'top 88%' } });
    ScrollTrigger.create({ trigger: c, start: 'top 75%', once: true, onEnter: () => c.classList.add('in') });
  });
  $$('.bar i').forEach((b, i) => { b.style.transitionDelay = `${i * 90}ms`; });

  /* Projects — sticky stacking cards (desktop) */
  mm.add('(min-width: 901px)', () => {
    const cards = $$('.project');
    cards.forEach((card, i) => {
      const next = cards[i + 1];
      if (!next) return;
      gsap.to(card, {
        scale: .9, opacity: .35, rotateX: 4, transformPerspective: 1200, ease: 'none',
        scrollTrigger: { trigger: next, start: 'top bottom', end: 'top 14%', scrub: true }
      });
    });
  });
  $$('.project').forEach((card) => {
    const info = $$('.project-info > *', card), browser = $('.browser', card);
    const tl = gsap.timeline({ scrollTrigger: { trigger: card, start: 'top 80%' }, defaults: { ease: 'expo.out' } });
    tl.from(info, { opacity: 0, y: 40, stagger: .07, duration: 1.2 })
      .from(browser, { opacity: 0, y: 80, rotate: 2, scale: .94, duration: 1.6 }, '<.1');
  });

  /* Design — pinned horizontal scroll on desktop, swipe on mobile */
  mm.add('(min-width: 901px)', () => {
    root.classList.add('hscroll');
    const pin = $('.design-pin'), track = $('.design-track'), head = $('.design-head'), cur = $('.design-cur');
    const posters = $$('.poster', track);
    const distance = () => Math.max(0, track.scrollWidth - (pin.clientWidth - track.offsetLeft));
    const tween = gsap.to([head, track], {
      x: () => -distance(), ease: 'none',
      scrollTrigger: {
        trigger: '.design', start: 'top top', end: () => `+=${distance()}`,
        pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1,
        onUpdate: (self) => { if (cur) cur.textContent = String(Math.min(posters.length, Math.floor(self.progress * posters.length) + 1)).padStart(2, '0'); }
      }
    });
    posters.forEach((p) => {
      gsap.fromTo($('img', p), { xPercent: -6 }, { xPercent: 6, ease: 'none', scrollTrigger: { trigger: p, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } });
    });
    return () => root.classList.remove('hscroll');
  });
  gsap.from('.poster', { opacity: 0, x: 160, rotate: 3, stagger: .1, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.design', start: 'top 60%' } });

  /* Contact title */
  const contactSplits = $$('.contact-title .split');
  const contactChars = contactSplits.flatMap((el) => split(el, 'chars'));
  gsap.from(contactChars, {
    yPercent: 115, rotate: 8, duration: 1.4, stagger: .025, ease: 'expo.out',
    scrollTrigger: { trigger: '.contact-title', start: 'top 80%' },
    onComplete: () => $$('.contact-title em.split').forEach(unsplit)
  });
  gsap.from('.mail-btn', { opacity: 0, scale: .8, y: 40, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.mail-btn', start: 'top 90%' } });

  /* Footer giant name */
  gsap.from('.footer-name', { yPercent: 40, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'bottom bottom', scrub: true } });

  document.fonts?.ready.then(() => ScrollTrigger.refresh());
  addEventListener('load', () => ScrollTrigger.refresh());
  onScroll();
})();
