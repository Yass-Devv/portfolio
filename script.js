(() => {
  "use strict";

  const root = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  // ==========================================
  // 1. SMOOTH SCROLL (Lenis, optionnel)
  // ==========================================
  let lenis = null;
  if (!reduceMotion && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.09, smoothWheel: true });
  }

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (e) => {
      const id = link.getAttribute("href");
      const target = id === "#top" ? document.body : document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(id === "#top" ? 0 : target, { offset: -16, duration: 1.4 });
      else target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
      if (id === "#main" || id === "#contact") target.setAttribute("tabindex", "-1");
    });
  });

  // ==========================================
  // 2. PETITS DÉTAILS (année, horloge Genève)
  // ==========================================
  document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));

  const clock = document.querySelector("[data-clock]");
  if (clock) {
    const fmt = new Intl.DateTimeFormat("fr-CH", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Zurich" });
    const tick = () => (clock.textContent = fmt.format(new Date()));
    tick();
    setInterval(tick, 30000);
  }

  // ==========================================
  // 3. TEXTE DÉCOUPÉ (lettres / mots)
  // ==========================================
  document.querySelectorAll("[data-split]").forEach((el) => {
    const text = el.textContent.trim();
    el.setAttribute("aria-label", text);
    el.textContent = "";
    let i = 0;
    text.split(" ").forEach((word, wi, words) => {
      const wordEl = document.createElement("span");
      wordEl.style.display = "inline-block";
      wordEl.setAttribute("aria-hidden", "true");
      [...word].forEach((ch) => {
        const wrap = document.createElement("span");
        wrap.className = "char-wrap";
        const c = document.createElement("span");
        c.className = "char";
        c.style.setProperty("--i", i++);
        c.textContent = ch;
        wrap.appendChild(c);
        wordEl.appendChild(wrap);
      });
      el.appendChild(wordEl);
      if (wi < words.length - 1) el.appendChild(document.createTextNode(" "));
    });
  });

  const aboutText = document.querySelector("[data-words]");
  let words = [];
  if (aboutText) {
    const parts = aboutText.textContent.trim().split(/\s+/);
    aboutText.textContent = "";
    parts.forEach((w, idx) => {
      const s = document.createElement("span");
      s.className = "w";
      s.textContent = w;
      aboutText.appendChild(s);
      if (idx < parts.length - 1) aboutText.appendChild(document.createTextNode(" "));
    });
    words = [...aboutText.querySelectorAll(".w")];
  }

  // Titre du hero : animation d'entrée immédiate
  requestAnimationFrame(() => {
    document.querySelectorAll(".hero [data-split]").forEach((el) => el.classList.add("is-in"));
  });

  // Le hero est visible dès le chargement : pas besoin d'attendre l'observer
  document.querySelectorAll(".hero .reveal").forEach((el, i) => {
    el.style.setProperty("--d", `${500 + i * 120}ms`);
    el.classList.add("hero-reveal");
  });
  requestAnimationFrame(() => requestAnimationFrame(() => {
    document.querySelectorAll(".hero-reveal").forEach((el) => el.classList.add("is-in"));
  }));

  // ==========================================
  // 4. APPARITIONS AU SCROLL
  // ==========================================
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        revealObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
  );

  // Décalage automatique entre éléments frères
  document.querySelectorAll(".reveal:not(.hero-reveal)").forEach((el) => {
    const siblings = [...el.parentElement.children].filter((c) => c.classList.contains("reveal"));
    const idx = siblings.indexOf(el);
    if (idx > 0) el.style.setProperty("--d", `${Math.min(idx, 5) * 90}ms`);
    revealObserver.observe(el);
  });
  document.querySelectorAll("[data-split-scroll]").forEach((el) => revealObserver.observe(el));

  // Compteurs animés (0 -> valeur) à l'apparition
  const countObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        countObserver.unobserve(entry.target);
        const el = entry.target;
        const target = Number(el.dataset.count);
        if (reduceMotion) return;
        const duration = 1800;
        const start = performance.now();
        const tick = (now) => {
          const p = Math.min(1, (now - start) / duration);
          el.textContent = Math.round(target * (1 - Math.pow(1 - p, 4)));
          if (p < 1) requestAnimationFrame(tick);
        };
        el.textContent = "0";
        requestAnimationFrame(tick);
      });
    },
    { threshold: 0.6 }
  );
  document.querySelectorAll("[data-count]").forEach((el) => countObserver.observe(el));

  // ==========================================
  // 5. BOUCLE SCROLL : progression, nav, marquee, texte
  // ==========================================
  const progressBar = document.querySelector(".progress span");
  const nav = document.querySelector(".nav");
  const marqueeTrack = document.querySelector(".marquee-track");
  const navLinks = [...document.querySelectorAll(".nav-links a")];
  const sections = navLinks.map((a) => document.querySelector(a.getAttribute("href"))).filter(Boolean);

  let lastY = window.scrollY;
  let velocity = 0;
  let marqueeX = 0;
  let marqueeDir = -1;

  const onFrame = () => {
    const y = window.scrollY;
    const delta = y - lastY;
    lastY = y;
    velocity = lerp(velocity, delta, 0.1);

    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (progressBar) progressBar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;

    if (nav) {
      if (delta > 2 && y > 240) nav.classList.add("is-hidden");
      else if (delta < -2 || y < 240) nav.classList.remove("is-hidden");
    }

    if (marqueeTrack && !reduceMotion) {
      if (Math.abs(delta) > 0.5) marqueeDir = delta > 0 ? -1 : 1;
      const speed = 0.6 + Math.min(Math.abs(velocity) * 0.25, 12);
      marqueeX += speed * marqueeDir;
      const half = marqueeTrack.scrollWidth / 2;
      if (marqueeX <= -half) marqueeX += half;
      if (marqueeX > 0) marqueeX -= half;
      marqueeTrack.style.transform = `translate3d(${marqueeX}px,0,0)`;
    }

    if (words.length) {
      const r = aboutText.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = clamp((vh * 0.85 - r.top) / (r.height + vh * 0.35), 0, 1);
      const count = Math.round(p * words.length);
      words.forEach((w, i) => w.classList.toggle("is-on", reduceMotion || i < count));
    }

    let current = null;
    sections.forEach((s, i) => {
      if (s.getBoundingClientRect().top < window.innerHeight * 0.45) current = i;
    });
    navLinks.forEach((a, i) => a.classList.toggle("is-active", i === current));
  };

  const loop = (time) => {
    if (lenis) lenis.raf(time);
    onFrame();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  // ==========================================
  // 6. CURSEUR + MAGNÉTISME + TILT
  // ==========================================
  if (finePointer && !reduceMotion) {
    root.classList.add("has-cursor");
    const cursor = document.querySelector(".cursor");
    const label = cursor.querySelector(".cursor-label");
    const pos = { x: -100, y: -100 };
    const cur = { x: -100, y: -100 };

    window.addEventListener("pointermove", (e) => {
      pos.x = e.clientX;
      pos.y = e.clientY;
      cursor.classList.remove("is-hidden");
    }, { passive: true });
    document.addEventListener("pointerleave", () => cursor.classList.add("is-hidden"));

    const moveCursor = () => {
      cur.x = lerp(cur.x, pos.x, 0.2);
      cur.y = lerp(cur.y, pos.y, 0.2);
      cursor.style.transform = `translate3d(${cur.x}px, ${cur.y}px, 0)`;
      requestAnimationFrame(moveCursor);
    };
    requestAnimationFrame(moveCursor);

    document.querySelectorAll("a, button, input, textarea, div[data-cursor]").forEach((el) => {
      el.addEventListener("pointerenter", () => {
        const text = el.closest("[data-cursor]")?.dataset.cursor;
        if (text) {
          label.textContent = text;
          cursor.classList.add("is-label");
        } else {
          cursor.classList.add("is-hover");
        }
      });
      el.addEventListener("pointerleave", () => cursor.classList.remove("is-hover", "is-label"));
    });

    document.querySelectorAll("[data-magnetic]").forEach((el) => {
      el.style.transition = `${getComputedStyle(el).transition}, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)`;
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * 0.3;
        const y = (e.clientY - r.top - r.height / 2) * 0.4;
        el.style.transform = `translate(${x}px, ${y}px)`;
      });
      el.addEventListener("pointerleave", () => (el.style.transform = ""));
    });

    document.querySelectorAll("[data-tilt]").forEach((el) => {
      const link = el.closest("a") || el;
      link.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        el.style.setProperty("--ry", `${px * 6}deg`);
        el.style.setProperty("--rx", `${-py * 6}deg`);
      });
      link.addEventListener("pointerleave", () => {
        el.style.setProperty("--ry", "0deg");
        el.style.setProperty("--rx", "0deg");
      });
    });

    document.querySelectorAll("[data-glow]").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${e.clientX - r.left}px`);
        el.style.setProperty("--my", `${e.clientY - r.top}px`);
      });
    });
  }

  // ==========================================
  // 6b. DIAPORAMA DES PROJETS
  // ==========================================
  document.querySelectorAll("[data-gallery]").forEach((gallery) => {
    const slides = [...gallery.querySelectorAll("img")];
    const dots = [...gallery.querySelectorAll(".gallery-dots i")];
    if (slides.length < 2) return;
    let index = 0;
    let timer = null;
    let visible = false;
    let hovered = false;

    const show = (i) => {
      index = (i + slides.length) % slides.length;
      slides.forEach((s, k) => s.classList.toggle("is-active", k === index));
      dots.forEach((d, k) => d.classList.toggle("is-active", k === index));
    };
    const schedule = () => {
      clearTimeout(timer);
      if (reduceMotion || (!visible && !hovered)) return;
      timer = setTimeout(() => {
        show(index + 1);
        schedule();
      }, hovered ? 1300 : 3000);
    };

    show(0);
    const host = gallery.closest(".project-link") || gallery;
    host.addEventListener("pointerenter", () => {
      hovered = true;
      show(index + 1);
      schedule();
    });
    host.addEventListener("pointerleave", () => {
      hovered = false;
      schedule();
    });
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      schedule();
    }, { threshold: 0.3 }).observe(gallery);
  });

  // ==========================================
  // 7. ONGLETS DU PARCOURS
  // ==========================================
  const tabList = document.querySelector('[role="tablist"]');
  if (tabList) {
    const tabs = [...tabList.querySelectorAll('[role="tab"]')];
    const indicator = tabList.querySelector(".tab-indicator");

    const moveIndicator = (tab) => {
      indicator.style.width = `${tab.offsetWidth}px`;
      indicator.style.transform = `translateX(${tab.offsetLeft}px)`;
    };

    const select = (tab, focus) => {
      tabs.forEach((t) => {
        const selected = t === tab;
        t.setAttribute("aria-selected", String(selected));
        t.tabIndex = selected ? 0 : -1;
        const panel = document.getElementById(t.getAttribute("aria-controls"));
        panel.hidden = !selected;
        if (selected) panel.querySelectorAll(".t-item").forEach((item, i) => item.style.setProperty("--i", i));
      });
      moveIndicator(tab);
      if (focus) tab.focus();
      if (lenis) lenis.resize();
    };

    tabs.forEach((tab, i) => {
      tab.addEventListener("click", () => select(tab));
      tab.addEventListener("keydown", (e) => {
        let next = null;
        if (e.key === "ArrowRight") next = tabs[(i + 1) % tabs.length];
        if (e.key === "ArrowLeft") next = tabs[(i - 1 + tabs.length) % tabs.length];
        if (e.key === "Home") next = tabs[0];
        if (e.key === "End") next = tabs[tabs.length - 1];
        if (next) {
          e.preventDefault();
          select(next, true);
        }
      });
    });

    const initIndicator = () => moveIndicator(tabs.find((t) => t.getAttribute("aria-selected") === "true"));
    initIndicator();
    window.addEventListener("resize", initIndicator);
    if (document.fonts) document.fonts.ready.then(initIndicator);
  }

  // ==========================================
  // 7b. STACK : LOGOS + PLUIE DE LOGOS
  // ==========================================
  const iconUrl = (name) => `assets/icons/${name}.svg`;
  const rand = (min, max) => min + Math.random() * (max - min);

  document.querySelectorAll(".chips li[data-icon]").forEach((li) => {
    const wrap = document.createElement("span");
    wrap.className = "chip-icon";
    wrap.setAttribute("aria-hidden", "true");
    const img = new Image(18, 18);
    img.src = iconUrl(li.dataset.icon);
    img.alt = "";
    img.decoding = "async";
    img.loading = "lazy";
    wrap.appendChild(img);
    li.prepend(wrap);
  });

  const rainLayer = document.querySelector(".logo-rain");
  if (rainLayer && !reduceMotion) {
    const GRAVITY = 2600;
    const MAX_BODIES = 48;
    const bodies = [];
    let running = false;
    let lastTime = 0;

    const itemsOf = (els) =>
      els.map((li) => ({
        icon: li.dataset.icon,
        short: li.dataset.short || li.textContent.trim(),
      }));

    const spawn = (item, x, y, vx, vy, life) => {
      const small = window.innerWidth < 760;
      const far = Math.random() < 0.2;
      let size = small ? rand(46, 70) : rand(64, 108);
      if (far) size *= 0.65;

      const el = document.createElement("div");
      el.className = `rain-tile${item.icon ? "" : " is-text"}${far ? " is-far" : ""}`;
      el.style.width = el.style.height = `${size}px`;
      if (item.icon) {
        const img = new Image();
        img.src = iconUrl(item.icon);
        img.alt = "";
        el.appendChild(img);
      } else {
        el.textContent = item.short;
        el.style.fontSize = `${size * (item.short.length > 3 ? 0.2 : 0.26)}px`;
      }
      rainLayer.appendChild(el);

      const now = performance.now();
      bodies.push({
        el, x, y, vx, vy, far,
        r: size / 2,
        a: rand(-30, 30),
        va: rand(-520, 520),
        born: now,
        life,
        outAt: 0,
      });

      // Trop de logos à l'écran : on fait disparaître les plus anciens
      const alive = bodies.filter((b) => !b.outAt);
      if (alive.length > MAX_BODIES) alive.slice(0, alive.length - MAX_BODIES).forEach((b) => fadeOut(b, now));

      if (!running) {
        running = true;
        lastTime = now;
        requestAnimationFrame(step);
      }
    };

    const fadeOut = (b, now) => {
      b.outAt = now;
      b.el.classList.add("is-out");
    };

    const step = (now) => {
      const dt = Math.min(0.032, (now - lastTime) / 1000);
      lastTime = now;
      const W = window.innerWidth;
      const H = window.innerHeight;

      for (const b of bodies) {
        b.vy += GRAVITY * dt;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.a += b.va * dt;

        if (b.y + b.r > H) {
          b.y = H - b.r;
          b.vy = Math.abs(b.vy) < 60 ? 0 : -b.vy * 0.42;
          b.vx *= 0.86;
          b.va = (b.vx / b.r) * 57.3;
        }
        if (b.x - b.r < 0) {
          b.x = b.r;
          b.vx = Math.abs(b.vx) * 0.6;
        } else if (b.x + b.r > W) {
          b.x = W - b.r;
          b.vx = -Math.abs(b.vx) * 0.6;
        }
      }

      // Collisions entre logos d'un même plan : ils s'entassent au lieu de se superposer
      for (let i = 0; i < bodies.length; i++) {
        const a = bodies[i];
        for (let j = i + 1; j < bodies.length; j++) {
          const b = bodies[j];
          if (a.far !== b.far) continue;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const min = (a.r + b.r) * 0.92;
          const dist2 = dx * dx + dy * dy;
          if (dist2 >= min * min || dist2 === 0) continue;
          const dist = Math.sqrt(dist2);
          const nx = dx / dist;
          const ny = dy / dist;
          const push = (min - dist) / 2;
          a.x -= nx * push;
          a.y -= ny * push;
          b.x += nx * push;
          b.y += ny * push;
          const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (rel < 0) {
            const impulse = -rel * 0.65;
            a.vx -= impulse * nx;
            a.vy -= impulse * ny;
            b.vx += impulse * nx;
            b.vy += impulse * ny;
            a.va += impulse * 0.3;
            b.va -= impulse * 0.3;
          }
        }
      }

      for (let i = bodies.length - 1; i >= 0; i--) {
        const b = bodies[i];
        if (!b.outAt && now - b.born > b.life) fadeOut(b, now);
        if (b.outAt && now - b.outAt > 750) {
          b.el.remove();
          bodies.splice(i, 1);
          continue;
        }
        const popIn = Math.min(1, (now - b.born) / 260);
        const shrink = b.outAt ? 1 - Math.min(1, (now - b.outAt) / 750) * 0.4 : 1;
        const scale = (0.4 + 0.6 * popIn) * shrink;
        b.el.style.transform = `translate3d(${b.x - b.r}px, ${b.y - b.r}px, 0) rotate(${b.a}deg) scale(${scale})`;
      }

      if (bodies.length) requestAnimationFrame(step);
      else running = false;
    };

    // Lance tous les logos d'une catégorie en éventail
    const burst = (card, originX, originY) => {
      const items = itemsOf([...card.querySelectorAll(".chips li")]);
      const count = Math.max(items.length + 3, 10);
      const list = [];
      while (list.length < count) list.push(...[...items].sort(() => Math.random() - 0.5));
      list.length = count;

      const spread = Math.min(window.innerWidth * 0.9, 1600);
      list.forEach((item, i) => {
        const t = count > 1 ? i / (count - 1) - 0.5 : 0;
        setTimeout(() => {
          spawn(
            item,
            originX + rand(-20, 20),
            originY + rand(-10, 10),
            t * spread + rand(-120, 120),
            -rand(1100, 1800),
            2500 + i * 80 + rand(0, 300)
          );
        }, i * 45);
      });
    };

    const lastBurst = new WeakMap();
    const tryBurst = (card, x, y) => {
      const now = performance.now();
      if (now - (lastBurst.get(card) || 0) < 1600) return;
      lastBurst.set(card, now);
      burst(card, x, y);
    };
    const cardOrigin = (card) => {
      const r = card.getBoundingClientRect();
      return [r.left + r.width / 2, r.top + r.height * 0.35];
    };

    document.querySelectorAll("[data-rain]").forEach((card) => {
      card.addEventListener("pointerenter", (e) => {
        if (e.pointerType === "mouse") tryBurst(card, e.clientX, e.clientY);
      });
      card.addEventListener("pointerup", (e) => {
        if (e.pointerType !== "mouse") tryBurst(card, e.clientX, e.clientY);
      });
      card.addEventListener("keydown", (e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        tryBurst(card, ...cardOrigin(card));
      });
    });

    // Survol d'une techno précise : son logo seul est lancé
    const lastChip = new WeakMap();
    document.querySelectorAll("[data-rain] .chips li").forEach((li) => {
      li.addEventListener("pointerenter", (e) => {
        if (e.pointerType !== "mouse") return;
        const now = performance.now();
        if (now - (lastChip.get(li) || 0) < 700) return;
        lastChip.set(li, now);
        const r = li.getBoundingClientRect();
        spawn(itemsOf([li])[0], r.left + r.width / 2, r.top, rand(-500, 500), -rand(900, 1300), 1600);
      });
    });
  }

  // ==========================================
  // 8. FORMULAIRE DE CONTACT (EmailJS)
  // ==========================================
  const form = document.querySelector(".contact-form");
  if (form) {
    const status = form.querySelector(".form-status");
    const btn = form.querySelector('button[type="submit"]');
    if (window.emailjs) window.emailjs.init("0KIZsdmC9-6djUAdc");

    const setStatus = (msg, type) => {
      status.textContent = msg;
      status.className = `form-status${type ? ` is-${type}` : ""}`;
    };

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      let valid = true;
      form.querySelectorAll("input, textarea").forEach((field) => {
        const ok = field.checkValidity() && field.value.trim() !== "";
        field.closest(".field").classList.toggle("is-invalid", !ok);
        if (!ok) valid = false;
      });
      if (!valid) {
        setStatus("Merci de remplir correctement tous les champs.", "error");
        return;
      }
      if (!window.emailjs) {
        setStatus("Service indisponible. Écrivez-moi directement à yassinbaligh7@gmail.com.", "error");
        return;
      }

      const original = btn.textContent;
      btn.textContent = "Envoi en cours...";
      btn.disabled = true;
      setStatus("");

      window.emailjs
        .sendForm("service_5rvma1d", "template_m5iakmb", form)
        .then(() => {
          setStatus("Message envoyé. Je vous réponds rapidement.", "success");
          form.reset();
        })
        .catch((error) => {
          console.error("EmailJS:", error);
          setStatus("L'envoi a échoué. Écrivez-moi directement à yassinbaligh7@gmail.com.", "error");
        })
        .finally(() => {
          btn.textContent = original;
          btn.disabled = false;
        });
    });

    form.querySelectorAll("input, textarea").forEach((field) =>
      field.addEventListener("input", () => field.closest(".field").classList.remove("is-invalid"))
    );
  }

  // ==========================================
  // 9. SCÈNE WEBGL DU HERO (shader fluide interactif)
  // ==========================================
  const canvas = document.querySelector(".hero-canvas");
  const gl = canvas && canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
  if (!gl) return;

  const vert = `
    attribute vec2 p;
    void main() { gl_Position = vec4(p, 0.0, 1.0); }
  `;
  const frag = `
    precision highp float;
    uniform vec2 uRes;
    uniform float uTime;
    uniform vec2 uMouse;
    uniform float uHover;

    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
                 mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
    }
    float fbm(vec2 p) {
      float v = 0.0, a = 0.5;
      mat2 r = mat2(0.8, 0.6, -0.6, 0.8);
      for (int i = 0; i < 5; i++) { v += a * noise(p); p = r * p * 2.02; a *= 0.5; }
      return v;
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / uRes;
      float aspect = uRes.x / uRes.y;
      vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
      vec2 m = (uMouse - 0.5) * vec2(aspect, 1.0);
      float t = uTime * 0.05;

      float d = length(p - m);
      float pull = exp(-d * 3.0) * (0.35 + 0.35 * uHover);
      vec2 pp = p * 1.5 + (m - p) * pull;

      vec2 q = vec2(fbm(pp + t), fbm(pp + vec2(5.2, 1.3) - t));
      vec2 r = vec2(fbm(pp + 2.2 * q + vec2(1.7, 9.2) + t * 1.4),
                    fbm(pp + 2.2 * q + vec2(8.3, 2.8) - t * 1.1));
      float f = fbm(pp + 2.4 * r);

      vec3 base = vec3(0.018, 0.02, 0.04);
      vec3 blue = vec3(0.16, 0.24, 1.0);
      vec3 violet = vec3(0.52, 0.34, 1.0);
      vec3 cyan = vec3(0.45, 0.85, 1.0);

      vec3 col = mix(base, blue, smoothstep(0.25, 0.95, f * f * 1.9));
      col = mix(col, violet, smoothstep(0.35, 1.2, length(q)) * 0.55);
      col = mix(col, cyan, smoothstep(0.55, 1.0, r.x) * 0.35 * f);
      col += blue * exp(-d * 5.0) * (0.25 + 0.3 * uHover);

      col *= smoothstep(1.25, 0.25, length((uv - vec2(0.6, 0.55)) * vec2(1.1, 1.3)));
      col += (hash(gl_FragCoord.xy + fract(uTime)) - 0.5) * 0.035;
      gl_FragColor = vec4(col, 1.0);
    }
  `;

  const compile = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  };
  const vs = compile(gl.VERTEX_SHADER, vert);
  const fs = compile(gl.FRAGMENT_SHADER, frag);
  if (!vs || !fs) return;
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(prog, "uRes");
  const uTime = gl.getUniformLocation(prog, "uTime");
  const uMouse = gl.getUniformLocation(prog, "uMouse");
  const uHover = gl.getUniformLocation(prog, "uHover");

  // Rendu en basse résolution : le flou est invisible sur un fluide et divise le coût GPU
  const scale = window.innerWidth < 760 ? 0.35 : 0.5;
  const resize = () => {
    const w = Math.max(1, Math.round(canvas.clientWidth * scale));
    const h = Math.max(1, Math.round(canvas.clientHeight * scale));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
    gl.uniform2f(uRes, w, h);
  };
  resize();
  window.addEventListener("resize", resize);

  const mouse = { x: 0.65, y: 0.55, tx: 0.65, ty: 0.55, hover: 0, th: 0 };
  const hero = canvas.parentElement;
  hero.addEventListener("pointermove", (e) => {
    const r = hero.getBoundingClientRect();
    mouse.tx = (e.clientX - r.left) / r.width;
    mouse.ty = 1 - (e.clientY - r.top) / r.height;
    mouse.th = 1;
  }, { passive: true });
  hero.addEventListener("pointerleave", () => (mouse.th = 0));

  let visible = true;
  new IntersectionObserver(([entry]) => (visible = entry.isIntersecting)).observe(hero);

  const start = performance.now();
  const render = (now) => {
    const t = (now - start) / 1000;
    mouse.x = lerp(mouse.x, mouse.tx, 0.05);
    mouse.y = lerp(mouse.y, mouse.ty, 0.05);
    mouse.hover = lerp(mouse.hover, mouse.th, 0.04);
    gl.uniform1f(uTime, t + 20);
    gl.uniform2f(uMouse, mouse.x, mouse.y);
    gl.uniform1f(uHover, mouse.hover);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  render(performance.now());
  canvas.classList.add("is-ready");

  if (!reduceMotion) {
    const frame = (now) => {
      if (visible && !document.hidden) render(now);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }
})();
