"use client";

import { canvasFill, solidColor, fontCss } from "./constants";

// Shared renderer: the on-screen preview and the PNG/JPEG export both go
// through renderDesign(), so what you see is what exports — by construction.
//
// Contract: the renderer draws exclusively in document coordinates
// (doc.canvas.w × doc.canvas.h) under a single uniform transform it applies
// itself from opts.scale (preview: displayScale × devicePixelRatio; export:
// 1 or 2). No layer math ever multiplies by scale — line widths, blur radii
// and letter-spacing scale through the CTM. The only scale-aware code is the
// filtered-image raster cache, which is keyed by scale.
//
// Layers: { id, type: 'text'|'image'|'shape', name, x, y (CENTER), rotation
// (deg, about the center), opacity 0..1, visible, locked } plus per-type
// fields. Renderer reads new fields defensively (?? defaults) so older saved
// docs render without migration.

/* ------------------------------ capabilities ----------------------------- */

let _caps = null;
export function canvasCaps() {
  if (_caps) return _caps;
  if (typeof document === "undefined") return { filter: false, letterSpacing: false };
  const ctx = document.createElement("canvas").getContext("2d");
  ctx.filter = "blur(1px)";
  const filter = ctx.filter !== "none";
  const letterSpacing = typeof ctx.letterSpacing === "string";
  _caps = { filter, letterSpacing };
  return _caps;
}

/* ---------------------------------- text --------------------------------- */

let measureCtx = null;
function getMeasureCtx() {
  if (!measureCtx) {
    const c = document.createElement("canvas");
    c.width = c.height = 1;
    measureCtx = c.getContext("2d");
  }
  return measureCtx;
}

export const fontString = (layer) =>
  `${layer.italic ? "italic" : "normal"} ${layer.weight} ${layer.size}px ${fontCss(layer.font)}`;

// letter-spacing semantics preserved from v1: the stored value scales with
// font size relative to an 18px base. CSS-like trailing-gap policy (n gaps
// for n characters) in both the native and fallback paths.
export const letterSpacingPx = (layer) => layer.letterSpacing * (layer.size / 18);

function applyTextStyle(ctx, layer) {
  ctx.font = fontString(layer);
  if (canvasCaps().letterSpacing) ctx.letterSpacing = `${letterSpacingPx(layer)}px`;
}

function measureLineWidth(ctx, line, spacingPx) {
  if (!line) return 0;
  if (canvasCaps().letterSpacing || spacingPx === 0) return ctx.measureText(line).width;
  let w = 0;
  for (const ch of line) w += ctx.measureText(ch).width;
  return w + spacingPx * line.length;
}

// Greedy word wrap; explicit \n always breaks; a single word wider than the
// limit is broken at character level so long URLs can't overflow.
function breakLongWord(ctx, word, spacingPx, maxWidth) {
  const out = [];
  let cur = "";
  for (const ch of word) {
    if (cur && measureLineWidth(ctx, cur + ch, spacingPx) > maxWidth) {
      out.push(cur);
      cur = ch;
    } else {
      cur += ch;
    }
  }
  if (cur) out.push(cur);
  return out.length ? out : [word];
}

function wrapLine(ctx, line, spacingPx, maxWidth) {
  if (measureLineWidth(ctx, line, spacingPx) <= maxWidth) return [line];
  const words = line.split(" ");
  const out = [];
  let cur = "";
  for (const word of words) {
    const candidate = cur ? cur + " " + word : word;
    if (measureLineWidth(ctx, candidate, spacingPx) <= maxWidth) {
      cur = candidate;
      continue;
    }
    if (cur) out.push(cur);
    if (measureLineWidth(ctx, word, spacingPx) > maxWidth) {
      const pieces = breakLongWord(ctx, word, spacingPx, maxWidth);
      out.push(...pieces.slice(0, -1));
      cur = pieces[pieces.length - 1];
    } else {
      cur = word;
    }
  }
  if (cur) out.push(cur);
  return out.length ? out : [""];
}

// Text layout is cached per layer object (immutable updates give free
// invalidation) and per font generation (webfont loads change metrics).
let fontGeneration = 0;
const layoutCache = new WeakMap();
export function notifyFontsChanged() {
  fontGeneration++;
}

// { lines: [{ text, width }], lineH, boxW, boxH, spacingPx }
export function layoutTextLayer(layer) {
  const hit = layoutCache.get(layer);
  if (hit && hit.gen === fontGeneration) return hit.layout;

  const ctx = getMeasureCtx();
  applyTextStyle(ctx, layer);
  const spacingPx = letterSpacingPx(layer);
  const raw = ((layer.uppercase ? layer.text.toUpperCase() : layer.text) || "").split("\n");
  const hasFixedWidth = typeof layer.width === "number" && layer.width > 0;
  const linesText = hasFixedWidth ? raw.flatMap((l) => wrapLine(ctx, l, spacingPx, layer.width)) : raw;
  const lines = linesText.map((text) => ({ text, width: measureLineWidth(ctx, text, spacingPx) }));
  const lineH = layer.size * layer.lineHeight;
  const boxW = hasFixedWidth ? layer.width : Math.max(1, ...lines.map((l) => l.width));
  const boxH = Math.max(lines.length * lineH, layer.size);
  const layout = { lines, lineH, boxW, boxH, spacingPx };
  layoutCache.set(layer, { gen: fontGeneration, layout });
  return layout;
}

/* -------------------------------- geometry ------------------------------- */

const DEG = Math.PI / 180;

export function layerSize(layer) {
  if (layer.type === "text") {
    const { boxW, boxH } = layoutTextLayer(layer);
    return { w: boxW, h: boxH };
  }
  return { w: layer.w, h: layer.h };
}

// Axis-aligned bounding box of the (possibly rotated) layer, design units.
export function layerAABB(layer) {
  const { w, h } = layerSize(layer);
  const t = (layer.rotation || 0) * DEG;
  const cos = Math.abs(Math.cos(t));
  const sin = Math.abs(Math.sin(t));
  const bw = w * cos + h * sin;
  const bh = w * sin + h * cos;
  return { minX: layer.x - bw / 2, minY: layer.y - bh / 2, maxX: layer.x + bw / 2, maxY: layer.y + bh / 2, w: bw, h: bh };
}

// Transform a design-space point into a layer's local space (center origin,
// unrotated).
export function toLayerSpace(layer, px, py) {
  const t = (layer.rotation || 0) * DEG;
  const dx = px - layer.x;
  const dy = py - layer.y;
  return { x: dx * Math.cos(t) + dy * Math.sin(t), y: -dx * Math.sin(t) + dy * Math.cos(t) };
}

// Local-space vector → design-space vector (rotation only, no translation).
export function fromLayerSpace(layer, lx, ly) {
  const t = (layer.rotation || 0) * DEG;
  return { x: lx * Math.cos(t) - ly * Math.sin(t), y: lx * Math.sin(t) + ly * Math.cos(t) };
}

export function hitTestLayer(layer, px, py, tolerance = 0) {
  const { w, h } = layerSize(layer);
  const p = toLayerSpace(layer, px, py);
  return Math.abs(p.x) <= w / 2 + tolerance && Math.abs(p.y) <= h / 2 + tolerance;
}

// Topmost visible unlocked layer at a point (layers render bottom→top).
export function hitTest(layers, px, py, tolerance = 0) {
  for (let i = layers.length - 1; i >= 0; i--) {
    const layer = layers[i];
    if (!layer.visible || layer.locked) continue;
    if (hitTestLayer(layer, px, py, tolerance)) return layer;
  }
  return null;
}

/* --------------------------------- images -------------------------------- */

// Module-level decoded-image cache keyed by src; onLoad lets callers schedule
// a repaint when a newly referenced image finishes decoding (or fails — the
// export path awaits these callbacks, so errors must flush them too).
const imageCache = new Map();
let imageIdCounter = 0;
export function getImage(src, onLoad) {
  let entry = imageCache.get(src);
  if (!entry) {
    const img = new Image();
    entry = { img, id: ++imageIdCounter, loaded: false, failed: false, callbacks: [] };
    imageCache.set(src, entry);
    const flush = () => {
      const cbs = entry.callbacks;
      entry.callbacks = [];
      cbs.forEach((cb) => cb());
    };
    img.onload = () => {
      entry.loaded = true;
      flush();
    };
    img.onerror = () => {
      entry.failed = true;
      flush();
    };
    img.src = src;
  }
  if (!entry.loaded && !entry.failed && onLoad) entry.callbacks.push(onLoad);
  return entry.loaded ? entry.img : null;
}

// Stable per-source id for cache keys (avoids embedding megabyte dataURLs).
function imageSrcId(src) {
  const entry = imageCache.get(src);
  return entry ? entry.id : src.length;
}

// Filtered results are rasterised once into an offscreen canvas keyed by
// (layer params, render scale) — never re-filtered inside the paint loop, and
// blur therefore scales identically for preview and export.
const filteredCache = new Map();
const FILTER_CACHE_MAX = 24;
const MAX_RASTER = 4096;

export function hasActiveFilters(layer) {
  if (!canvasCaps().filter) return false;
  const f = layer.filters || {};
  return (f.blur || 0) > 0 || (f.brightness ?? 100) !== 100 || (f.grayscale || 0) > 0;
}

function filterKey(layer, scale) {
  const f = layer.filters || {};
  return [
    imageSrcId(layer.src), Math.round(layer.w), Math.round(layer.h),
    layer.fit, layer.posX ?? 50, layer.posY ?? 50, layer.flipH ? 1 : 0,
    f.blur || 0, f.brightness ?? 100, f.grayscale || 0, Math.round(scale * 100),
  ].join("|");
}

function getFilteredImage(layer, img, scale) {
  const key = filterKey(layer, scale);
  const hit = filteredCache.get(key);
  if (hit) return hit;
  const f = layer.filters || {};
  const cap = Math.min(1, MAX_RASTER / Math.max(layer.w * scale, layer.h * scale));
  const s = scale * cap;
  const dw = Math.max(1, Math.round(layer.w * s));
  const dh = Math.max(1, Math.round(layer.h * s));
  const off = document.createElement("canvas");
  off.width = dw;
  off.height = dh;
  const octx = off.getContext("2d");
  const blurPx = (f.blur || 0) * s;
  const parts = [];
  if (blurPx > 0) parts.push(`blur(${blurPx}px)`);
  if ((f.brightness ?? 100) !== 100) parts.push(`brightness(${f.brightness}%)`);
  if ((f.grayscale || 0) > 0) parts.push(`grayscale(${f.grayscale}%)`);
  if (parts.length) octx.filter = parts.join(" ");
  if (layer.flipH) {
    octx.translate(dw, 0);
    octx.scale(-1, 1);
  }
  // Blur samples transparent past the edges, so overdraw the source by >2x
  // the radius and let the canvas bounds crop it — no soft fringe on
  // full-bleed backgrounds.
  drawImageFitRect(octx, img, 0, 0, dw, dh, layer.fit, layer.posX ?? 50, layer.posY ?? 50, blurPx > 0 ? blurPx * 2.5 : 0);
  if (filteredCache.size >= FILTER_CACHE_MAX) filteredCache.delete(filteredCache.keys().next().value);
  filteredCache.set(key, off);
  return off;
}

// Draw img into rect (dx,dy,dw,dh) honouring fit and the focal point
// (posX/posY, 0-100, used by cover cropping and contain placement).
//
// bleed (cover fit only): extend the drawn area past the box on all sides by
// sampling MORE of the source at the same scale — no zoom, no geometry
// distortion — so a blurred full-bleed background doesn't fade to transparent
// at its edges. Contain/fill ignore bleed: soft blurred edges are the correct
// look for a non-full-bleed image.
export function drawImageFitRect(ctx, img, dx, dy, dw, dh, fit, posX = 50, posY = 50, bleed = 0) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih || dw <= 0 || dh <= 0) return;
  let sx = 0, sy = 0, sw = iw, sh = ih;
  let ox = dx, oy = dy, ow = dw, oh = dh;
  const boxRatio = dw / dh;
  const imgRatio = iw / ih;
  if (fit === "cover") {
    if (imgRatio > boxRatio) {
      sw = ih * boxRatio;
      sx = ((iw - sw) * posX) / 100;
    } else {
      sh = iw / boxRatio;
      sy = ((ih - sh) * posY) / 100;
    }
    if (bleed > 0) {
      const scale = dw / sw; // dest px per source px (uniform for cover)
      const want = bleed / scale;
      const ex0 = Math.min(want, sx);
      const ex1 = Math.min(want, iw - sx - sw);
      const ey0 = Math.min(want, sy);
      const ey1 = Math.min(want, ih - sy - sh);
      sx -= ex0; sw += ex0 + ex1;
      sy -= ey0; sh += ey0 + ey1;
      ox = dx - ex0 * scale; ow = dw + (ex0 + ex1) * scale;
      oy = dy - ey0 * scale; oh = dh + (ey0 + ey1) * scale;
    }
  } else if (fit === "contain") {
    if (imgRatio > boxRatio) {
      const drawH = dw / imgRatio;
      oy = dy + ((dh - drawH) * posY) / 100;
      oh = drawH;
    } else {
      const drawW = dh * imgRatio;
      ox = dx + ((dw - drawW) * posX) / 100;
      ow = drawW;
    }
  }
  ctx.drawImage(img, sx, sy, sw, sh, ox, oy, ow, oh);
}

/* -------------------------------- drawing -------------------------------- */

function pathRoundRect(ctx, x, y, w, h, r) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, radius);
  } else if (radius <= 0) {
    ctx.rect(x, y, w, h);
  } else {
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }
}

export function drawStrike(ctx, variant, x, drawY, w, fontSize, color) {
  if (!w || w <= 0) return;
  const thickness = Math.max(1, fontSize * 0.06);
  const centerY = drawY + fontSize * 0.5;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = thickness;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (variant === "double") {
    const offset = thickness * 1.1;
    ctx.beginPath();
    ctx.moveTo(x, centerY - offset);
    ctx.lineTo(x + w, centerY - offset);
    ctx.moveTo(x, centerY + offset);
    ctx.lineTo(x + w, centerY + offset);
    ctx.stroke();
  } else if (variant === "diagonal") {
    ctx.beginPath();
    ctx.moveTo(x, drawY + fontSize * 0.92);
    ctx.lineTo(x + w, drawY + fontSize * 0.08);
    ctx.stroke();
  } else if (variant === "wavy") {
    const period = fontSize * 0.45;
    const amp = fontSize * 0.09;
    ctx.beginPath();
    ctx.moveTo(x, centerY);
    let cx = x;
    let dir = 1;
    while (cx < x + w) {
      const half = period / 2;
      const next = Math.min(cx + half, x + w);
      ctx.quadraticCurveTo((cx + next) / 2, centerY + amp * dir, next, centerY);
      cx = next;
      dir *= -1;
    }
    ctx.stroke();
  } else if (variant === "scribble") {
    const segs = Math.max(8, Math.round(w / (fontSize * 0.45)));
    const amp = thickness * 1.4;
    const prevAlpha = ctx.globalAlpha;
    const drawPath = (phase, lineW, opacity) => {
      ctx.globalAlpha = prevAlpha * opacity;
      ctx.lineWidth = lineW;
      ctx.beginPath();
      ctx.moveTo(x, centerY + Math.sin(phase) * amp);
      for (let s = 1; s <= segs; s++) {
        ctx.lineTo(x + (w * s) / segs, centerY + Math.sin(phase + s * 1.9) * amp);
      }
      ctx.stroke();
    };
    drawPath(0, thickness, 1);
    drawPath(Math.PI, thickness * 0.7, 0.55);
    ctx.globalAlpha = prevAlpha;
  } else if (variant === "marker") {
    const prevAlpha = ctx.globalAlpha;
    ctx.globalAlpha = prevAlpha * 0.4;
    pathRoundRect(ctx, x, drawY + fontSize * 0.2, w, fontSize * 0.6, thickness);
    ctx.fill();
    ctx.globalAlpha = prevAlpha;
  } else {
    ctx.beginPath();
    ctx.moveTo(x, centerY + fontSize * 0.05);
    ctx.lineTo(x + w, centerY + fontSize * 0.05);
    ctx.stroke();
  }
  ctx.restore();
}

// Draw a text layer with the origin at the layer center (caller has already
// translated/rotated). Gradient fills span each line (v1 semantics) in
// layer-local space, so they rotate with the layer.
function drawTextLayer(ctx, layer) {
  const { lines, lineH, boxW, boxH, spacingPx } = layoutTextLayer(layer);
  applyTextStyle(ctx, layer);
  ctx.textBaseline = "top";
  // CSS line-height centres the glyph in the line box; textBaseline "top"
  // draws from the top of the em square, so offset by the half-leading.
  const halfLeading = (layer.size * (layer.lineHeight - 1)) / 2;
  const top = -boxH / 2;
  const left = -boxW / 2;
  const native = canvasCaps().letterSpacing;

  lines.forEach((line, i) => {
    let x = left;
    if (layer.align === "center") x = left + (boxW - line.width) / 2;
    else if (layer.align === "right") x = left + boxW - line.width;
    const drawY = top + i * lineH + halfLeading;

    ctx.fillStyle = canvasFill(ctx, layer.color, x, 0, x + Math.max(line.width, 1), 0);

    if (!native && spacingPx !== 0) {
      let cx = x;
      for (const ch of line.text) {
        ctx.fillText(ch, cx, drawY);
        cx += ctx.measureText(ch).width + spacingPx;
      }
    } else if (line.text) {
      ctx.fillText(line.text, x, drawY);
    }

    if (layer.strikethrough && line.text) {
      drawStrike(ctx, layer.strikeStyle, x, drawY, line.width, layer.size, solidColor(layer.color));
    }
  });
}

function drawImageLayer(ctx, layer, scale, onImageLoad) {
  const img = layer.src ? getImage(layer.src, onImageLoad) : null;
  const { w, h } = layer;
  if (!img) {
    ctx.fillStyle = "rgba(128,128,128,0.25)";
    pathRoundRect(ctx, -w / 2, -h / 2, w, h, layer.cornerRadius || 0);
    ctx.fill();
    return;
  }
  ctx.save();
  pathRoundRect(ctx, -w / 2, -h / 2, w, h, layer.cornerRadius || 0);
  ctx.clip();
  if (hasActiveFilters(layer)) {
    ctx.drawImage(getFilteredImage(layer, img, scale), -w / 2, -h / 2, w, h);
  } else if (layer.flipH) {
    ctx.scale(-1, 1);
    drawImageFitRect(ctx, img, -w / 2, -h / 2, w, h, layer.fit, layer.posX ?? 50, layer.posY ?? 50);
  } else {
    drawImageFitRect(ctx, img, -w / 2, -h / 2, w, h, layer.fit, layer.posX ?? 50, layer.posY ?? 50);
  }
  ctx.restore();
}

function drawShapeLayer(ctx, layer) {
  const { w, h } = layer;
  if (layer.shape === "ellipse") {
    ctx.beginPath();
    ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
  } else if (layer.shape === "pill") {
    pathRoundRect(ctx, -w / 2, -h / 2, w, h, h / 2);
  } else if (layer.shape === "line") {
    ctx.beginPath();
    ctx.rect(-w / 2, -h / 2, w, h);
  } else {
    pathRoundRect(ctx, -w / 2, -h / 2, w, h, layer.cornerRadius || 0);
  }
  if (layer.fill && layer.fill !== "none") {
    ctx.fillStyle = canvasFill(ctx, layer.fill, -w / 2, -h / 2, w / 2, h / 2);
    ctx.fill();
  }
  if (layer.stroke && layer.stroke !== "none" && (layer.strokeWidth || 0) > 0) {
    ctx.strokeStyle = solidColor(layer.stroke);
    ctx.lineWidth = layer.strokeWidth;
    ctx.stroke();
  }
}

// Layers whose internal draws overlap must fade as a unit: composite through
// an offscreen buffer, or a 50%-opacity strikethrough shows blended over its
// own glyphs instead of the whole layer fading uniformly.
function hasOverlappingDraws(layer) {
  if (layer.type === "text") return !!layer.strikethrough;
  if (layer.type === "shape") return layer.fill && layer.fill !== "none" && layer.stroke && layer.stroke !== "none" && (layer.strokeWidth || 0) > 0;
  return false;
}

function drawLayerContent(ctx, layer, scale, onImageLoad) {
  if (layer.type === "text") drawTextLayer(ctx, layer);
  else if (layer.type === "image") drawImageLayer(ctx, layer, scale, onImageLoad);
  else if (layer.type === "shape") drawShapeLayer(ctx, layer);
}

function drawLayerBuffered(ctx, layer, alpha, scale, onImageLoad) {
  const { w, h } = layerSize(layer);
  // Pad for strokes and strike overdraw that extend past the layer box.
  const pad = Math.max(8, (layer.strokeWidth || 0), (layer.type === "text" ? layer.size * 0.2 : 0));
  const cap = Math.min(1, MAX_RASTER / Math.max((w + pad * 2) * scale, (h + pad * 2) * scale));
  const s = Math.max(0.05, scale * cap);
  const off = document.createElement("canvas");
  off.width = Math.max(1, Math.round((w + pad * 2) * s));
  off.height = Math.max(1, Math.round((h + pad * 2) * s));
  const octx = off.getContext("2d");
  octx.setTransform(s, 0, 0, s, (w / 2 + pad) * s, (h / 2 + pad) * s);
  drawLayerContent(octx, layer, s, onImageLoad);
  ctx.globalAlpha = alpha;
  ctx.drawImage(off, -(w / 2 + pad), -(h / 2 + pad), w + pad * 2, h + pad * 2);
}

/* ------------------------------ renderDesign ----------------------------- */

// opts:
//   scale          device px per design unit (applied via setTransform here)
//   skipLayerId    hide one layer (inline text editing overlay)
//   transparentBg  omit the background fill (transparent PNG export)
//   onImageLoad    called when a referenced image finishes decoding
export function renderDesign(ctx, doc, opts = {}) {
  const { scale = 1, skipLayerId = null, transparentBg = false, onImageLoad } = opts;
  const { w, h } = doc.canvas;

  ctx.save();
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, w, h);

  if (!transparentBg) {
    ctx.fillStyle = canvasFill(ctx, doc.canvas.background, 0, 0, w, h);
    ctx.fillRect(0, 0, w, h);
  }

  for (const layer of doc.layers) {
    if (layer.visible === false || layer.id === skipLayerId) continue;
    const alpha = Math.max(0, Math.min(1, layer.opacity ?? 1));
    if (alpha <= 0) continue;
    ctx.save();
    ctx.translate(layer.x, layer.y);
    if (layer.rotation) ctx.rotate(layer.rotation * DEG);
    if (layer.blendMode && layer.blendMode !== "normal") ctx.globalCompositeOperation = layer.blendMode;
    if (alpha < 1 && hasOverlappingDraws(layer)) {
      drawLayerBuffered(ctx, layer, alpha, scale, onImageLoad);
    } else {
      ctx.globalAlpha = alpha;
      drawLayerContent(ctx, layer, scale, onImageLoad);
    }
    ctx.restore();
  }
  ctx.restore();
}

/* --------------------------------- fonts --------------------------------- */

export async function loadFontsForLayers(layers) {
  if (typeof document === "undefined" || !document.fonts) return;
  const loads = layers
    .filter((l) => l.type === "text")
    .map((l) => document.fonts.load(`${l.italic ? "italic" : "normal"} ${l.weight} ${Math.max(l.size, 8)}px ${fontCss(l.font)}`, l.text || "Ag"));
  try {
    await Promise.all(loads);
  } catch {
    /* draw with fallback fonts rather than failing */
  }
}

/* -------------------------------- export --------------------------------- */

const MAX_EXPORT_PIXELS = 16e6; // stay under iOS Safari canvas-area limits

// Renders the doc and resolves to a Blob. JPEG cannot carry alpha, so
// transparentBg only applies to PNG; JPEG always paints the doc background.
export async function exportDesign(doc, { pixelRatio = 1, format = "png", quality = 0.92, transparentBg = false } = {}) {
  await loadFontsForLayers(doc.layers);
  if (document.fonts) {
    try {
      await document.fonts.ready;
    } catch { /* proceed with whatever loaded */ }
  }
  notifyFontsChanged();
  await Promise.all(
    doc.layers
      .filter((l) => l.type === "image" && l.src)
      .map((l) => new Promise((resolve) => {
        if (getImage(l.src, resolve)) resolve();
        // Failed decodes render as placeholders rather than hanging the export.
        setTimeout(resolve, 8000);
      }))
  );
  let ratio = pixelRatio;
  const px = doc.canvas.w * doc.canvas.h * ratio * ratio;
  if (px > MAX_EXPORT_PIXELS) ratio = Math.sqrt(MAX_EXPORT_PIXELS / (doc.canvas.w * doc.canvas.h));

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(doc.canvas.w * ratio));
  canvas.height = Math.max(1, Math.ceil(doc.canvas.h * ratio));
  // Paint at a scale that covers both (ceiled) axes so rounding never leaves
  // a transparent/dark hairline on the bottom or right edge.
  const paintScale = Math.max(canvas.width / doc.canvas.w, canvas.height / doc.canvas.h);
  const ctx = canvas.getContext("2d");
  renderDesign(ctx, doc, { scale: paintScale, transparentBg: transparentBg && format === "png" });
  const mime = format === "jpeg" ? "image/jpeg" : "image/png";
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Export failed"))), mime, quality);
  });
  return blob;
}

// Small raster of the doc for gallery thumbnails.
export function renderThumbnail(doc, maxDim = 240) {
  const s = Math.min(maxDim / doc.canvas.w, maxDim / doc.canvas.h);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(doc.canvas.w * s));
  canvas.height = Math.max(1, Math.round(doc.canvas.h * s));
  renderDesign(canvas.getContext("2d"), doc, { scale: s });
  return canvas.toDataURL("image/jpeg", 0.7);
}

/* ----------------------------- import helpers ---------------------------- */

// Read a File into a dataURL, downscaling anything over maxDim and
// re-encoding through a canvas (which also bakes in EXIF orientation).
// JPEG for photos, PNG kept only for sources that may carry alpha.
export function importImageFile(file, maxDim = 2400) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const iw = img.naturalWidth;
        const ih = img.naturalHeight;
        if (!iw || !ih) return reject(new Error("Could not read image"));
        const keepAlpha = file.type === "image/png" || file.type === "image/webp" || file.type === "image/svg+xml" || file.type === "image/gif";
        const ratio = Math.min(1, maxDim / Math.max(iw, ih));
        if (ratio >= 1) {
          // Small enough to keep as-is: no re-encode needed.
          resolve({ src: reader.result, w: iw, h: ih });
          return;
        }
        const c = document.createElement("canvas");
        c.width = Math.round(iw * ratio);
        c.height = Math.round(ih * ratio);
        const cctx = c.getContext("2d");
        cctx.imageSmoothingQuality = "high";
        cctx.drawImage(img, 0, 0, c.width, c.height);
        resolve({
          src: c.toDataURL(keepAlpha ? "image/png" : "image/jpeg", 0.88),
          w: c.width,
          h: c.height,
        });
      };
      img.onerror = () => reject(new Error("Could not decode image"));
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
