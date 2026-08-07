# Cómo publicar y mantener este perfil

Los SVG de `assets/` **no se editan a mano**: los genera `tools/build.mjs` a partir del
sistema de diseño de tu portafolio (`dvz-v1`). Si tocás un texto o un color, se cambia en
el script y se regenera.

```bash
npm install && npm run build
```

## 1. Publicarlo

GitHub muestra en tu portada el README de un repo **público** que se llame igual que tu
usuario: `tarquibrian/tarquibrian`. Ese repo todavía no existe.

1. Creá el repo en <https://github.com/new> con nombre exacto **`tarquibrian`**,
   visibilidad **Public**, y **sin** marcar "Add a README file".
2. Desde esta carpeta:

```bash
git init -b main && git add . && git commit -m "Perfil de GitHub" && git remote add origin git@github.com:tarquibrian/tarquibrian.git && git push -u origin main
```

## 2. Activar la serpiente de contribuciones

El bloque "Contribuciones" queda **roto hasta que el workflow corra por primera vez**
(apunta a una rama `output` que aún no existe). Después del primer push:

1. Pestaña **Actions** → habilitá los workflows si te lo pide.
2. *Generar serpiente de contribuciones* → **Run workflow**.
3. **Settings → Actions → General → Workflow permissions** debe estar en
   *Read and write permissions*, o el workflow no puede crear la rama `output`.

## 3. De dónde sale cada valor

Todo lo visual está copiado de `src/app/globals.css` de `dvz-v1`, tema oscuro, y vive en
un solo objeto `T` al principio de `tools/build.mjs`:

| Token en dvz-v1 | Valor | Dónde se usa acá |
| :--- | :--- | :--- |
| `--ds-surface-base` | `#080611` | fondo del hero |
| `--ds-text-primary` | `#f8f4ff` | el wordmark |
| `--ds-accent` | `#f26286` | prompt, cursor, rombo, serpiente |
| `--ds-success` | `#7cc7a5` | punto de estado |
| `--ds-page-glow` | violeta 14% / rosa 7% | los dos halos del hero |
| `--radius-base` | `6px` | **el único** radio, en todo |
| `--tracking-caps-wide` | `0.2em` | eyebrow y título del terminal |
| `--syntax-*` | varios | los colores del terminal |
| `--boot-duration` | `3.5s` | la secuencia de arranque del hero |

El hero reproduce tu **boot loader**: la hairline de 1px se dibuja en cuatro tramos
alrededor de una ventana de 160x60 y después se abre hasta los bordes, con el mismo
reparto de tiempos que `globals.css` (0.5s de espera, 1s de trazo, 1s de hold, 1s de
apertura). Corre **una sola vez y congela**, igual que en tu sitio: en bucle, el banner
pasaría casi la mitad del tiempo vacío y quien entre justo en esa ventana no vería nada.
El único movimiento perpetuo es el punto de estado — que es literalmente lo que dice el
comentario de `.ui-status-dot` en tu CSS.

## 4. Las fuentes

`tools/fonts/` tiene los subsets latinos variables de **DM Sans** y **JetBrains Mono**,
copiados de lo que `next/font` ya había descargado en `dvz-v1`. El script hace dos cosas
distintas con ellos:

- **El wordmark `DEVANZIRE` se convierte a trazos** (`fontkit`, eje `wght` en 200). GitHub
  sirve las imágenes del README por su proxy (camo) con una CSP restrictiva y no está
  garantizado que deje pasar una `@font-face` embebida en `data:`. Un trazo no depende de
  ninguna fuente, así que la pieza central se ve igual siempre.
- **El resto va como `<text>`** con la fuente embebida en base64 y el ancho fijado con
  `textLength` medido por `fontkit`. Si la CSP deja pasar la fuente, se ve idéntico al
  portafolio; si la bloquea, cae a la fuente del sistema **sin que la maqueta se mueva**,
  porque el ancho ya está fijado.

Para comprobar cuál de los dos casos te tocó, mirá el perfil publicado: si el eyebrow y el
terminal salen en JetBrains Mono, la fuente pasó; si salen en la mono del sistema, la CSP
la bloqueó y el diseño degradó como estaba previsto.

Cada SVG pesa ~110 KB por las fuentes embebidas. Si preferís bajarlo, borrá la constante
`face` del script: perdés las fuentes propias pero el wordmark y la maqueta quedan igual.

## 5. Si cambiás los textos

Editá las cadenas en `tools/build.mjs` y corré `npm run build`. **No hay números que
recalcular a mano**: el script mide cada texto con `fontkit` y deriva de ahí los anchos,
la placa del eyebrow y las columnas del terminal.

Las cadenas están en `buildHero()` (`eyebrow`, `desc`, y el `"DEVANZIRE"` de `textToPath`)
y en `buildTerminal()` (los arrays `rowsA` y `projects`).

Dos cuidados al escribir:

- El subset latino no trae `❯`, `★` ni `→`. Por eso el chevron y la estrella se dibujan
  como paths, y las flechas se escriben `->` — JetBrains Mono tiene ligaduras y las
  convierte en `→` sola.
- El terminal es monoespaciado y las columnas se calculan por número de caracteres
  (`COL_A`, `COL_B`). Si un nombre de proyecto pasa de 18 caracteres, subí `COL_B`.

## 6. Revisá esto antes de publicar

- El hero dice **"INGENIERO DE SOFTWARE | DISEÑADOR UX/UI"** y la descripción es la de tu
  home — las tomé de `i18n-config.ts`. Si tu posicionamiento en GitHub debe ser otro,
  cambialas.
- El **punto verde** al lado del eyebrow es tu `.ui-status-dot` y se lee como
  "disponible". Si no estás buscando trabajo, sacá ese `<rect>` del script.
- Tu **email** aparece dos veces en el `README.md`. Es tu correo personal y va a quedar
  público e indexado.
- **`facturabot`** aparece descrito como facturación fiscal boliviana. Es público en tu
  cuenta, pero confirmá que querés darle esa visibilidad en la portada.

## 7. Lo que falta y no está en este repo

Tres cosas que hacen más por tu perfil que cualquier animación, y que se cambian en la web
de GitHub:

1. **Ninguno de tus ~50 repos tiene descripción.** Ni uno. Es la primera columna que ve
   quien entra a tu pestaña de repositorios y ahora mismo está vacía. Poné una línea en los
   8–10 que te importan (`vanzi`, `devanzire.nvim`, `facturabot`, `puriq-agent`,
   `terbol-webapp`, los `tmux-*`).
2. **No tenés bio** — <https://github.com/settings/profile>.
3. **Repos fijados**: revisá que los 6 sean los que mejor te representan hoy y que todos
   tengan descripción y README.
