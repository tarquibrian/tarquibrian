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


/* Cada SVG embebe solo la fuente que usa: el terminal y el workspace son
   íntegramente monoespaciados, y cargarles DM Sans les sumaba ~50 KB muertos. */
const faceMono = `
      @font-face{font-family:'DVZ Mono';src:url(data:font/woff2;base64,${b64.mono}) format('woff2');font-weight:100 800;font-style:normal}
      .mono{font-family:'DVZ Mono',ui-monospace,'SF Mono',Menlo,Consolas,monospace}`;
const face = `
      @font-face{font-family:'DVZ Sans';src:url(data:font/woff2;base64,${b64.sans}) format('woff2');font-weight:100 1000;font-style:normal}
      .sans{font-family:'DVZ Sans',ui-sans-serif,system-ui,sans-serif}${faceMono}`;

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
/* =========================================================== session.svg ===
   Un solo activo en lugar de terminal.svg + workspace.svg. Los dos eran, en
   realidad, la misma cosa partida: una sesión de tmux. Unidos en una ventana
   con dos paneles, el ancho completo del README queda ocupado —el terminal
   solo tenía medio cuadro vacío— y la barra de estado, que es la que le da
   sentido a la escena, se dibuja una vez en vez de dos.

   Izquierda: la lectura de identidad y el chequeo del entorno.
   Derecha:   el editor, con su árbol de archivos. */
function buildSession() {
  /* La altura la fija el panel izquierdo, que es el que tiene contenido finito:
     el cursor cierra en y=316 y debajo queda un margen de 28. El panel del
     editor rellena solo hasta donde llegue. Sobredimensionarla dejaba un hueco
     muerto abajo a la izquierda. */
  const W = 1200, H = 372;
  const BAR = 34, STATUS = 28;
  const BODY = H - STATUS;             // el cuerpo llega hasta acá
  const SPLIT = 620;                   // corte vertical entre los dos paneles
  const TREE = SPLIT + 130;            // fin del árbol de archivos
  const CYCLE = 11;

  const CH = 0.6;                      // JetBrains Mono: 600/1000 em, exacto
  const S = 14, SC = S * CH;           // cuerpo del panel izquierdo
  const CS = 16, CSC = CS * CH;        // comandos
  const X0 = 40;                       // margen del texto en el panel izquierdo
  const COL = X0 + 10 * SC;            // columna de valores

  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const fadeIn = (t) => {
    const a = (t / CYCLE).toFixed(4), b = ((t + 0.25) / CYCLE).toFixed(4);
    return `<animate attributeName="opacity" dur="${CYCLE}s" repeatCount="indefinite" keyTimes="0;${a};${b};1" values="0;0;1;1"/>`;
  };

  /** El chevron del prompt, como path — ❯ no está en el subset latino. */
  const chevron = (x, y) =>
    `<path d="M${x} ${y - 5}l6 5l-6 5" fill="none" stroke="${T.accent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;

  /** El tilde de vanzi doctor — ✓ tampoco está en el subset. */
  const check = (x, y) =>
    `<path d="M${x} ${y}l3 3.4l6.5-7.4" fill="none" stroke="${T.success}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`;

  /** Un comando que se escribe solo: el clip revela y el ancho está fijado. */
  const command = (id, text, y, t0, t1) => {
    const w = text.length * CSC;
    const k = [0, t0 / CYCLE, t1 / CYCLE, 1].map((v) => v.toFixed(4)).join(";");
    return {
      clip: `<clipPath id="${id}"><rect x="${X0}" y="${y - 18}" width="0" height="26"><animate attributeName="width" dur="${CYCLE}s" repeatCount="indefinite" keyTimes="${k}" values="0;0;${w.toFixed(1)};${w.toFixed(1)}"/></rect></clipPath>`,
      body: `<g clip-path="url(#${id})"><text class="mono" x="${X0}" y="${y}" font-size="${CS}" fill="${T.synFg}" textLength="${w.toFixed(1)}" lengthAdjust="spacing">${esc(text)}</text></g>`,
    };
  };

  const cmd1 = command("t1", "brian --whoami", 72, 0.3, 1.4);
  const cmd2 = command("t2", "vanzi doctor", 196, 3.4, 4.4);

  const rows = [
    ["rol", "Ingeniero de software · Diseñador UX/UI", 102, 1.8],
    ["enfoque", "producto de punta a punta", 126, 2.0],
    ["entorno", "tmux · neovim · dotfiles · shell", 150, 2.2],
  ].map(([k, v, y, t]) =>
    `<g opacity="0">${fadeIn(t)}<text class="mono" x="${X0}" y="${y}" font-size="${S}" fill="${T.synProperty}">${esc(k)}</text><text class="mono" x="${COL.toFixed(1)}" y="${y}" font-size="${S}" fill="${T.synFg}" fill-opacity="0.62">${esc(v)}</text></g>`
  ).join("\n      ");

  const checks = [["tmux", 226, 4.8], ["neovim", 250, 5.0], ["dotfiles", 274, 5.2]]
    .map(([n, y, t]) =>
      `<g opacity="0">${fadeIn(t)}${check(X0 + 2, y - 4)}<text class="mono" x="${X0 + 22}" y="${y}" font-size="${S}" fill="${T.synFg}" fill-opacity="0.5">${esc(n)}</text></g>`
    ).join("\n      ");

  /* --------------------------------------------------- panel del editor --- */
  const files = [
    ["lua/", T.synComment, 0], ["init.lua", T.synKeyword, 1], ["keymaps.lua", T.synFg, 1],
    ["vanzi/", T.synComment, 0], ["install.sh", T.synFg, 1], [".tmux.conf", T.synFg, 0],
  ].map(([n, c, ind], i) =>
    `<text class="mono" x="${SPLIT + 18 + ind * 10}" y="${BAR + 28 + i * 21}" font-size="10" fill="${c}"${c === T.synFg ? ' fill-opacity="0.55"' : ""}>${esc(n)}</text>`
  ).join("\n      ");

  /* Barras en vez de código: a este tamaño el texto real sería ilegible y me
     obligaría a inventar código que no existe. LCG con semilla fija para que
     dos ejecuciones del mismo commit den un archivo idéntico. */
  let seed = 20260807;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  const palette = [T.synKeyword, T.synProperty, T.synString, T.synFg, T.synComment, T.synNumber];
  const LEFT = TREE + 46, RIGHT = W - 34;

  let cy = BAR + 26, lineNo = 1;
  const code = [], gutter = [];
  while (cy < BODY - 16) {
    gutter.push(`<text class="mono" x="${TREE + 32}" y="${cy + 3.5}" font-size="9" fill="${T.synComment}" fill-opacity="0.45" text-anchor="end">${lineNo}</text>`);
    let cx = LEFT + (rnd() < 0.42 ? 0 : rnd() < 0.72 ? 14 : 28);
    while (cx < RIGHT - 26) {
      const w = 22 + Math.floor(rnd() * 78);
      if (cx + w > RIGHT) break;
      code.push(`<rect x="${cx.toFixed(0)}" y="${cy}" width="${w}" height="4" rx="2" fill="${palette[Math.floor(rnd() * palette.length)]}" fill-opacity="0.5"/>`);
      cx += w + 10;
      if (rnd() < 0.22) break;
    }
    cy += 18;
    lineNo++;
  }

  const title = "DEVANZIRE — TMUX";
  const titleW = measureTracked("mono", title, 10, 500, T.trackingCapsWide);
  const seg = "DVZ", segW = seg.length * 9 * 0.6 + 20;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Sesion de tmux: identidad y entorno de trabajo">
  <title>DEVANZIRE — tmux</title>
  <desc>Rol: ingeniero de software y disenador UX/UI. Enfoque: producto de punta a punta. Entorno: tmux, neovim, dotfiles, shell.</desc>
  <defs>
    <style>${faceMono}</style>
    <clipPath id="sesWin"><rect width="${W}" height="${H}" rx="${T.radius}"/></clipPath>
    ${cmd1.clip}
    ${cmd2.clip}
  </defs>

  <g clip-path="url(#sesWin)">
    <rect width="${W}" height="${H}" fill="${T.synSurface}"/>

    <rect width="${W}" height="${BAR}" fill="${T.synHeader}"/>
    <rect x="22" y="13" width="8" height="8" rx="2" fill="${T.accent}" transform="rotate(45 26 17)"/>
    <text class="mono" x="${W / 2}" y="21" font-size="10" font-weight="500" text-anchor="middle"
          fill="${T.synFg}" fill-opacity="0.5"
          textLength="${titleW.toFixed(1)}" lengthAdjust="spacing">${title}</text>
    <rect y="${BAR}" width="${W}" height="1" fill="${T.synBorder}"/>

    <!-- panel izquierdo: identidad y chequeo del entorno -->
    <g>
      <animate attributeName="opacity" dur="${CYCLE}s" repeatCount="indefinite" keyTimes="0;0.95;1" values="1;1;0"/>
      ${chevron(22, 67)}
      ${cmd1.body}
      ${rows}

      <g opacity="0">${fadeIn(3.35)}${chevron(22, 191)}</g>
      ${cmd2.body}
      ${checks}

      <g opacity="0">${fadeIn(5.6)}
        ${chevron(22, 307)}
        <rect x="${X0}" y="298" width="8" height="18" fill="${T.accent}">
          <animate attributeName="opacity" values="1;1;0;0;1" keyTimes="0;0.45;0.5;0.95;1" dur="1s" repeatCount="indefinite"/>
        </rect>
      </g>
    </g>

    <!-- separador de paneles y árbol de archivos -->
    <rect x="${SPLIT}" y="${BAR}" width="1" height="${BODY - BAR}" fill="${T.synBorder}"/>
    ${files}
    <rect x="${TREE}" y="${BAR}" width="1" height="${BODY - BAR}" fill="${T.synBorder}"/>

    <!-- panel derecho: el editor -->
    ${gutter.join("\n    ")}
    ${code.join("\n    ")}

    <!-- barra de estado de tmux, una sola para toda la sesión -->
    <rect y="${BODY}" width="${W}" height="${STATUS}" fill="${T.synHeader}"/>
    <rect y="${BODY}" width="${W}" height="1" fill="${T.synBorder}"/>
    <rect y="${BODY}" width="${segW}" height="${STATUS}" fill="${T.accent}"/>
    <text class="mono" x="${segW / 2}" y="${BODY + STATUS / 2 + 3.5}" font-size="9" font-weight="700"
          fill="${T.synSurface}" text-anchor="middle" letter-spacing="1.2">${seg}</text>
    <text class="mono" x="${segW + 16}" y="${BODY + STATUS / 2 + 3.5}" font-size="9" fill="${T.synFg}"
          fill-opacity="0.45" letter-spacing="1">1:editor  2:server  3:db</text>
    <text class="mono" x="${W - 16}" y="${BODY + STATUS / 2 + 3.5}" font-size="9" fill="${T.synFg}"
          fill-opacity="0.3" text-anchor="end" letter-spacing="1">devanzire.com</text>
  </g>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="${T.radius}" fill="none" stroke="${T.synBorder}"/>
</svg>
`;
}

fs.mkdirSync(OUT, { recursive: true });
for (const [name, svg] of [["hero.svg", buildHero()], ["session.svg", buildSession()]]) {
  const p = path.join(OUT, name);
  fs.writeFileSync(p, svg);
  console.log(`${name.padEnd(14)} ${(fs.statSync(p).size / 1024).toFixed(0)} KB`);
}
