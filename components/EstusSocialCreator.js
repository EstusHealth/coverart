"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BRANDS,
  BRAND_REMAP,
  BLOCK_PRESETS,
  PRESET_PLACEHOLDER,
  CANVAS_SIZES,
  remapColor,
} from "../lib/constants";
import {
  loadFontsForLayers,
  notifyFontsChanged,
  exportDesign,
  renderThumbnail,
  importImageFile,
  layerAABB,
} from "../lib/render";
import {
  newId,
  makeTextLayer,
  makeImageLayer,
  makeShapeLayer,
  makeBackgroundLayers,
  instantiateTemplate,
  templateFontProbes,
  createDefaultDoc,
  adaptLayersToSize,
  retidyStack,
  retidyAllStacks,
  preserveAnchorX,
  TEXT_METRIC_FIELDS,
} from "../lib/templates";
import { useHistory } from "../lib/history";
import {
  saveAutosave,
  loadAutosave,
  saveToGallery,
  listGallery,
  loadFromGallery,
  deleteFromGallery,
  kvGet,
  kvSet,
  downloadDesignFile,
  parseDesignFile,
} from "../lib/storage";
import Stage from "./Stage";
import Sidebar from "./panels/Sidebar";
import LayersPanel from "./panels/LayersPanel";
import Inspector from "./panels/Inspector";

const ALIGN_MARGIN = 60;

export default function EstusSocialCreator() {
  const h = useHistory(null);
  const { doc, docRef, setDoc, beginTransient, endTransient, isTransient, undo, redo, amendDoc, replaceDoc, canUndo, canRedo } = h;

  const [ready, setReady] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showSafeZone, setShowSafeZone] = useState(false);
  const [repaintTick, setRepaintTick] = useState(0);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportOpts, setExportOpts] = useState({ format: "png", scale: 1, transparent: false });
  const [exporting, setExporting] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [gallery, setGallery] = useState([]);
  const [designMeta, setDesignMeta] = useState({ id: null, name: "Untitled" });
  const [hasLogo, setHasLogo] = useState(false);
  const [toast, setToast] = useState(null);
  const [narrow, setNarrow] = useState(false);

  const clipboardRef = useRef(null);
  const fileInputRef = useRef(null);
  const filePurposeRef = useRef({ kind: "image" });
  const designMetaRef = useRef(designMeta);
  designMetaRef.current = designMeta;

  const brand = doc?.brand || "Estus";
  const accent = BRANDS[brand].accent;

  /* ------------------------------ initial load ----------------------------- */

  useEffect(() => {
    let cancelled = false;
    (async () => {
      kvGet("logo").then((l) => !cancelled && setHasLogo(!!l));
      const saved = await loadAutosave();
      if (cancelled) return;
      if (saved) {
        await loadFontsForLayers(saved.doc.layers);
        notifyFontsChanged();
        if (cancelled) return;
        replaceDoc(saved.doc);
        if (saved.meta && (saved.meta.id || saved.meta.name)) setDesignMeta({ id: saved.meta.id || null, name: saved.meta.name || "Untitled" });
      } else {
        await loadFontsForLayers(templateFontProbes("hero-statement"));
        notifyFontsChanged();
        if (cancelled) return;
        replaceDoc(createDefaultDoc());
      }
      setReady(true);
    })();
    return () => { cancelled = true; };
  }, [replaceDoc]);

  // Late webfont loads change text metrics: re-measure, re-tidy, repaint —
  // without touching undo history.
  useEffect(() => {
    if (typeof document === "undefined" || !document.fonts) return;
    const onDone = () => {
      notifyFontsChanged();
      amendDoc((prev) => {
        const layers = retidyAllStacks(prev.layers);
        return layers === prev.layers ? prev : { ...prev, layers };
      });
      setRepaintTick((t) => t + 1);
    };
    document.fonts.addEventListener("loadingdone", onDone);
    return () => document.fonts.removeEventListener("loadingdone", onDone);
  }, [amendDoc]);

  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < 768);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /* ------------------------------- selection ------------------------------- */

  const effSelected = useMemo(
    () => (doc ? selectedIds.filter((id) => doc.layers.some((l) => l.id === id)) : []),
    [selectedIds, doc]
  );
  const effSelectedRef = useRef(effSelected);
  effSelectedRef.current = effSelected;

  useEffect(() => {
    if (editingId && doc && !doc.layers.some((l) => l.id === editingId)) setEditingId(null);
  }, [editingId, doc]);

  /* ----------------------------- layer editing ----------------------------- */

  const updateLayer = useCallback((id, updates, opts) => {
    setDoc((prev) => {
      const idx = prev.layers.findIndex((l) => l.id === id);
      if (idx < 0) return prev;
      const old = prev.layers[idx];
      // No-op edits (re-clicking the active swatch, same slider value) must
      // not push history entries or clear the redo stack.
      if (Object.keys(updates).every((k) => old[k] === updates[k])) return prev;
      let next = { ...old, ...updates };
      if (updates.stack === null) delete next.stack;
      const metricChanged = old.type === "text" && TEXT_METRIC_FIELDS.some((f) => f in updates);
      // Callers that pass explicit x/y (Stage resize) already anchored the
      // geometry themselves — don't anchor-correct on top of them.
      if (metricChanged && !("x" in updates) && !("y" in updates)) next = preserveAnchorX(old, next);
      let layers = prev.layers.slice();
      layers[idx] = next;
      if (metricChanged && next.stack) layers = retidyStack(layers, next.stack.id);
      return { ...prev, layers };
    }, opts);
  }, [setDoc]);

  // Bulk updates from Stage drags must honour the transient flag.
  const updateLayersBulkOpts = useCallback((entries, opts) => {
    setDoc((prev) => {
      const map = new Map(entries.map((e) => [e.id, e.updates]));
      let changed = false;
      const layers = prev.layers.map((l) => {
        const u = map.get(l.id);
        if (!u || Object.keys(u).every((k) => l[k] === u[k])) return l;
        changed = true;
        const next = { ...l, ...u };
        if (u.stack === null) delete next.stack;
        return next;
      });
      return changed ? { ...prev, layers } : prev;
    }, opts);
  }, [setDoc]);

  const updateSelected = useCallback((updates, opts) => {
    updateLayersBulkOpts(effSelectedRef.current.map((id) => ({ id, updates })), opts);
  }, [updateLayersBulkOpts]);

  const deleteLayers = useCallback((ids) => {
    if (!ids.length) return;
    setDoc((prev) => {
      const removed = prev.layers.filter((l) => ids.includes(l.id));
      if (!removed.length) return prev;
      let layers = prev.layers.filter((l) => !ids.includes(l.id));
      const stackIds = [...new Set(removed.filter((l) => l.stack).map((l) => l.stack.id))];
      layers = stackIds.reduce((acc, sid) => retidyStack(acc, sid), layers);
      return { ...prev, layers };
    });
    setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
  }, [setDoc]);

  // Duplicates of stacked layers stay in the stack (inserted right below the
  // original — the checklist workflow); free layers cascade +16px.
  const duplicateLayers = useCallback((ids) => {
    if (!ids.length) return;
    const newIds = [];
    setDoc((prev) => {
      let layers = prev.layers.slice();
      const stacksTouched = new Set();
      ids.forEach((id) => {
        const idx = layers.findIndex((l) => l.id === id);
        if (idx < 0) return;
        const orig = layers[idx];
        const dup = { ...orig, id: newId(), locked: false };
        if (orig.stack) {
          dup.stack = { ...orig.stack, index: orig.stack.index + 0.5 };
          stacksTouched.add(orig.stack.id);
        } else {
          dup.x += 16;
          dup.y += 16;
        }
        layers.splice(idx + 1, 0, dup);
        newIds.push(dup.id);
      });
      stacksTouched.forEach((sid) => {
        const members = layers.filter((l) => l.stack && l.stack.id === sid).sort((a, b) => a.stack.index - b.stack.index);
        members.forEach((m, i) => {
          const j = layers.indexOf(m);
          layers[j] = { ...m, stack: { ...m.stack, index: i } };
        });
        layers = retidyStack(layers, sid);
      });
      return { ...prev, layers };
    });
    if (newIds.length) setSelectedIds(newIds);
  }, [setDoc]);

  const moveZ = useCallback((id, dir) => {
    setDoc((prev) => {
      const idx = prev.layers.findIndex((l) => l.id === id);
      const ni = idx + dir;
      if (idx < 0 || ni < 0 || ni >= prev.layers.length) return prev;
      const layers = prev.layers.slice();
      [layers[idx], layers[ni]] = [layers[ni], layers[idx]];
      return { ...prev, layers };
    });
  }, [setDoc]);

  const reorderTo = useCallback((dragId, targetId) => {
    setDoc((prev) => {
      const from = prev.layers.findIndex((l) => l.id === dragId);
      const ti = prev.layers.findIndex((l) => l.id === targetId);
      if (from < 0 || ti < 0 || from === ti) return prev;
      const layers = prev.layers.slice();
      const [item] = layers.splice(from, 1);
      const tiAfter = layers.findIndex((l) => l.id === targetId);
      layers.splice(from > ti ? tiAfter : tiAfter + 1, 0, item);
      return { ...prev, layers };
    });
  }, [setDoc]);

  const recenterLayer = useCallback((id) => {
    setDoc((prev) => ({
      ...prev,
      layers: prev.layers.map((l) => (l.id === id ? { ...l, x: prev.canvas.w / 2, y: prev.canvas.h / 2 } : l)),
    }));
  }, [setDoc]);

  const alignSelected = useCallback((type) => {
    const ids = effSelectedRef.current;
    setDoc((prev) => {
      const { w: W, h: H } = prev.canvas;
      let changed = false;
      const layers = prev.layers.map((l) => {
        if (!ids.includes(l.id) || l.locked) return l;
        const bb = layerAABB(l);
        let dx = 0;
        let dy = 0;
        if (type === "left") dx = ALIGN_MARGIN - bb.minX;
        else if (type === "centerH") dx = W / 2 - (bb.minX + bb.maxX) / 2;
        else if (type === "right") dx = W - ALIGN_MARGIN - bb.maxX;
        else if (type === "top") dy = ALIGN_MARGIN - bb.minY;
        else if (type === "centerV") dy = H / 2 - (bb.minY + bb.maxY) / 2;
        else if (type === "bottom") dy = H - ALIGN_MARGIN - bb.maxY;
        if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return l;
        changed = true;
        return { ...l, x: l.x + dx, y: l.y + dy };
      });
      return changed ? { ...prev, layers } : prev;
    });
  }, [setDoc]);

  const toggleLock = useCallback((id) => {
    setDoc((prev) => ({ ...prev, layers: prev.layers.map((l) => (l.id === id ? { ...l, locked: !l.locked } : l)) }));
  }, [setDoc]);

  const toggleVisible = useCallback((id) => {
    // Missing `visible` means visible, so toggle relative to that default.
    setDoc((prev) => ({ ...prev, layers: prev.layers.map((l) => (l.id === id ? { ...l, visible: l.visible === false } : l)) }));
  }, [setDoc]);

  const renameLayer = useCallback((id, name) => {
    setDoc((prev) => ({ ...prev, layers: prev.layers.map((l) => (l.id === id ? { ...l, name } : l)) }));
  }, [setDoc]);

  /* ------------------------------ brand switch ----------------------------- */

  const switchBrand = useCallback((next) => {
    const d = docRef.current;
    if (!d || next === d.brand) return;
    const bgFor = (c) => {
      if (typeof c === "string" && c.startsWith("#")) return c;
      const m = BRAND_REMAP[next].bg[c];
      if (m) return m;
      return BRANDS[next].colors[c] ? c : BRANDS[next].defaultBg;
    };
    setDoc((prev) => ({
      ...prev,
      brand: next,
      canvas: { ...prev.canvas, background: bgFor(prev.canvas.background) },
      layers: prev.layers.map((l) => {
        if (l.type === "text") return { ...l, color: remapColor(l.color, next, "text") };
        if (l.type === "shape") {
          const fillKind = l.role === "overlay" ? "overlay" : "bg";
          return {
            ...l,
            fill: l.fill && l.fill !== "none" ? remapColor(l.fill, next, fillKind) : l.fill,
            stroke: l.stroke && l.stroke !== "none" ? remapColor(l.stroke, next, "text") : l.stroke,
          };
        }
        return l;
      }),
    }));
  }, [docRef, setDoc]);

  /* ------------------------------ canvas size ------------------------------ */

  const setCanvasPreset = useCallback((name) => {
    setDoc((prev) => {
      const size = CANVAS_SIZES[name];
      if (!size) return prev;
      if (prev.canvas.preset === name && prev.canvas.w === size.w && prev.canvas.h === size.h) return prev;
      if (prev.canvas.w === size.w && prev.canvas.h === size.h) return { ...prev, canvas: { ...prev.canvas, preset: name } };
      const canvas = { ...prev.canvas, preset: name, w: size.w, h: size.h };
      return { ...prev, canvas, layers: adaptLayersToSize(prev.layers, prev.canvas, canvas) };
    });
  }, [setDoc]);

  const setCustomSize = useCallback((w, hgt) => {
    setDoc((prev) => {
      if (prev.canvas.w === w && prev.canvas.h === hgt) return prev;
      const canvas = { ...prev.canvas, preset: "Custom", w, h: hgt };
      return { ...prev, canvas, layers: adaptLayersToSize(prev.layers, prev.canvas, canvas) };
    });
  }, [setDoc]);

  /* ------------------------------- templates ------------------------------- */

  const applyTemplate = useCallback(async (key) => {
    await loadFontsForLayers(templateFontProbes(key));
    notifyFontsChanged();
    setDoc((prev) => {
      const kept = prev.layers.filter((l) => l.locked);
      return { ...prev, layers: [...kept, ...instantiateTemplate(key, prev.canvas, prev.brand)] };
    });
    setSelectedIds([]);
    setEditingId(null);
  }, [setDoc]);

  /* ------------------------------- add layers ------------------------------ */

  const addText = useCallback((preset) => {
    const d = docRef.current;
    if (!d) return;
    const p = BLOCK_PRESETS[preset];
    const layer = makeTextLayer(preset, {
      text: PRESET_PLACEHOLDER[preset] || "Text",
      color: remapColor(p.color, d.brand, "text"),
      x: d.canvas.w / 2,
      y: d.canvas.h / 2,
    });
    setDoc((prev) => ({ ...prev, layers: [...prev.layers, layer] }));
    setSelectedIds([layer.id]);
  }, [docRef, setDoc]);

  const addShape = useCallback((shape) => {
    const d = docRef.current;
    if (!d) return;
    const W = d.canvas.w;
    const base = {
      rect: { w: W * 0.4, h: W * 0.25 },
      ellipse: { w: W * 0.3, h: W * 0.3 },
      pill: { w: W * 0.4, h: W * 0.12 },
      line: { w: W * 0.5, h: 6 },
    }[shape] || { w: W * 0.4, h: W * 0.25 };
    const layer = makeShapeLayer({
      shape,
      ...base,
      x: d.canvas.w / 2,
      y: d.canvas.h / 2,
      fill: remapColor("Estus Orange", d.brand, "bg"),
    });
    setDoc((prev) => ({ ...prev, layers: [...prev.layers, layer] }));
    setSelectedIds([layer.id]);
  }, [docRef, setDoc]);

  const insertLogo = useCallback((logo) => {
    const d = docRef.current;
    if (!d || !logo) return;
    const targetW = Math.min(d.canvas.w * 0.16, logo.w);
    const s = targetW / logo.w;
    const layer = makeImageLayer({
      src: logo.src,
      name: "Logo",
      fit: "contain",
      w: logo.w * s,
      h: logo.h * s,
      x: d.canvas.w - (logo.w * s) / 2 - 60,
      y: d.canvas.h - (logo.h * s) / 2 - 60,
    });
    setDoc((prev) => ({ ...prev, layers: [...prev.layers, layer] }));
    setSelectedIds([layer.id]);
  }, [docRef, setDoc]);

  const openFile = useCallback((purpose) => {
    filePurposeRef.current = purpose;
    const input = fileInputRef.current;
    if (!input) return;
    input.accept = purpose.kind === "design" ? "application/json,.json" : "image/*";
    input.click();
  }, []);

  const onFileChange = useCallback(async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const purpose = filePurposeRef.current;
    try {
      if (purpose.kind === "design") {
        const imported = parseDesignFile(await file.text());
        await loadFontsForLayers(imported.layers);
        notifyFontsChanged();
        replaceDoc(imported);
        setDesignMeta({ id: null, name: file.name.replace(/\.json$/i, "") || "Imported design" });
        setSelectedIds([]);
        setGalleryOpen(false);
        return;
      }
      const { src, w, h: ih } = await importImageFile(file);
      const d = docRef.current;
      if (!d) return;
      if (purpose.kind === "image") {
        const s = Math.min((d.canvas.w * 0.6) / w, (d.canvas.h * 0.6) / ih, 1);
        const layer = makeImageLayer({ src, w: w * s, h: ih * s, x: d.canvas.w / 2, y: d.canvas.h / 2 });
        setDoc((prev) => ({ ...prev, layers: [...prev.layers, layer] }));
        setSelectedIds([layer.id]);
      } else if (purpose.kind === "background") {
        setDoc((prev) => {
          const bgIdx = prev.layers.findIndex((l) => l.type === "image" && l.name === "Background" && l.locked);
          if (bgIdx >= 0) {
            const layers = prev.layers.slice();
            layers[bgIdx] = { ...layers[bgIdx], src, x: prev.canvas.w / 2, y: prev.canvas.h / 2, w: prev.canvas.w, h: prev.canvas.h };
            return { ...prev, layers };
          }
          const { image, overlay } = makeBackgroundLayers(src, prev.canvas, prev.brand);
          return { ...prev, layers: [image, overlay, ...prev.layers] };
        });
        setToast("Background + overlay added (locked so they don't steal clicks — unlock in Layers)");
      } else if (purpose.kind === "logo") {
        await kvSet("logo", { src, w, h: ih });
        setHasLogo(true);
        insertLogo({ src, w, h: ih });
      } else if (purpose.kind === "replace" && purpose.id) {
        updateLayer(purpose.id, { src });
      }
    } catch (err) {
      setToast(`Couldn't load file: ${err.message || err}`);
    }
  }, [docRef, setDoc, replaceDoc, insertLogo, updateLayer]);

  const addLogo = useCallback(async () => {
    const logo = await kvGet("logo");
    if (logo) insertLogo(logo);
    else openFile({ kind: "logo" });
  }, [insertLogo, openFile]);

  /* --------------------------------- export -------------------------------- */

  const doExport = useCallback(async (share = false) => {
    const d = docRef.current;
    if (!d || exporting) return;
    setExporting(true);
    try {
      const opts = { pixelRatio: exportOpts.scale, format: exportOpts.format, transparentBg: exportOpts.transparent && exportOpts.format === "png" };
      const blob = await exportDesign(d, opts);
      const ext = exportOpts.format === "jpeg" ? "jpg" : "png";
      const name = `${d.brand === "Health" ? "estus-health" : "estus"}-${d.canvas.w}x${d.canvas.h}-${Date.now()}.${ext}`;
      if (share && typeof navigator !== "undefined" && navigator.canShare) {
        const f = new File([blob], name, { type: blob.type });
        if (navigator.canShare({ files: [f] })) {
          await navigator.share({ files: [f] });
          setExportOpen(false);
          return;
        }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setExportOpen(false);
    } catch (err) {
      if (err && err.name !== "AbortError") setToast(`Export failed: ${err.message || err}`);
    } finally {
      setExporting(false);
    }
  }, [docRef, exporting, exportOpts]);

  /* -------------------------------- gallery -------------------------------- */

  const refreshGallery = useCallback(async () => setGallery(await listGallery()), []);

  const saveCurrent = useCallback(async () => {
    const d = docRef.current;
    if (!d) return;
    const id = designMetaRef.current.id || newId();
    const name = designMetaRef.current.name || "Untitled";
    const ok = await saveToGallery(id, name, d, renderThumbnail(d));
    setDesignMeta({ id, name });
    setToast(ok ? "Saved to My designs" : "Couldn't save (storage unavailable)");
    if (galleryOpen) refreshGallery();
  }, [docRef, galleryOpen, refreshGallery]);

  const openDesign = useCallback(async (id) => {
    const loaded = await loadFromGallery(id);
    if (!loaded) return setToast("Couldn't open that design");
    await loadFontsForLayers(loaded.layers);
    notifyFontsChanged();
    replaceDoc(loaded);
    const entry = gallery.find((g) => g.id === id);
    setDesignMeta({ id, name: entry?.name || "Untitled" });
    setSelectedIds([]);
    setGalleryOpen(false);
  }, [gallery, replaceDoc]);

  const newDesign = useCallback(async () => {
    await loadFontsForLayers(templateFontProbes("hero-statement"));
    notifyFontsChanged();
    replaceDoc(createDefaultDoc(docRef.current?.brand || "Estus"));
    setDesignMeta({ id: null, name: "Untitled" });
    setSelectedIds([]);
    setGalleryOpen(false);
  }, [docRef, replaceDoc]);

  const duplicateDesign = useCallback(async (id) => {
    const loaded = await loadFromGallery(id);
    if (!loaded) return;
    const entry = gallery.find((g) => g.id === id);
    // Same content, same thumbnail — re-rendering here would race image
    // decode and font loading and bake a placeholder thumbnail.
    await saveToGallery(newId(), `${entry?.name || "Untitled"} copy`, loaded, entry?.thumbnail || renderThumbnail(loaded));
    refreshGallery();
  }, [gallery, refreshGallery]);

  const removeDesign = useCallback(async (id) => {
    await deleteFromGallery(id);
    if (designMetaRef.current.id === id) setDesignMeta((m) => ({ ...m, id: null }));
    refreshGallery();
  }, [refreshGallery]);

  /* -------------------------------- autosave ------------------------------- */

  const saveTimerRef = useRef(null);
  useEffect(() => {
    if (!ready || !doc) return;
    clearTimeout(saveTimerRef.current);
    const attempt = () => {
      // Mid-gesture: retry after the gesture ends rather than skipping the
      // save (the gesture may end without another doc change to re-arm us).
      if (isTransient()) {
        saveTimerRef.current = setTimeout(attempt, 800);
        return;
      }
      saveAutosave(docRef.current, designMetaRef.current);
    };
    saveTimerRef.current = setTimeout(attempt, 800);
    return () => clearTimeout(saveTimerRef.current);
  }, [doc, ready, designMeta, isTransient]);

  useEffect(() => {
    if (!ready) return;
    const flush = () => {
      if (docRef.current) saveAutosave(docRef.current, designMetaRef.current);
    };
    const onVis = () => document.visibilityState === "hidden" && flush();
    window.addEventListener("beforeunload", flush);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("beforeunload", flush);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [ready, docRef]);

  /* ------------------------------- keyboard -------------------------------- */

  useEffect(() => {
    const isTypingTarget = () => {
      const t = document.activeElement;
      return t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
    };
    const onKeyDown = (e) => {
      if (isTypingTarget()) return;
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();
      if (mod && key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (mod && key === "y") {
        e.preventDefault();
        redo();
      } else if (mod && key === "d") {
        e.preventDefault();
        duplicateLayers(effSelectedRef.current);
      } else if (mod && key === "c") {
        const d = docRef.current;
        if (d && effSelectedRef.current.length) {
          clipboardRef.current = d.layers.filter((l) => effSelectedRef.current.includes(l.id));
          e.preventDefault();
        }
      } else if (mod && key === "v") {
        const clip = clipboardRef.current;
        if (clip && clip.length) {
          e.preventDefault();
          const pasted = clip.map((l) => {
            const copy = { ...l, id: newId(), x: l.x + 16, y: l.y + 16, locked: false };
            delete copy.stack;
            return copy;
          });
          setDoc((prev) => ({ ...prev, layers: [...prev.layers, ...pasted] }));
          setSelectedIds(pasted.map((l) => l.id));
        }
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteLayers(effSelectedRef.current);
      } else if (e.key === "Escape") {
        setSelectedIds([]);
      } else if (e.key.startsWith("Arrow")) {
        const ids = effSelectedRef.current;
        if (!ids.length) return;
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        beginTransient();
        const d = docRef.current;
        updateLayersBulkOpts(
          ids
            .map((id) => d.layers.find((l) => l.id === id))
            .filter((l) => l && !l.locked)
            .map((l) => ({ id: l.id, updates: { x: l.x + dx, y: l.y + dy } })),
          { transient: true }
        );
      }
    };
    const onKeyUp = (e) => {
      if (e.key.startsWith("Arrow") && !isTypingTarget()) endTransient();
    };
    // A lost keyup (window blurred mid-hold) must not strand the nudge
    // transient — commit it when focus leaves.
    const onBlur = () => endTransient();
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [undo, redo, duplicateLayers, deleteLayers, setDoc, docRef, beginTransient, endTransient, updateLayersBulkOpts]);

  /* --------------------------------- toast --------------------------------- */

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  /* --------------------------------- render -------------------------------- */

  if (!ready || !doc) {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", background: "#111", color: "#888", fontFamily: "'Inter', sans-serif", fontSize: 14 }}>
        Loading your studio…
      </div>
    );
  }

  const selectedLayers = doc.layers.filter((l) => effSelected.includes(l.id));

  const sidebarContent = (
    <>
      <Sidebar
        brand={brand}
        onSwitchBrand={switchBrand}
        onApplyTemplate={applyTemplate}
        background={doc.canvas.background}
        onBackground={(v) => setDoc((prev) => ({ ...prev, canvas: { ...prev.canvas, background: v } }), { transient: true })}
        onBackgroundEnd={endTransient}
        canvasW={doc.canvas.w}
        canvasH={doc.canvas.h}
        onCustomSize={setCustomSize}
        showSafeZone={showSafeZone}
        onToggleSafeZone={() => setShowSafeZone((v) => !v)}
        onAddText={addText}
        onUploadImage={() => openFile({ kind: "image" })}
        onSetBackgroundImage={() => openFile({ kind: "background" })}
        onAddLogo={addLogo}
        hasLogo={hasLogo}
        onChangeLogo={() => openFile({ kind: "logo" })}
        onAddShape={addShape}
        accent={accent}
        key={`${doc.canvas.w}x${doc.canvas.h}`}
      />
      <LayersPanel
        layers={doc.layers}
        canvas={doc.canvas}
        selectedIds={effSelected}
        onSelect={setSelectedIds}
        onRename={renameLayer}
        onReorderTo={reorderTo}
        onToggleVisible={toggleVisible}
        onToggleLock={toggleLock}
        onRecenter={recenterLayer}
        accent={accent}
      />
      <Inspector
        brand={brand}
        layers={selectedLayers}
        updateLayer={updateLayer}
        updateSelected={updateSelected}
        beginTransient={beginTransient}
        endTransient={endTransient}
        onAlign={alignSelected}
        onReplaceImage={(id) => openFile({ kind: "replace", id })}
        accent={accent}
      />
    </>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#111", color: "#eee", fontFamily: "'Inter', sans-serif", overflow: "hidden" }}>
      <input ref={fileInputRef} type="file" onChange={onFileChange} style={{ display: "none" }} />

      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderBottom: "1px solid #2a2a2a", flexWrap: "wrap", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", flex: 1, minWidth: 0 }}>
          {Object.keys(CANVAS_SIZES).map((name) => (
            <button
              key={name}
              onClick={() => setCanvasPreset(name)}
              title={name}
              style={{
                padding: "4px 8px",
                fontSize: 11,
                background: doc.canvas.preset === name ? accent : "#2a2a2a",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {name.replace(/ \(.*\)/, "")}
            </button>
          ))}
          {doc.canvas.preset === "Custom" && (
            <span style={{ padding: "4px 8px", fontSize: 11, background: accent, color: "#fff", borderRadius: 4 }}>
              Custom {doc.canvas.w}×{doc.canvas.h}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <TopBtn onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)">↩</TopBtn>
          <TopBtn onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)">↪</TopBtn>
          <TopBtn onClick={saveCurrent} title="Save to My designs">Save</TopBtn>
          <TopBtn onClick={() => { refreshGallery(); setGalleryOpen(true); }} title="My designs">Designs</TopBtn>
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setExportOpen((v) => !v)}
              disabled={exporting}
              style={{
                padding: "7px 18px",
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "'Oswald', sans-serif",
                textTransform: "uppercase",
                letterSpacing: 2,
                background: exporting ? "#666" : accent,
                color: "#fff",
                border: "none",
                borderRadius: 6,
                cursor: exporting ? "wait" : "pointer",
              }}
            >
              {exporting ? "Exporting…" : "Export"}
            </button>
            {exportOpen && (
              <ExportMenu
                opts={exportOpts}
                setOpts={setExportOpts}
                onExport={() => doExport(false)}
                onShare={typeof navigator !== "undefined" && !!navigator.canShare ? () => doExport(true) : null}
                onClose={() => setExportOpen(false)}
                accent={accent}
              />
            )}
          </div>
          <TopBtn onClick={() => setShowSidebar((v) => !v)} title={showSidebar ? "Hide panel" : "Show panel"}>{showSidebar ? "⇥" : "⇤"}</TopBtn>
        </div>
      </div>

      {/* Main area */}
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <Stage
          doc={doc}
          selectedIds={effSelected}
          onSelect={setSelectedIds}
          editingId={editingId}
          onEditingChange={setEditingId}
          updateLayer={updateLayer}
          updateLayersBulk={updateLayersBulkOpts}
          beginTransient={beginTransient}
          endTransient={endTransient}
          onDuplicate={duplicateLayers}
          onDelete={deleteLayers}
          onToggleLock={toggleLock}
          onMoveZ={moveZ}
          showSafeZone={showSafeZone}
          accent={accent}
          repaintTick={repaintTick}
        />
        {showSidebar && !narrow && (
          <div style={{ width: 300, background: "#1a1a1a", borderLeft: "1px solid #333", overflowY: "auto", padding: 14, flexShrink: 0 }}>
            {sidebarContent}
          </div>
        )}
      </div>

      {/* Narrow-screen sidebar drawer */}
      {showSidebar && narrow && (
        <>
          <div onClick={() => setShowSidebar(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 20 }} />
          <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "min(320px, 88vw)", background: "#1a1a1a", borderLeft: "1px solid #333", overflowY: "auto", padding: 14, zIndex: 21 }}>
            {sidebarContent}
          </div>
        </>
      )}

      {/* Gallery modal */}
      {galleryOpen && (
        <GalleryModal
          gallery={gallery}
          currentMeta={designMeta}
          onRenameCurrent={(name) => setDesignMeta((m) => ({ ...m, name }))}
          onSave={saveCurrent}
          onOpen={openDesign}
          onNew={newDesign}
          onDuplicate={duplicateDesign}
          onDelete={removeDesign}
          onExportFile={() => downloadDesignFile(docRef.current, `${(designMeta.name || "design").replace(/\s+/g, "-").toLowerCase()}.json`)}
          onImportFile={() => openFile({ kind: "design" })}
          onClose={() => setGalleryOpen(false)}
          accent={accent}
        />
      )}

      {toast && (
        <div style={{ position: "fixed", bottom: 18, left: "50%", transform: "translateX(-50%)", background: "#2a2a2a", border: "1px solid #444", color: "#eee", padding: "10px 18px", borderRadius: 8, fontSize: 13, zIndex: 40, boxShadow: "0 6px 24px rgba(0,0,0,0.5)", maxWidth: "80vw" }}>
          {toast}
        </div>
      )}
    </div>
  );
}

function TopBtn({ children, onClick, disabled, title }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        padding: "6px 12px",
        fontSize: 13,
        background: "#2a2a2a",
        color: disabled ? "#555" : "#ddd",
        border: "1px solid #3a3a3a",
        borderRadius: 6,
        cursor: disabled ? "default" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

function ExportMenu({ opts, setOpts, onExport, onShare, onClose, accent }) {
  const opt = { padding: "4px 10px", fontSize: 11, border: "none", borderRadius: 3, cursor: "pointer", color: "#fff" };
  return (
    <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", background: "#222", border: "1px solid #444", borderRadius: 8, padding: 12, zIndex: 30, width: 230, boxShadow: "0 8px 30px rgba(0,0,0,0.6)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, alignItems: "center" }}>
        <span style={{ fontSize: 11, color: "#888" }}>Format</span>
        <div style={{ display: "flex", gap: 4 }}>
          {["png", "jpeg"].map((f) => (
            <button key={f} onClick={() => setOpts((o) => ({ ...o, format: f, transparent: f === "jpeg" ? false : o.transparent }))} style={{ ...opt, background: opts.format === f ? accent : "#333", textTransform: "uppercase" }}>
              {f}
            </button>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, alignItems: "center" }}>
        <span style={{ fontSize: 11, color: "#888" }}>Size</span>
        <div style={{ display: "flex", gap: 4 }}>
          {[1, 2].map((s) => (
            <button key={s} onClick={() => setOpts((o) => ({ ...o, scale: s }))} style={{ ...opt, background: opts.scale === s ? accent : "#333" }}>
              {s}×
            </button>
          ))}
        </div>
      </div>
      <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, fontSize: 11, color: opts.format === "jpeg" ? "#555" : "#888", cursor: opts.format === "jpeg" ? "default" : "pointer" }}>
        Transparent background
        <input
          type="checkbox"
          checked={opts.transparent && opts.format === "png"}
          disabled={opts.format === "jpeg"}
          onChange={(e) => setOpts((o) => ({ ...o, transparent: e.target.checked }))}
          style={{ accentColor: accent }}
        />
      </label>
      <div style={{ display: "flex", gap: 6 }}>
        <button onClick={onExport} style={{ flex: 1, padding: "8px", fontSize: 12, fontWeight: 600, background: accent, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>
          Download
        </button>
        {onShare && (
          <button onClick={onShare} title="Share to another app" style={{ padding: "8px 12px", fontSize: 12, background: "#333", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>
            Share
          </button>
        )}
      </div>
      <button onClick={onClose} style={{ position: "absolute", top: 6, right: 8, background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: 12 }}>✕</button>
    </div>
  );
}

function GalleryModal({ gallery, currentMeta, onRenameCurrent, onSave, onOpen, onNew, onDuplicate, onDelete, onExportFile, onImportFile, onClose, accent }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 30, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#1c1c1c", border: "1px solid #3a3a3a", borderRadius: 12, width: "min(720px, 94vw)", maxHeight: "84vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: "1px solid #2e2e2e" }}>
          <span style={{ fontSize: 13, fontWeight: 600, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: 2, color: accent }}>My designs</span>
          <div style={{ flex: 1 }} />
          <input
            value={currentMeta.name}
            onChange={(e) => onRenameCurrent(e.target.value)}
            placeholder="Design name"
            style={{ background: "#111", color: "#eee", border: "1px solid #444", borderRadius: 5, padding: "5px 10px", fontSize: 12, width: 160 }}
          />
          <button onClick={onSave} style={{ padding: "6px 14px", fontSize: 12, fontWeight: 600, background: accent, color: "#fff", border: "none", borderRadius: 5, cursor: "pointer" }}>
            Save current
          </button>
          <button onClick={onNew} style={{ padding: "6px 14px", fontSize: 12, background: "#333", color: "#eee", border: "none", borderRadius: 5, cursor: "pointer" }}>
            + New
          </button>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 16 }}>✕</button>
        </div>
        <div style={{ padding: 16, overflowY: "auto", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
          {!gallery.length && <div style={{ color: "#777", fontSize: 13, gridColumn: "1 / -1", textAlign: "center", padding: 30 }}>Nothing saved yet. "Save current" keeps a copy of this design you can come back to or duplicate for the next post.</div>}
          {gallery.map((g) => (
            <div key={g.id} style={{ border: g.id === currentMeta.id ? `1px solid ${accent}` : "1px solid #333", borderRadius: 8, overflow: "hidden", background: "#161616" }}>
              <button onClick={() => onOpen(g.id)} title="Open" style={{ display: "block", width: "100%", padding: 0, border: "none", cursor: "pointer", background: "#0d0d0d" }}>
                {g.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={g.thumbnail} alt={g.name} style={{ width: "100%", height: 110, objectFit: "contain", display: "block" }} />
                ) : (
                  <div style={{ height: 110 }} />
                )}
              </button>
              <div style={{ padding: "6px 8px" }}>
                <div style={{ fontSize: 12, color: "#ddd", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.name || "Untitled"}</div>
                <div style={{ fontSize: 10, color: "#666", margin: "2px 0 6px" }}>{new Date(g.savedAt).toLocaleDateString()}</div>
                <div style={{ display: "flex", gap: 4 }}>
                  <GBtn onClick={() => onOpen(g.id)}>Open</GBtn>
                  <GBtn onClick={() => onDuplicate(g.id)}>Duplicate</GBtn>
                  <GBtn danger onClick={() => { if (window.confirm(`Delete "${g.name || "Untitled"}"?`)) onDelete(g.id); }}>✕</GBtn>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, padding: "10px 16px", borderTop: "1px solid #2e2e2e", justifyContent: "flex-end" }}>
          <button onClick={onExportFile} style={{ background: "none", border: "none", color: "#777", cursor: "pointer", fontSize: 11, textDecoration: "underline" }}>Export .json file</button>
          <button onClick={onImportFile} style={{ background: "none", border: "none", color: "#777", cursor: "pointer", fontSize: 11, textDecoration: "underline" }}>Import .json file</button>
        </div>
      </div>
    </div>
  );
}

function GBtn({ children, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      style={{ flex: danger ? "0 0 auto" : 1, padding: "4px 6px", fontSize: 10, background: danger ? "#3a2020" : "#2a2a2a", color: danger ? "#f88" : "#ccc", border: "1px solid #3a3a3a", borderRadius: 4, cursor: "pointer" }}
    >
      {children}
    </button>
  );
}
