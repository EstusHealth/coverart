"use client";

import { BLOCK_PRESETS, TEMPLATES, CANVAS_SIZES, remapColor } from "./constants";
import { layerSize, layerAABB, fromLayerSpace } from "./render";

let idCounter = 0;
export function newId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `layer-${Date.now()}-${++idCounter}`;
}

const TEXT_DEFAULTS = {
  type: "text",
  rotation: 0,
  opacity: 1,
  visible: true,
  locked: false,
  width: null,
};

export function makeTextLayer(preset, overrides = {}) {
  const base = BLOCK_PRESETS[preset] || BLOCK_PRESETS["Body"];
  return {
    id: newId(),
    name: "",
    text: "Text",
    x: 0,
    y: 0,
    ...TEXT_DEFAULTS,
    ...base,
    ...overrides,
  };
}

export function makeImageLayer(overrides = {}) {
  return {
    id: newId(),
    type: "image",
    name: "",
    x: 0,
    y: 0,
    w: 400,
    h: 300,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    src: "",
    fit: "cover",
    posX: 50,
    posY: 50,
    cornerRadius: 0,
    flipH: false,
    filters: { blur: 0, brightness: 100, grayscale: 0 },
    ...overrides,
  };
}

export function makeShapeLayer(overrides = {}) {
  return {
    id: newId(),
    type: "shape",
    name: "",
    x: 0,
    y: 0,
    w: 300,
    h: 200,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    shape: "rect",
    fill: "Estus Orange",
    stroke: "none",
    strokeWidth: 0,
    cornerRadius: 0,
    ...overrides,
  };
}

// "Set as background" shortcut: a full-bleed, locked cover image at the
// bottom of the stack plus a locked colour overlay above it — locked so the
// background never steals clicks meant for the content on top of it.
export function makeBackgroundLayers(src, canvas, brand) {
  const image = makeImageLayer({
    name: "Background",
    src,
    x: canvas.w / 2,
    y: canvas.h / 2,
    w: canvas.w,
    h: canvas.h,
    fit: "cover",
    locked: true,
  });
  const overlay = makeShapeLayer({
    name: "Overlay",
    role: "overlay",
    shape: "rect",
    x: canvas.w / 2,
    y: canvas.h / 2,
    w: canvas.w,
    h: canvas.h,
    fill: brand === "Health" ? "Deep Navy" : "Black",
    opacity: 0.5,
    locked: true,
  });
  return { image, overlay };
}

/* ------------------------------ stack reflow ------------------------------ */
// Template-derived text layers carry stack: { id, index, gap } so the group
// keeps the old flow layout's guarantee: edit any text and the stack re-tidies
// itself (heights re-measured, gaps preserved, group centre kept). Moving a
// member on canvas detaches it (Stage removes .stack); style/text edits don't.

export function stackMembers(layers, stackId) {
  return layers
    .filter((l) => l.stack && l.stack.id === stackId && l.type === "text" && l.visible)
    .sort((a, b) => a.stack.index - b.stack.index);
}

// Recompute y positions for one stack, preserving the group's vertical centre
// and each layer's own x. Returns the same array when nothing moved.
export function retidyStack(layers, stackId) {
  const members = stackMembers(layers, stackId);
  if (!members.length) return layers;
  const sizes = members.map((m) => layerSize(m));
  let minY = Infinity;
  let maxY = -Infinity;
  members.forEach((m, i) => {
    minY = Math.min(minY, m.y - sizes[i].h / 2);
    maxY = Math.max(maxY, m.y + sizes[i].h / 2);
  });
  const centerY = (minY + maxY) / 2;
  const totalH = members.reduce((sum, m, i) => sum + (i === 0 ? 0 : m.stack.gap) + sizes[i].h, 0);
  let y = centerY - totalH / 2;
  const nextY = new Map();
  members.forEach((m, i) => {
    if (i > 0) y += m.stack.gap;
    nextY.set(m.id, y + sizes[i].h / 2);
    y += sizes[i].h;
  });
  let changed = false;
  const out = layers.map((l) => {
    if (nextY.has(l.id) && Math.abs(nextY.get(l.id) - l.y) > 0.01) {
      changed = true;
      return { ...l, y: nextY.get(l.id) };
    }
    return l;
  });
  return changed ? out : layers;
}

export function retidyAllStacks(layers) {
  const ids = [...new Set(layers.filter((l) => l.stack).map((l) => l.stack.id))];
  return ids.reduce((acc, id) => retidyStack(acc, id), layers);
}

// Keep the anchor edge implied by text alignment fixed when a text layer's
// box width changes (left-aligned text keeps its left edge, etc). The shift
// happens along the layer's local x-axis so rotated text anchors correctly.
export function preserveAnchorX(oldLayer, newLayer) {
  if (newLayer.type !== "text") return newLayer;
  const oldW = layerSize(oldLayer).w;
  const newW = layerSize(newLayer).w;
  if (Math.abs(oldW - newW) < 0.01) return newLayer;
  let localDx = 0;
  if (newLayer.align === "left") localDx = (newW - oldW) / 2;
  else if (newLayer.align === "right") localDx = (oldW - newW) / 2;
  else return newLayer;
  const d = fromLayerSpace(newLayer, localDx, 0);
  return { ...newLayer, x: newLayer.x + d.x, y: newLayer.y + d.y };
}

// Fields whose change can alter a text layer's measured box.
export const TEXT_METRIC_FIELDS = ["text", "size", "lineHeight", "letterSpacing", "font", "weight", "italic", "uppercase", "width", "align"];

/* ------------------------------- templates -------------------------------- */

// Instantiate a flow-spec template as positioned, stack-grouped text layers
// for the given canvas. Colours remap into the active brand.
export function instantiateTemplate(templateKey, canvas, brand, padding = 60) {
  const spec = TEMPLATES[templateKey];
  if (!spec) return [];
  const stackId = newId();
  const layers = spec.blocks.map((block, i) => {
    const { preset, marginTop, text, ...overrides } = block;
    return makeTextLayer(preset, {
      text,
      ...overrides,
      color: remapColor(overrides.color || BLOCK_PRESETS[preset].color, brand, "text"),
      stack: { id: stackId, index: i, gap: marginTop },
    });
  });

  // Vertical flow: stack heights + gaps, centred on the canvas.
  const sizes = layers.map((l) => layerSize(l));
  const totalH = layers.reduce((sum, l, i) => sum + (i === 0 ? 0 : l.stack.gap) + sizes[i].h, 0);
  let y = (canvas.h - totalH) / 2;
  layers.forEach((l, i) => {
    if (i > 0) y += l.stack.gap;
    l.y = y + sizes[i].h / 2;
    y += sizes[i].h;
    if (l.align === "left") l.x = padding + sizes[i].w / 2;
    else if (l.align === "right") l.x = canvas.w - padding - sizes[i].w / 2;
    else l.x = canvas.w / 2;
  });
  return layers;
}

// Pseudo-layers carrying the font/weight/style/text of every block in a
// template, for await-ing webfonts BEFORE positions are measured and baked.
export function templateFontProbes(templateKey) {
  const spec = TEMPLATES[templateKey];
  if (!spec) return [];
  return spec.blocks.map((b) => ({ type: "text", ...BLOCK_PRESETS[b.preset], ...b }));
}

export function createDefaultDoc(brand = "Estus") {
  const preset = "IG Story (1080x1920)";
  const canvas = { preset, ...CANVAS_SIZES[preset], background: "Off-Black" };
  return {
    brand,
    canvas,
    layers: instantiateTemplate("hero-statement", canvas, brand),
  };
}

/* --------------------------- canvas size adapt ---------------------------- */

const isFullBleed = (layer, canvas) => {
  if (layer.type === "text") return false;
  return layer.w >= canvas.w * 0.98 && layer.h >= canvas.h * 0.98 && Math.abs(layer.x - canvas.w / 2) < canvas.w * 0.05 && Math.abs(layer.y - canvas.h / 2) < canvas.h * 0.05;
};

// Adapt every layer to a new canvas size: uniform scale (min ratio) about the
// canvas centre, then shift so the content bounding box re-centres. Full-bleed
// backgrounds/overlays are re-stretched to cover the new canvas exactly.
export function adaptLayersToSize(layers, oldCanvas, newCanvas) {
  const s = Math.min(newCanvas.w / oldCanvas.w, newCanvas.h / oldCanvas.h);
  const scaled = layers.map((layer) => {
    if (isFullBleed(layer, oldCanvas)) {
      return { ...layer, x: newCanvas.w / 2, y: newCanvas.h / 2, w: newCanvas.w, h: newCanvas.h, rotation: 0 };
    }
    const next = {
      ...layer,
      x: newCanvas.w / 2 + (layer.x - oldCanvas.w / 2) * s,
      y: newCanvas.h / 2 + (layer.y - oldCanvas.h / 2) * s,
    };
    if (layer.type === "text") {
      next.size = Math.max(6, Math.round(layer.size * s * 10) / 10);
      if (typeof layer.width === "number" && layer.width > 0) next.width = layer.width * s;
      if (layer.stack) next.stack = { ...layer.stack, gap: layer.stack.gap * s };
    } else {
      next.w = layer.w * s;
      next.h = layer.h * s;
      if (layer.cornerRadius) next.cornerRadius = layer.cornerRadius * s;
      if (layer.type === "shape" && layer.strokeWidth) next.strokeWidth = layer.strokeWidth * s;
    }
    return next;
  });

  // Re-centre the content bounding box (ignoring full-bleed layers).
  const content = scaled.filter((l) => !isFullBleed(l, newCanvas));
  if (content.length) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    content.forEach((l) => {
      const bb = layerAABB(l);
      minX = Math.min(minX, bb.minX);
      minY = Math.min(minY, bb.minY);
      maxX = Math.max(maxX, bb.maxX);
      maxY = Math.max(maxY, bb.maxY);
    });
    const dx = newCanvas.w / 2 - (minX + maxX) / 2;
    const dy = newCanvas.h / 2 - (minY + maxY) / 2;
    return scaled.map((l) => (isFullBleed(l, newCanvas) ? l : { ...l, x: l.x + dx, y: l.y + dy }));
  }
  return scaled;
}

/* ------------------------- misc layer utilities --------------------------- */

export function layerDisplayName(layer) {
  if (layer.name) return layer.name;
  if (layer.type === "text") return (layer.text || "Text").split("\n")[0].substring(0, 24) || "Text";
  if (layer.type === "image") return "Image";
  return layer.shape === "line" ? "Line" : layer.shape === "ellipse" ? "Ellipse" : layer.shape === "pill" ? "Pill" : "Rectangle";
}

export function isOffCanvas(layer, canvas) {
  const bb = layerAABB(layer);
  return bb.maxX < 0 || bb.maxY < 0 || bb.minX > canvas.w || bb.minY > canvas.h;
}
