// ==========================================
// CHUTE DE L'ORDINATEUR (3D au scroll)
// Un portable tombe, s'ouvre, s'allume, tape du code,
// puis la caméra plonge dans l'écran pour enchaîner sur « À propos ».
// Three.js n'est chargé qu'à l'approche de la section.
// ==========================================
const section = document.querySelector("[data-drop]");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const hasWebGL = () => {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
};

if (section) {
  if (reduceMotion || !hasWebGL()) {
    section.remove();
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          init().catch(() => section.remove());
        }
      },
      { rootMargin: "150% 0px" }
    );
    io.observe(section);
  }
}

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (p, a, b) => clamp((p - a) / (b - a), 0, 1);
const easeOut = (t) => 1 - (1 - t) ** 3;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

const FONT = '"Inter Tight", system-ui, sans-serif';
const MONO = '"JetBrains Mono", ui-monospace, monospace';

const LINES = [
  ["$ ", "npx create-portfolio yassin-baligh"],
  ["› ", "front-end   react · vite · tailwind"],
  ["› ", "back-end    java · symfony · laravel"],
  ["› ", "données     postgresql · mysql · oracle"],
  ["› ", "ia          chatbots · assistants · mcp"],
  ["$ ", "npm run dev"],
  ["✓ ", "prêt sur geneve.local:3000"],
];
const TOTAL_CHARS = LINES.reduce((n, [, txt]) => n + txt.length, 0);

async function init() {
  const [THREE, { RoundedBoxGeometry }, { RoomEnvironment }] = await Promise.all([
    import("three"),
    import("three/addons/geometries/RoundedBoxGeometry.js"),
    import("three/addons/environments/RoomEnvironment.js"),
  ]);

  const sticky = section.querySelector(".drop-sticky");
  const canvas = section.querySelector(".drop-canvas");
  const hint = section.querySelector(".drop-hint");
  const caption = section.querySelector(".drop-caption");
  const veil = section.querySelector(".drop-veil");
  const small = window.innerWidth < 760;

  // ---------- Rendu ----------
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, small ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 100);
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.6);
  keyLight.position.set(4, 8, 5);
  scene.add(keyLight);

  // ---------- Matériaux ----------
  const alu = new THREE.MeshPhysicalMaterial({ color: 0x2b2e36, metalness: 0.85, roughness: 0.32, clearcoat: 0.4, clearcoatRoughness: 0.3 });
  const deckMat = new THREE.MeshStandardMaterial({ color: 0x121419, metalness: 0.4, roughness: 0.6 });
  const keyMat = new THREE.MeshStandardMaterial({ color: 0x0c0d11, metalness: 0.2, roughness: 0.55 });
  const padMat = new THREE.MeshPhysicalMaterial({ color: 0x3a3d47, metalness: 0.7, roughness: 0.25 });
  const bezelMat = new THREE.MeshStandardMaterial({ color: 0x050608, metalness: 0.3, roughness: 0.2 });

  // ---------- Écran (texture dessinée en canvas 2D) ----------
  const SW = 1280;
  const SH = 800;
  const sc = document.createElement("canvas");
  sc.width = SW;
  sc.height = SH;
  const ctx = sc.getContext("2d");
  const screenTex = new THREE.CanvasTexture(sc);
  screenTex.colorSpace = THREE.SRGBColorSpace;
  screenTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  // Écran sans reflet : la plongée finit sur un aplat exact de la couleur de la page
  const screenMat = new THREE.MeshBasicMaterial({ map: screenTex, color: 0x000000, toneMapped: false });

  // ---------- Modèle ----------
  const W = 3.2; // largeur
  const D = 2.2; // profondeur
  const T = 0.12; // épaisseur de la base
  const H = 2.1; // hauteur de l'écran
  const HALF = T / 2;

  const laptop = new THREE.Group();
  const inner = new THREE.Group();
  inner.position.y = -HALF;
  laptop.add(inner);
  scene.add(laptop);

  const base = new THREE.Mesh(new RoundedBoxGeometry(W, T, D, 4, 0.05), alu);
  base.position.y = T / 2;
  inner.add(base);

  const deck = new THREE.Mesh(new THREE.BoxGeometry(2.92, 0.012, 1.1), deckMat);
  deck.position.set(0, T - 0.004, -0.35);
  inner.add(deck);

  const COLS = 13;
  const ROWS = 5;
  const keys = new THREE.InstancedMesh(new RoundedBoxGeometry(0.18, 0.03, 0.165, 2, 0.012), keyMat, COLS * ROWS);
  const m = new THREE.Matrix4();
  let k = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      m.makeTranslation((c - (COLS - 1) / 2) * 0.215, T + 0.01, -0.35 + (r - (ROWS - 1) / 2) * 0.205);
      keys.setMatrixAt(k++, m);
    }
  }
  inner.add(keys);

  const pad = new THREE.Mesh(new RoundedBoxGeometry(1.2, 0.01, 0.72, 2, 0.004), padMat);
  pad.position.set(0, T, 0.63);
  inner.add(pad);

  const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, W * 0.82, 20), alu);
  hinge.rotation.z = Math.PI / 2;
  hinge.position.set(0, T + 0.02, -D / 2 + 0.03);
  inner.add(hinge);

  // Couvercle : pivot sur l'arrière de la base. rotation.x = PI/2 → fermé, ~-0.2 → ouvert.
  const lid = new THREE.Group();
  lid.position.set(0, T + 0.03, -D / 2 + 0.03);
  inner.add(lid);

  const lidBody = new THREE.Mesh(new RoundedBoxGeometry(W, H, 0.07, 4, 0.03), alu);
  lidBody.position.set(0, H / 2, -0.035);
  lid.add(lidBody);

  const bezel = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.08, H - 0.08), bezelMat);
  bezel.position.set(0, H / 2, 0.001);
  lid.add(bezel);

  const SCREEN_W = 2.96;
  const SCREEN_H = 1.85;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(SCREEN_W, SCREEN_H), screenMat);
  screen.position.set(0, H / 2 + 0.04, 0.002);
  lid.add(screen);

  const logoMat = new THREE.MeshBasicMaterial({ color: 0x8d93a6, toneMapped: false });
  const logo = new THREE.Mesh(new THREE.CircleGeometry(0.16, 40), logoMat);
  logo.rotation.y = Math.PI;
  logo.position.set(0, H / 2, -0.071);
  lid.add(logo);

  const glow = new THREE.PointLight(0x6d7cff, 0, 5, 2);
  glow.position.set(0, H / 2, 0.9);
  lid.add(glow);

  // Ombre douce au sol
  const shadowCanvas = document.createElement("canvas");
  shadowCanvas.width = shadowCanvas.height = 256;
  const sctx = shadowCanvas.getContext("2d");
  const sg = sctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  sg.addColorStop(0, "rgba(11,12,16,0.6)");
  sg.addColorStop(0.55, "rgba(11,12,16,0.25)");
  sg.addColorStop(1, "rgba(11,12,16,0)");
  sctx.fillStyle = sg;
  sctx.fillRect(0, 0, 256, 256);
  const shadowPivot = new THREE.Group();
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(5, 3.6),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowCanvas), transparent: true, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadowPivot.add(shadow);
  scene.add(shadowPivot);

  // ---------- Contenu de l'écran ----------
  let lastKey = "";
  const drawScreen = (chars, logoAlpha, fade) => {
    const key = `${chars}|${logoAlpha.toFixed(2)}|${fade.toFixed(2)}`;
    if (key === lastKey) return;
    lastKey = key;

    ctx.globalAlpha = 1;
    ctx.fillStyle = "#07080c";
    ctx.fillRect(0, 0, SW, SH);
    const g = ctx.createRadialGradient(SW * 0.78, SH * 0.25, 0, SW * 0.78, SH * 0.25, SW * 0.7);
    g.addColorStop(0, "rgba(52,72,255,0.32)");
    g.addColorStop(1, "rgba(52,72,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, SW, SH);

    if (logoAlpha < 1) {
      ctx.globalAlpha = 1 - logoAlpha;
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.fillRect(0, 0, SW, 64);
      ["#ff5f57", "#febc2e", "#28c840"].forEach((c, i) => {
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.arc(44 + i * 34, 32, 10, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.fillStyle = "#8d93a6";
      ctx.font = `500 22px ${MONO}`;
      ctx.textAlign = "center";
      ctx.fillText("yassin@geneve — zsh", SW / 2, 40);
      ctx.textAlign = "left";

      ctx.font = `400 34px ${MONO}`;
      let left = chars;
      let y = 150;
      for (let i = 0; i < LINES.length; i++) {
        const [pre, txt] = LINES[i];
        if (i > 0 && left <= 0) break;
        const shown = txt.slice(0, Math.max(0, Math.min(txt.length, left)));
        left -= txt.length;
        ctx.fillStyle = pre === "› " ? "#8b5cff" : "#22d67e";
        ctx.fillText(pre, 64, y);
        ctx.fillStyle = "#eef0f6";
        ctx.fillText(shown, 64 + ctx.measureText(pre).width, y);
        if (left <= 0) {
          const x = 64 + ctx.measureText(pre + shown).width + 4;
          ctx.fillRect(x, y - 28, 18, 36);
        }
        y += 76;
      }
    }

    if (logoAlpha > 0) {
      ctx.globalAlpha = logoAlpha;
      ctx.fillStyle = "#07080c";
      ctx.fillRect(0, 0, SW, SH);
      const g1 = ctx.createRadialGradient(SW * 0.7, SH * 0.4, 0, SW * 0.7, SH * 0.4, SW * 0.6);
      g1.addColorStop(0, "rgba(52,72,255,0.55)");
      g1.addColorStop(1, "rgba(52,72,255,0)");
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, SW, SH);
      const g2 = ctx.createRadialGradient(SW * 0.3, SH * 0.7, 0, SW * 0.3, SH * 0.7, SW * 0.5);
      g2.addColorStop(0, "rgba(139,92,255,0.35)");
      g2.addColorStop(1, "rgba(139,92,255,0)");
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, SW, SH);

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#eef0f6";
      ctx.letterSpacing = "-12px";
      ctx.font = `700 300px ${FONT}`;
      ctx.fillText("YB", SW / 2, SH / 2 - 40);
      ctx.letterSpacing = "4px";
      ctx.font = `500 30px ${MONO}`;
      ctx.fillStyle = "#8d93a6";
      ctx.fillText("DÉVELOPPEUR FULL STACK", SW / 2, SH / 2 + 130);
      ctx.letterSpacing = "0px";
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
    }

    // Fondu vers la couleur de fond de la page : la plongée finit sur « À propos »
    if (fade > 0) {
      ctx.globalAlpha = fade;
      ctx.fillStyle = "#eceef3";
      ctx.fillRect(0, 0, SW, SH);
    }
    ctx.globalAlpha = 1;
    screenTex.needsUpdate = true;
  };
  if (document.fonts) document.fonts.ready.then(() => (lastKey = ""));

  // ---------- Caméra ----------
  const restTarget = new THREE.Vector3(0, 0.8, 0.15);
  const restDir = new THREE.Vector3(0, 0.24, 1).normalize();
  const restPos = new THREE.Vector3();
  let dClose = 2;

  const resize = () => {
    const w = sticky.clientWidth;
    const h = sticky.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const fitWidth = 2.4 / (t * camera.aspect);
    restPos.copy(restTarget).addScaledVector(restDir, Math.max(7.4, fitWidth));
    // Distance où l'écran recouvre tout le viewport (quel que soit le ratio)
    dClose = Math.min(SCREEN_H / 2 / t, SCREEN_W / 2 / (t * camera.aspect)) * 0.86;
  };
  resize();
  window.addEventListener("resize", resize);

  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  window.addEventListener("pointermove", (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
  });

  // ---------- Timeline pilotée par le scroll ----------
  const S = new THREE.Vector3();
  const N = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const target = new THREE.Vector3();
  const DROP_HEIGHT = 7.5;
  const REST_RY = -0.42;
  let prevFall = 0;
  let shake = 0;

  const update = (p, now) => {
    const fall = seg(p, 0, 0.26);
    const fe = easeOut(fall);
    const bounce = seg(p, 0.26, 0.34);
    const open = easeInOut(seg(p, 0.34, 0.52));
    const power = seg(p, 0.47, 0.56);
    const type = seg(p, 0.55, 0.76);
    const logoAlpha = easeInOut(seg(p, 0.76, 0.84));
    const zoom = easeInOut(seg(p, 0.82, 1));
    const fade = seg(p, 0.9, 0.985);

    if (prevFall < 1 && fall >= 1) shake = 0.07;
    prevFall = fall;

    // Chute (accélère comme sous la gravité), vrille, puis petit rebond
    laptop.position.y = HALF + DROP_HEIGHT * (1 - fall * fall) + (bounce > 0 && bounce < 1 ? Math.sin(bounce * Math.PI) * 0.16 : 0);
    laptop.rotation.set(-0.85 * (1 - fe), lerp(REST_RY - 2.3, REST_RY, fe) * (1 - zoom), 0.5 * (1 - fe));

    // Ouverture et allumage
    lid.rotation.x = lerp(Math.PI / 2, -0.2, open);
    const flicker = power > 0 && power < 1 ? 0.75 + 0.25 * Math.sin(power * 60) : 1;
    const bright = Math.min(1, power * 1.15) * flicker;
    screenMat.color.setScalar(bright);
    logoMat.color.setScalar(lerp(0.35, 1, bright));
    glow.intensity = bright * 4 * (1 - zoom);
    drawScreen(power > 0 ? Math.floor(type * TOTAL_CHARS) : 0, logoAlpha, fade);

    // Ombre
    const h = laptop.position.y - HALF;
    shadowPivot.rotation.y = laptop.rotation.y;
    shadow.scale.setScalar(1 + h * 0.08);
    shadow.material.opacity = clamp(1 - h / 6, 0, 1) * (1 - zoom);

    // Caméra : vue 3/4, puis plongée dans l'écran
    laptop.updateMatrixWorld(true);
    screen.getWorldPosition(S);
    screen.getWorldQuaternion(q);
    N.set(0, 0, 1).applyQuaternion(q);

    pointer.sx = lerp(pointer.sx, pointer.x, 0.05);
    pointer.sy = lerp(pointer.sy, pointer.y, 0.05);
    const free = 1 - zoom;

    camera.position.lerpVectors(restPos, target.copy(S).addScaledVector(N, dClose), zoom);
    camera.position.x += pointer.sx * 0.4 * free;
    camera.position.y += -pointer.sy * 0.25 * free;
    if (shake > 0.001) {
      camera.position.y += Math.sin(now * 0.06) * shake;
      camera.position.x += Math.cos(now * 0.045) * shake * 0.5;
      shake *= 0.88;
    }
    target.lerpVectors(restTarget, S, zoom);
    camera.lookAt(target);

    // Calques HTML
    hint.style.opacity = 1 - seg(p, 0, 0.06);
    const cap = seg(p, 0.3, 0.4) * (1 - seg(p, 0.72, 0.8));
    caption.style.opacity = cap;
    caption.style.transform = `translate3d(0, ${(1 - cap) * 24}px, 0)`;
    veil.style.opacity = seg(p, 0.96, 1);
  };

  // ---------- Boucle (uniquement quand la section est visible) ----------
  let visible = false;
  let raf = 0;
  let cur = -1;

  // L'animation démarre avant que la section se fige : dès que son haut
  // atteint LEAD × la hauteur de l'écran (juste après la marquee).
  const LEAD = 0.6;
  const progress = () => {
    const r = section.getBoundingClientRect();
    const vh = sticky.clientHeight;
    return clamp((vh * LEAD - r.top) / (r.height - vh + vh * LEAD), 0, 1);
  };

  const frame = (now) => {
    raf = 0;
    if (!visible) return;
    const p = progress();
    cur = cur < 0 ? p : lerp(cur, p, 0.16);
    if (Math.abs(p - cur) < 1e-4) cur = p;
    update(cur, now);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  };

  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !raf) raf = requestAnimationFrame(frame);
  }).observe(section);

  canvas.classList.add("is-ready");
}
