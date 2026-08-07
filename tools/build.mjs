/**
 * Genera assets/hero.svg y assets/terminal.svg con el sistema de diseño de dvz-v1.
 *
 * Por qué existe este script y no SVG escritos a mano:
 *
 *  - El wordmark DEVANZIRE se convierte a **trazos** con el eje variable en 200.
 *    GitHub sirve las imágenes del README por su proxy (camo) con una CSP
 *    restrictiva, y no está garantizado que permita una @font-face embebida en
 *    data:. Un trazo no depende de ninguna fuente: se ve igual siempre.
 *  - El resto del texto sí va como <text> con la fuente embebida, pero con
 *    `textLength` fijado a la medida real. Si la CSP deja pasar la fuente, se ve
 *    idéntico al portafolio; si la bloquea, cae a la fuente del sistema y la
 *    maqueta no se mueve, porque el ancho está fijado.
 *
 * Uso:  node tools/build.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as fontkit from "fontkit";
import { decompress } from "wawoff2";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FONTS = path.join(ROOT, "tools", "fonts");
const OUT = path.join(ROOT, "assets");

/* ---------------------------------------------------------------- tokens ---
   Copiados de src/app/globals.css de dvz-v1, tema oscuro. Un solo lugar. */
const T = {
  surface: "#080611",        // --ds-surface-base
  textPrimary: "#f8f4ff",    // --ds-text-primary
  accent: "#f26286",         // --ds-accent
  borderSoft: 0.05,          // --ds-border-soft   (sobre #ffe2f1)
  borderStrong: 0.12,        // --ds-border-strong (sobre #ffe2f1)
  borderTint: "#ffe2f1",
  success: "#7cc7a5",        // --ds-success
  glowViolet: "#7e5ad2",     // --ds-page-glow
  glowPink: "#ff78be",
  // --syntax-* (dark)
  synSurface: "#0e0c15",
  synHeader: "#151221",
  synBorder: "#241f36",
  synFg: "#e8e4f5",
  synComment: "#716788",
  synKeyword: "#c084fc",
  synNumber: "#ffd385",
  synProperty: "#8be9fd",
  radius: 6,                 // --radius-base, un solo valor a propósito
  trackingCapsWide: 0.2,     // --tracking-caps-wide, en em
};

/* --------------------------------------------------------------- fuentes --- */
const woff2 = {
  sans: fs.readFileSync(path.join(FONTS, "dmsans-latin-var.woff2")),
  mono: fs.readFileSync(path.join(FONTS, "jetbrainsmono-latin-var.woff2")),
};
const ttf = {
  sans: Buffer.from(await decompress(woff2.sans)),
  mono: Buffer.from(await decompress(woff2.mono)),
};
const font = {
  sans: fontkit.create(ttf.sans),
  mono: fontkit.create(ttf.mono),
};
const b64 = { sans: woff2.sans.toString("base64"), mono: woff2.mono.toString("base64") };

/** Ancho real de un texto, en px, para un peso y tamaño dados. */
function measure(which, text, size, weight) {
  const f = font[which].getVariation({ wght: weight });
  return (f.layout(text).advanceWidth / font[which].unitsPerEm) * size;
}

/** Ancho con tracking en em añadido entre glifos (como letter-spacing de SVG). */
function measureTracked(which, text, size, weight, trackingEm) {
  return measure(which, text, size, weight) + (text.length - 1) * trackingEm * size;
}

/** El wordmark, como un único `d` de path. Baseline en y=0, empieza en x=0. */
function textToPath(which, text, size, weight) {
  const f = font[which].getVariation({ wght: weight });
  const run = f.layout(text);
  const scale = size / font[which].unitsPerEm;
  let x = 0;
  const parts = [];
  run.glyphs.forEach((g, i) => {
    const d = g.path.translate(x, 0).toSVG();
    if (d) parts.push(d);
    x += run.positions[i].xAdvance;
  });
  return {
    d: parts.join(" "),
    width: x * scale,
    // fontkit trabaja con Y hacia arriba; SVG hacia abajo.
    transform: (tx, ty) => `translate(${tx} ${ty}) scale(${scale} ${-scale})`,
  };
}

/** Estrella de 5 puntas como path — la ★ no está en el subset latino. */
function star(cx, cy, r) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.42;
    const a = (-90 + i * 36) * (Math.PI / 180);
    pts.push(`${(cx + rad * Math.cos(a)).toFixed(2)},${(cy + rad * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join("L")}Z`;
}

const face = `
      @font-face{font-family:'DVZ Sans';src:url(data:font/woff2;base64,${b64.sans}) format('woff2');font-weight:100 1000;font-style:normal}
      @font-face{font-family:'DVZ Mono';src:url(data:font/woff2;base64,${b64.mono}) format('woff2');font-weight:100 800;font-style:normal}
      .sans{font-family:'DVZ Sans',ui-sans-serif,system-ui,sans-serif}
      .mono{font-family:'DVZ Mono',ui-monospace,'SF Mono',Menlo,Consolas,monospace}`;

const bd = (o) => `stroke="${T.borderTint}" stroke-opacity="${o}"`;

/* ============================================================== hero.svg === */
function buildHero() {
  const W = 1200, H = 400;
  const wm = textToPath("sans", "DEVANZIRE", 155, 200);
  const wmX = (W - wm.width) / 2;

  const eyebrow = "INGENIERO DE SOFTWARE | DISEÑADOR UX/UI";
  const ebW = measureTracked("mono", eyebrow, 11, 500, T.trackingCapsWide);

  // La placa del eyebrow: punto de estado + gap + texto, con padding a los lados.
  const padX = 14, dot = 5, gap = 9;
  const plateW = padX * 2 + dot + gap + ebW;
  const plateX = (W - plateW) / 2;
  const dotX = plateX + padX;
  const ebX = dotX + dot + gap;

  const desc = "Documentando ideas, explorando tecnología y divulgando sobre diseño e ingeniería.";

  /* El boot loader de dvz-v1, con sus keyframes tal cual globals.css:
     0.5s de espera, 1s de trazo (4 tramos de 0.25s), 1s de hold y 1s de
     apertura, sobre --boot-duration: 3.5s. Ventana de 160x60 centrada:
     x 520..680, y 170..230.

     Corre UNA vez y congela, igual que en el sitio: en bucle, el banner pasaría
     casi la mitad del tiempo vacío, y quien llegue al perfil justo en esa
     ventana no vería nada. El único movimiento perpetuo es el punto de estado,
     que es exactamente lo que dice globals.css de .ui-status-dot. */
  const BOOT = 3.5;
  const anim = (attr, keyTimes, values) => {
    const n = keyTimes.split(";").length - 1;
    const splines = Array(n).fill("0.42 0 0.58 1").join(";");
    return `<animate attributeName="${attr}" dur="${BOOT}s" repeatCount="1" fill="freeze"
                 calcMode="spline" keyTimes="${keyTimes}" keySplines="${splines}" values="${values}"/>`;
  };

  const kTop = "0;0.1429;0.2143;0.7143;1";
  const kRight = "0;0.2143;0.2857;0.7143;1";
  const kBottom = "0;0.2857;0.3571;0.7143;1";
  const kLeft = "0;0.3571;0.4286;0.7143;1";

  const frame = `
    <g ${bd(0.34)} stroke-width="1" fill="none" shape-rendering="crispEdges">
      <line x1="520" y1="170" x2="520" y2="170">
        ${anim("x1", kTop, "520;520;520;520;0")}
        ${anim("x2", kTop, "520;520;680;680;1200")}
        ${anim("y1", kTop, "170;170;170;170;0")}
        ${anim("y2", kTop, "170;170;170;170;0")}
      </line>
      <line x1="679" y1="170" x2="679" y2="170">
        ${anim("x1", kRight, "679;679;679;679;1199")}
        ${anim("x2", kRight, "679;679;679;679;1199")}
        ${anim("y1", kRight, "170;170;170;170;0")}
        ${anim("y2", kRight, "170;170;230;230;400")}
      </line>
      <line x1="680" y1="229" x2="680" y2="229">
        ${anim("x1", kBottom, "680;680;520;520;0")}
        ${anim("x2", kBottom, "680;680;680;680;1200")}
        ${anim("y1", kBottom, "229;229;229;229;399")}
        ${anim("y2", kBottom, "229;229;229;229;399")}
      </line>
      <line x1="520" y1="230" x2="520" y2="230">
        ${anim("x1", kLeft, "520;520;520;520;1")}
        ${anim("x2", kLeft, "520;520;520;520;1")}
        ${anim("y1", kLeft, "230;230;230;230;400")}
        ${anim("y2", kLeft, "230;230;170;170;0")}
      </line>
    </g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="DEVANZIRE — Ingeniero de software y disenador UX/UI">
  <title>DEVANZIRE — Brian Tarqui</title>
  <desc>Ingeniero de software y disenador UX/UI. github.com/tarquibrian</desc>
  <defs>
    <style>${face}
      .eyebrow{font-size:11px;font-weight:500}
    </style>
    <radialGradient id="glowA" cx="0.15" cy="0" r="0.9">
      <stop offset="0%" stop-color="${T.glowViolet}" stop-opacity="0.14"/>
      <stop offset="68%" stop-color="${T.glowViolet}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowB" cx="1" cy="1" r="0.75">
      <stop offset="0%" stop-color="${T.glowPink}" stop-opacity="0.07"/>
      <stop offset="72%" stop-color="${T.glowPink}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="rule" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${T.borderTint}" stop-opacity="0"/>
      <stop offset="12%" stop-color="${T.borderTint}" stop-opacity="${T.borderStrong}"/>
      <stop offset="88%" stop-color="${T.borderTint}" stop-opacity="${T.borderStrong}"/>
      <stop offset="100%" stop-color="${T.borderTint}" stop-opacity="0"/>
    </linearGradient>
    <clipPath id="card"><rect width="${W}" height="${H}" rx="${T.radius}"/></clipPath>
  </defs>

  <g clip-path="url(#card)">
    <rect width="${W}" height="${H}" fill="${T.surface}"/>
    <rect width="${W}" height="${H}" fill="url(#glowA)"/>
    <rect width="${W}" height="${H}" fill="url(#glowB)"/>
${frame}

    <g opacity="0">
      <!-- boot-content-in: retenido mientras la ventana es una caja chica,
           llega mientras se abre. Congela visible. -->
      <animate attributeName="opacity" dur="${BOOT}s" repeatCount="1" fill="freeze"
               calcMode="spline" keyTimes="0;0.7143;1" keySplines="0.42 0 0.58 1;0.42 0 0.58 1"
               values="0;0;1"/>

      <!-- Los mismos tres elementos del hero de dvz-v1 y en la misma relación:
           la placa a 1.75rem por encima de las mayúsculas del wordmark, y la
           descripción a 1.75rem por debajo de su línea base. El wordmark, con
           leading 0.7 a 155px, ocupa de y=151.5 (alto de mayúscula) a y=260. -->
      <rect x="${plateX.toFixed(1)}" y="93" width="${plateW.toFixed(1)}" height="30" rx="${T.radius}"
            fill="#0c0518" fill-opacity="0.45" ${bd(0.09)}/>
      <rect x="${dotX.toFixed(1)}" y="105.5" width="5" height="5" rx="2" fill="${T.success}">
        <animate attributeName="opacity" values="1;0.35;1" dur="2.4s" repeatCount="indefinite"
                 calcMode="spline" keyTimes="0;0.5;1" keySplines="0.4 0 0.2 1;0.4 0 0.2 1"/>
      </rect>
      <text class="mono eyebrow" x="${ebX.toFixed(1)}" y="112" fill="#ffffff" fill-opacity="0.75"
            textLength="${ebW.toFixed(1)}" lengthAdjust="spacing">${eyebrow}</text>

      <g transform="${wm.transform(wmX.toFixed(1), 260)}" fill="${T.textPrimary}"><path d="${wm.d}"/></g>

      <text class="sans" x="${W / 2}" y="300" font-size="16" font-weight="300" text-anchor="middle"
            fill="#ffffff" fill-opacity="0.75">${desc}</text>
    </g>
  </g>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="${T.radius}" fill="none" ${bd(T.borderStrong)}/>
</svg>
`;
}

/* ========================================================== terminal.svg === */
function buildTerminal() {
  const W = 1200, H = 430;
  const CH = 0.6; // JetBrains Mono: 600/1000 em por carácter, exacto.
  const S = 17, SC = S * CH;          // cuerpo
  const CS = 20, CSC = CS * CH;       // comandos
  const X0 = 96;                      // margen izquierdo del texto
  const COL_A = X0 + 11 * SC;         // columna de valores, bloque --whoami
  const COL_B = X0 + 18 * SC;         // columna de descripción, bloque --now
  const CYCLE = 15;

  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  /** Aparición por opacidad, sobre el ciclo completo. */
  const fadeIn = (t) => {
    const a = (t / CYCLE).toFixed(4), b = ((t + 0.25) / CYCLE).toFixed(4);
    return `<animate attributeName="opacity" dur="${CYCLE}s" repeatCount="indefinite" keyTimes="0;${a};${b};1" values="0;0;1;1"/>`;
  };

  /** El chevron del prompt, como path — ❯ no está en el subset latino. */
  const chevron = (x, y) =>
    `<path d="M${x} ${y - 6}l7 6l-7 6" fill="none" stroke="${T.accent}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`;

  /** Un comando que se escribe solo: el clip revela, el ancho está fijado. */
  const command = (id, text, y, tStart, tEnd) => {
    const w = text.length * CSC;
    const k = [0, tStart / CYCLE, tEnd / CYCLE, 1].map((v) => v.toFixed(4)).join(";");
    return {
      clip: `<clipPath id="${id}"><rect x="${X0}" y="${y - 22}" width="0" height="30"><animate attributeName="width" dur="${CYCLE}s" repeatCount="indefinite" keyTimes="${k}" values="0;0;${w.toFixed(1)};${w.toFixed(1)}"/></rect></clipPath>`,
      body: `<g clip-path="url(#${id})"><text class="mono" x="${X0}" y="${y}" font-size="${CS}" fill="${T.synFg}" textLength="${w.toFixed(1)}" lengthAdjust="spacing">${esc(text)}</text></g>`,
    };
  };

  const cmdA = command("typeA", "brian --whoami", 110, 0.2, 1.3);
  const cmdB = command("typeB", "brian --now", 250, 3.0, 3.9);

  const rowsA = [
    ["rol", "Ingeniero de software · Diseñador UX/UI", 146, 1.7],
    ["enfoque", "producto de punta a punta: research -> UI -> código -> deploy", 174, 1.9],
    ["entorno", "tmux · neovim · dotfiles · shell", 202, 2.1],
  ].map(([k, v, y, t]) =>
    `<g opacity="0">${fadeIn(t)}<text class="mono" x="${X0}" y="${y}" font-size="${S}" fill="${T.synProperty}">${esc(k)}</text><text class="mono" x="${COL_A.toFixed(1)}" y="${y}" font-size="${S}" fill="${T.synFg}" fill-opacity="0.6">${esc(v)}</text></g>`
  ).join("\n      ");

  const projects = [
    ["vanzi", "entorno de desarrollo en shell", 286, 4.3, 8],
    ["facturabot", "facturación fiscal boliviana por WhatsApp", 314, 4.5, null],
    ["devanzire.nvim", "mi configuración de Neovim, hecha plugin", 342, 4.7, null],
    ["puriq-agent", "agente sobre modelos de lenguaje", 370, 4.9, null],
  ].map(([n, d, y, t, stars]) => {
    const sx = COL_B + d.length * SC + 24;
    const badge = stars
      ? `<path d="${star(sx, y - 5, 6)}" fill="${T.synNumber}"/><text class="mono" x="${sx + 11}" y="${y}" font-size="${S}" fill="${T.synNumber}">${stars}</text>`
      : "";
    return `<g opacity="0">${fadeIn(t)}<text class="mono" x="${X0}" y="${y}" font-size="${S}" fill="${T.synKeyword}">${esc(n)}</text><text class="mono" x="${COL_B.toFixed(1)}" y="${y}" font-size="${S}" fill="${T.synComment}">${esc(d)}</text>${badge}</g>`;
  }).join("\n      ");

  const title = "DEVANZIRE — ZSH";
  const titleW = measureTracked("mono", title, 11, 500, T.trackingCapsWide);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Terminal: quien soy y en que trabajo">
  <title>brian --whoami</title>
  <desc>Ingeniero de software y disenador UX/UI. Proyectos: vanzi, facturabot, devanzire.nvim, puriq-agent.</desc>
  <defs>
    <style>${face}</style>
    <clipPath id="win"><rect width="${W}" height="${H}" rx="${T.radius}"/></clipPath>
    ${cmdA.clip}
    ${cmdB.clip}
  </defs>

  <g clip-path="url(#win)">
    <rect width="${W}" height="${H}" fill="${T.synSurface}"/>
    <rect width="${W}" height="40" fill="${T.synHeader}"/>
    <rect y="40" width="${W}" height="1" fill="${T.synBorder}"/>
    <rect x="26" y="16" width="8" height="8" rx="2" fill="${T.accent}" transform="rotate(45 30 20)"/>
    <text class="mono" x="${W / 2}" y="24.5" font-size="11" font-weight="500" text-anchor="middle"
          fill="${T.synFg}" fill-opacity="0.55"
          textLength="${titleW.toFixed(1)}" lengthAdjust="spacing">${title}</text>

    <g>
      <animate attributeName="opacity" dur="${CYCLE}s" repeatCount="indefinite" keyTimes="0;0.94;1" values="1;1;0"/>

      ${chevron(60, 104)}
      ${cmdA.body}
      ${rowsA}

      <g opacity="0">${fadeIn(2.95)}${chevron(60, 244)}</g>
      ${cmdB.body}
      ${projects}

      <g opacity="0">${fadeIn(5.3)}
        ${chevron(60, 402)}
        <rect x="${X0}" y="${402 - 11}" width="10" height="22" fill="${T.accent}">
          <animate attributeName="opacity" values="1;1;0;0;1" keyTimes="0;0.45;0.5;0.95;1" dur="1s" repeatCount="indefinite"/>
        </rect>
      </g>
    </g>
  </g>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="${T.radius}" fill="none" stroke="${T.synBorder}"/>
</svg>
`;
}

fs.mkdirSync(OUT, { recursive: true });
for (const [name, svg] of [["hero.svg", buildHero()], ["terminal.svg", buildTerminal()]]) {
  const p = path.join(OUT, name);
  fs.writeFileSync(p, svg);
  console.log(`${name.padEnd(14)} ${(fs.statSync(p).size / 1024).toFixed(0)} KB`);
}
