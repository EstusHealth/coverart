"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { fontCss, solidColor } from "../lib/constants";
import {
  renderDesign,
  layerSize,
  layerAABB,
  hitTest,
  toLayerSpace,
  fromLayerSpace,
  layoutTextLayer,
  letterSpacingPx,
} from "../lib/render";

const DEG = Math.PI / 180;
const MAX_BACKING = 4096;
const MIN_LAYER_SIZE = 12;
const MIN_FONT = 6;
const MAX_FONT = 400;

// Safe-zone insets per canvas preset (platform UI chrome / crop margins).
function safeZoneInsets(preset, w, h) {
  if (preset && preset.includes("Story")) return { top: 220, bottom: 340, left: 70, right: 70 };
  const m = Math.round(Math.min(w, h) * 0.055);
  return { top: m, bottom: m, left: m, right: m };
}

// The canvas preview plus the interaction overlay: selection chrome, resize/
// rotate handles, snap guides, inline text editing and the floating toolbar.
// All geometry math happens in design units via lib/render helpers — Stage
// never measures text itself.
export default function Stage({
  doc,
  selectedIds,
  onSelect,
  editingId,
  onEditingChange,
  updateLayer,
  updateLayersBulk,
  beginTransient,
  endTransient,
  onDuplicate,
  onDelete,
  onToggleLock,
  onMoveZ,
  showSafeZone,
  accent,
  repaintTick,
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const dragRef = useRef(null);
  const [containerSize, setContainerSize] = useState({ w: 800, h: 600 });
  const [dpr, setDpr] = useState(1);
  const [imageTick, setImageTick] = useState(0);
  const [guides, setGuides] = useState(null);
  const [dragging, setDragging] = useState(false);

  const { w: docW, h: docH } = doc.canvas;

  // Fit the canvas to the available space (viewport-derived, not hardcoded).
  const PAD = 20;
  const fitScale = Math.max(0.01, Math.min((containerSize.w - PAD * 2) / docW, (containerSize.h - PAD * 2) / docH));
  const cssW = Math.max(1, Math.round(docW * fitScale));
  const cssH = Math.max(1, Math.round(docH * fitScale));
  const cssScale = cssW / docW;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setContainerSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Track devicePixelRatio changes (zoom, monitor moves); re-arm per change.
  useEffect(() => {
    setDpr(window.devicePixelRatio || 1);
    let mql = null;
    const arm = () => {
      mql = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      mql.addEventListener("change", onChange, { once: true });
    };
    const onChange = () => {
      setDpr(window.devicePixelRatio || 1);
      arm();
    };
    arm();
    return () => mql && mql.removeEventListener("change", onChange);
  }, []);

  // Paint the preview through the shared renderer, same frame as the overlay.
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const backingCap = Math.min(1, MAX_BACKING / Math.max(cssW * dpr, cssH * dpr));
    const bw = Math.max(1, Math.round(cssW * dpr * backingCap));
    const renderScale = bw / docW;
    // Derive height from the width-based scale so the painted area matches
    // the backing store instead of rounding each axis independently.
    const bh = Math.max(1, Math.round(docH * renderScale));
    if (canvas.width !== bw) canvas.width = bw;
    if (canvas.height !== bh) canvas.height = bh;
    const ctx = canvas.getContext("2d");
    renderDesign(ctx, doc, {
      scale: renderScale,
      skipLayerId: editingId,
      onImageLoad: () => setImageTick((t) => t + 1),
    });
  }, [doc, cssW, cssH, dpr, editingId, imageTick, repaintTick, docW]);

  const toDesign = useCallback((e) => {
    const rect = overlayRef.current.getBoundingClientRect();
    return { x: (e.clientX - rect.left) / cssScale, y: (e.clientY - rect.top) / cssScale };
  }, [cssScale]);

  const selectedLayers = useMemo(
    () => doc.layers.filter((l) => selectedIds.includes(l.id)),
    [doc.layers, selectedIds]
  );
  const single = selectedLayers.length === 1 ? selectedLayers[0] : null;

  /* ------------------------------ snapping ------------------------------ */

  const snapMove = useCallback((draggedIds, startAABBs, dx, dy, disable) => {
    if (disable) return { dx, dy, guides: null };
    const threshold = 6 / cssScale;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    startAABBs.forEach((bb) => {
      minX = Math.min(minX, bb.minX + dx);
      minY = Math.min(minY, bb.minY + dy);
      maxX = Math.max(maxX, bb.maxX + dx);
      maxY = Math.max(maxY, bb.maxY + dy);
    });
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const xLines = [0, docW / 2, docW];
    const yLines = [0, docH / 2, docH];
    doc.layers.forEach((l) => {
      if (draggedIds.includes(l.id) || l.visible === false) return;
      const bb = layerAABB(l);
      xLines.push(bb.minX, (bb.minX + bb.maxX) / 2, bb.maxX);
      yLines.push(bb.minY, (bb.minY + bb.maxY) / 2, bb.maxY);
    });
    let bestX = null;
    for (const line of xLines) {
      for (const v of [minX, cx, maxX]) {
        const delta = line - v;
        if (Math.abs(delta) <= threshold && (!bestX || Math.abs(delta) < Math.abs(bestX.delta))) bestX = { delta, line };
      }
    }
    let bestY = null;
    for (const line of yLines) {
      for (const v of [minY, cy, maxY]) {
        const delta = line - v;
        if (Math.abs(delta) <= threshold && (!bestY || Math.abs(delta) < Math.abs(bestY.delta))) bestY = { delta, line };
      }
    }
    return {
      dx: dx + (bestX ? bestX.delta : 0),
      dy: dy + (bestY ? bestY.delta : 0),
      guides: bestX || bestY ? { x: bestX ? bestX.line : null, y: bestY ? bestY.line : null } : null,
    };
  }, [doc.layers, docW, docH, cssScale]);

  /* ---------------------------- drag sessions --------------------------- */

  const endDrag = useCallback(() => {
    const session = dragRef.current;
    dragRef.current = null;
    setGuides(null);
    setDragging(false);
    if (!session) return;
    endTransient();
  }, [endTransient]);

  // Safety net: if the captured element unmounts mid-drag (layer deleted or
  // undone away), its pointerup never fires — catch it at the window level so
  // the transient edit always gets committed or abandoned.
  useEffect(() => {
    if (!dragging) return;
    const up = () => endDrag();
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    window.addEventListener("blur", up);
    return () => {
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      window.removeEventListener("blur", up);
    };
  }, [dragging, endDrag]);

  const startSession = useCallback((e, session) => {
    e.stopPropagation();
    e.preventDefault();
    beginTransient();
    dragRef.current = { ...session, pointerId: e.pointerId, moved: false };
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [beginTransient]);

  const onOverlayPointerDown = useCallback((e) => {
    if (e.button !== 0) return;
    const p = toDesign(e);
    const hit = hitTest(doc.layers, p.x, p.y, 4 / cssScale);
    if (!hit) {
      if (!e.shiftKey) onSelect([]);
      return;
    }
    let nextSelected;
    if (e.shiftKey) {
      nextSelected = selectedIds.includes(hit.id) ? selectedIds.filter((id) => id !== hit.id) : [...selectedIds, hit.id];
      onSelect(nextSelected);
      return; // shift-click adjusts selection without starting a drag
    }
    nextSelected = selectedIds.includes(hit.id) ? selectedIds : [hit.id];
    onSelect(nextSelected);
    const layers = doc.layers
      .filter((l) => nextSelected.includes(l.id) && !l.locked)
      .map((l) => ({ id: l.id, x0: l.x, y0: l.y, aabb: layerAABB(l), stacked: !!l.stack }));
    if (!layers.length) return;
    startSession(e, { mode: "move", start: p, layers, hitId: hit.id });
  }, [doc.layers, selectedIds, onSelect, toDesign, cssScale, startSession]);

  const onResizeHandleDown = (handle) => (e) => {
    if (!single || single.locked) return;
    const p = toDesign(e);
    const size = layerSize(single);
    startSession(e, {
      mode: "resize",
      handle,
      start: p,
      layers: [{ id: single.id }],
      layer0: single,
      size0: size,
    });
  };

  const onRotateHandleDown = (e) => {
    if (!single || single.locked) return;
    const p = toDesign(e);
    const angle0 = Math.atan2(p.y - single.y, p.x - single.x) / DEG;
    startSession(e, {
      mode: "rotate",
      start: p,
      layers: [{ id: single.id }],
      layer0: single,
      angle0,
      rotation0: single.rotation || 0,
    });
  };

  const onPointerMove = useCallback((e) => {
    const session = dragRef.current;
    if (!session || e.pointerId !== session.pointerId) return;
    const p = toDesign(e);
    let dx = p.x - session.start.x;
    let dy = p.y - session.start.y;
    if (!session.moved && Math.hypot(dx, dy) * cssScale < 3) return;

    if (session.mode === "move") {
      if (!session.moved) {
        session.moved = true;
        // Moving a template-stacked layer detaches it from its stack.
        const stacked = session.layers.filter((l) => l.stacked);
        if (stacked.length) {
          updateLayersBulk(stacked.map((l) => ({ id: l.id, updates: { stack: null } })), { transient: true });
          session.layers.forEach((l) => { l.stacked = false; });
        }
      }
      if (e.shiftKey) {
        if (Math.abs(dx) > Math.abs(dy)) dy = 0;
        else dx = 0;
      }
      const snapped = snapMove(session.layers.map((l) => l.id), session.layers.map((l) => l.aabb), dx, dy, e.altKey);
      setGuides(snapped.guides);
      updateLayersBulk(
        session.layers.map((l) => ({ id: l.id, updates: { x: l.x0 + snapped.dx, y: l.y0 + snapped.dy } })),
        { transient: true }
      );
    } else if (session.mode === "resize") {
      session.moved = true;
      const { layer0, size0, handle } = session;
      const [hx, hy] = handle;
      // Opposite corner/edge midpoint stays fixed in world space.
      const anchorWorld = {
        x: layer0.x + fromLayerSpace(layer0, (-hx * size0.w) / 2, (-hy * size0.h) / 2).x,
        y: layer0.y + fromLayerSpace(layer0, (-hx * size0.w) / 2, (-hy * size0.h) / 2).y,
      };
      const L = toLayerSpace({ ...layer0, x: anchorWorld.x, y: anchorWorld.y }, p.x, p.y);
      const isCorner = hx !== 0 && hy !== 0;

      if (layer0.type === "text") {
        if (isCorner) {
          const s = Math.max(
            MIN_FONT / layer0.size,
            Math.min(MAX_FONT / layer0.size, Math.max(Math.abs(L.x) / size0.w, Math.abs(L.y) / size0.h))
          );
          const newW = size0.w * s;
          const newH = size0.h * s;
          const c = fromLayerSpace(layer0, (hx * newW) / 2, (hy * newH) / 2);
          updateLayer(layer0.id, {
            size: Math.round(layer0.size * s * 10) / 10,
            width: typeof layer0.width === "number" ? layer0.width * s : layer0.width,
            x: anchorWorld.x + c.x,
            y: anchorWorld.y + c.y,
          }, { transient: true });
        } else if (hx !== 0) {
          // Side handles set the wrap width (Canva model).
          const newW = Math.max(Math.max(layer0.size, 40), Math.abs(L.x));
          const c = fromLayerSpace(layer0, (hx * newW) / 2, 0);
          updateLayer(layer0.id, { width: newW, x: anchorWorld.x + c.x, y: anchorWorld.y + c.y }, { transient: true });
        }
      } else {
        const uniformDefault = layer0.type === "image";
        const uniform = isCorner && (e.shiftKey ? !uniformDefault : uniformDefault);
        let newW = size0.w;
        let newH = size0.h;
        if (uniform) {
          const s = Math.max(MIN_LAYER_SIZE / Math.min(size0.w, size0.h), Math.max(Math.abs(L.x) / size0.w, Math.abs(L.y) / size0.h));
          newW = size0.w * s;
          newH = size0.h * s;
        } else {
          if (hx !== 0) newW = Math.max(MIN_LAYER_SIZE, Math.abs(L.x));
          if (hy !== 0) newH = Math.max(layer0.type === "shape" && layer0.shape === "line" ? 2 : MIN_LAYER_SIZE, Math.abs(L.y));
        }
        const cLocal = { lx: hx !== 0 ? (hx * newW) / 2 : 0, ly: hy !== 0 ? (hy * newH) / 2 : 0 };
        const cv = fromLayerSpace(layer0, cLocal.lx, cLocal.ly);
        updateLayer(layer0.id, { w: newW, h: newH, x: anchorWorld.x + cv.x, y: anchorWorld.y + cv.y }, { transient: true });
      }
    } else if (session.mode === "rotate") {
      session.moved = true;
      const { layer0, angle0, rotation0 } = session;
      const angle = Math.atan2(p.y - layer0.y, p.x - layer0.x) / DEG;
      let rot = (rotation0 + angle - angle0) % 360;
      if (rot > 180) rot -= 360;
      if (rot < -180) rot += 360;
      if (!e.altKey) {
        const snapped = Math.round(rot / 15) * 15;
        if (Math.abs(rot - snapped) <= 4) rot = snapped;
      }
      updateLayer(layer0.id, { rotation: Math.round(rot * 10) / 10 }, { transient: true });
    }
  }, [toDesign, cssScale, snapMove, updateLayer, updateLayersBulk]);

  const onPointerUp = useCallback((e) => {
    const session = dragRef.current;
    if (!session || e.pointerId !== session.pointerId) return;
    if (session.mode === "move" && !session.moved && session.hitId) {
      // Plain click on an already-multi-selected layer narrows the selection.
      if (selectedIds.length > 1) onSelect([session.hitId]);
    }
    endDrag();
  }, [endDrag, onSelect, selectedIds]);

  const onDoubleClick = useCallback((e) => {
    const p = toDesign(e);
    const hit = hitTest(doc.layers, p.x, p.y, 4 / cssScale);
    if (hit && hit.type === "text") {
      onSelect([hit.id]);
      onEditingChange(hit.id);
    }
  }, [doc.layers, toDesign, cssScale, onSelect, onEditingChange]);

  /* ------------------------- inline text editing ------------------------ */

  const editingLayer = editingId ? doc.layers.find((l) => l.id === editingId) : null;
  const editRef = useRef(null);
  const editSessionRef = useRef(false);

  useEffect(() => {
    if (editingLayer && editRef.current) {
      editRef.current.focus();
      editRef.current.select();
    }
  }, [editingId]); // eslint-disable-line react-hooks/exhaustive-deps

  const commitEditing = useCallback(() => {
    if (editSessionRef.current) {
      editSessionRef.current = false;
      endTransient();
    }
    onEditingChange(null);
  }, [endTransient, onEditingChange]);

  /* ------------------------------- chrome ------------------------------- */

  const selectionUnion = useMemo(() => {
    if (!selectedLayers.length) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    selectedLayers.forEach((l) => {
      const bb = layerAABB(l);
      minX = Math.min(minX, bb.minX);
      minY = Math.min(minY, bb.minY);
      maxX = Math.max(maxX, bb.maxX);
      maxY = Math.max(maxY, bb.maxY);
    });
    return { minX, minY, maxX, maxY };
  }, [selectedLayers]);

  const safe = showSafeZone ? safeZoneInsets(doc.canvas.preset, docW, docH) : null;

  const handleCursor = ([hx, hy], rotation) => {
    // Approximate cursor orientation for rotated layers.
    const base = hx !== 0 && hy !== 0 ? (hx * hy > 0 ? 135 : 45) : hx !== 0 ? 90 : 0;
    const angle = ((base + (rotation || 0)) % 180 + 180) % 180;
    if (angle < 22.5 || angle >= 157.5) return "ns-resize";
    if (angle < 67.5) return "nesw-resize";
    if (angle < 112.5) return "ew-resize";
    return "nwse-resize";
  };

  const renderSelectionBox = (layer) => {
    const { w, h } = layerSize(layer);
    const isEditing = editingId === layer.id;
    const showHandles = single && single.id === layer.id && !layer.locked && !isEditing;
    const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    const sides = layer.type === "text" ? [[-1, 0], [1, 0]] : [[0, -1], [1, 0], [0, 1], [-1, 0]];
    const handleStyle = (hx, hy) => ({
      position: "absolute",
      left: `${(hx + 1) * 50}%`,
      top: `${(hy + 1) * 50}%`,
      width: 22,
      height: 22,
      margin: -11,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      pointerEvents: "auto",
      cursor: handleCursor([hx, hy], layer.rotation),
      touchAction: "none",
    });
    return (
      <div
        key={layer.id}
        style={{
          position: "absolute",
          left: layer.x * cssScale,
          top: layer.y * cssScale,
          width: w * cssScale,
          height: h * cssScale,
          transform: `translate(-50%, -50%) rotate(${layer.rotation || 0}deg)`,
          outline: `${layer.locked ? "1.5px dashed" : "1.5px solid"} ${accent}`,
          outlineOffset: 1,
          pointerEvents: "none",
          opacity: isEditing ? 0.4 : 1,
        }}
      >
        {showHandles && corners.map(([hx, hy]) => (
          <div key={`c${hx}${hy}`} style={handleStyle(hx, hy)} onPointerDown={onResizeHandleDown([hx, hy])} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onLostPointerCapture={onPointerUp}>
            <div style={{ width: 10, height: 10, background: "#fff", border: `1.5px solid ${accent}`, borderRadius: 2, boxShadow: "0 1px 3px rgba(0,0,0,0.4)" }} />
          </div>
        ))}
        {showHandles && sides.map(([hx, hy]) => (
          <div
            key={`s${hx}${hy}`}
            style={handleStyle(hx, hy)}
            onPointerDown={onResizeHandleDown([hx, hy])}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onLostPointerCapture={onPointerUp}
            onDoubleClick={layer.type === "text" ? (e) => { e.stopPropagation(); updateLayer(layer.id, { width: null }); } : undefined}
            title={layer.type === "text" ? "Drag to set text width - double-click to fit" : undefined}
          >
            <div style={{ width: hx !== 0 ? 6 : 16, height: hx !== 0 ? 16 : 6, background: "#fff", border: `1.5px solid ${accent}`, borderRadius: 3, boxShadow: "0 1px 3px rgba(0,0,0,0.4)" }} />
          </div>
        ))}
        {showHandles && (
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: -34,
              width: 26,
              height: 26,
              margin: "0 0 0 -13",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "auto",
              cursor: "grab",
              touchAction: "none",
            }}
            onPointerDown={onRotateHandleDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onLostPointerCapture={onPointerUp}
            title="Rotate (Alt for free rotation)"
          >
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#fff", border: `1.5px solid ${accent}`, boxShadow: "0 1px 3px rgba(0,0,0,0.4)" }} />
          </div>
        )}
      </div>
    );
  };

  const toolbar = selectionUnion && !dragging && !editingId && (
    <div
      style={{
        position: "absolute",
        left: Math.max(4, Math.min(cssW - 190, ((selectionUnion.minX + selectionUnion.maxX) / 2) * cssScale - 95)),
        top: Math.max(4, selectionUnion.minY * cssScale - 44),
        display: "flex",
        gap: 2,
        background: "#222",
        border: "1px solid #444",
        borderRadius: 8,
        padding: 3,
        pointerEvents: "auto",
        boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
        zIndex: 5,
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <TbBtn label="Duplicate" onClick={() => onDuplicate(selectedIds)}>⧉</TbBtn>
      {single && <TbBtn label={single.locked ? "Unlock" : "Lock"} onClick={() => onToggleLock(single.id)}>{single.locked ? "🔓" : "🔒"}</TbBtn>}
      {single && <TbBtn label="Forward" onClick={() => onMoveZ(single.id, 1)}>▲</TbBtn>}
      {single && <TbBtn label="Backward" onClick={() => onMoveZ(single.id, -1)}>▼</TbBtn>}
      <TbBtn label="Delete" danger onClick={() => onDelete(selectedIds)}>✕</TbBtn>
    </div>
  );

  const editingBox = editingLayer && (() => {
    const layout = layoutTextLayer(editingLayer);
    const pad = 8;
    return (
      <textarea
        ref={editRef}
        value={editingLayer.text}
        onChange={(e) => {
          if (!editSessionRef.current) {
            editSessionRef.current = true;
            beginTransient();
          }
          updateLayer(editingLayer.id, { text: e.target.value }, { transient: true });
        }}
        onBlur={commitEditing}
        onPointerDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Escape" || (e.key === "Enter" && (e.metaKey || e.ctrlKey))) {
            e.preventDefault();
            commitEditing();
          }
        }}
        spellCheck={false}
        style={{
          position: "absolute",
          left: editingLayer.x * cssScale,
          top: editingLayer.y * cssScale,
          width: Math.max(60, layout.boxW * cssScale + pad * 2),
          height: Math.max(30, layout.boxH * cssScale + pad * 2),
          transform: `translate(-50%, -50%) rotate(${editingLayer.rotation || 0}deg)`,
          fontFamily: fontCss(editingLayer.font),
          fontSize: editingLayer.size * cssScale,
          fontWeight: editingLayer.weight,
          fontStyle: editingLayer.italic ? "italic" : "normal",
          lineHeight: editingLayer.lineHeight,
          letterSpacing: letterSpacingPx(editingLayer) * cssScale,
          textTransform: editingLayer.uppercase ? "uppercase" : "none",
          textAlign: editingLayer.align,
          color: solidColor(editingLayer.color),
          caretColor: accent,
          background: "rgba(0,0,0,0.15)",
          border: `1px dashed ${accent}`,
          borderRadius: 2,
          outline: "none",
          resize: "none",
          overflow: "hidden",
          padding: pad,
          margin: 0,
          whiteSpace: typeof editingLayer.width === "number" ? "pre-wrap" : "pre",
          pointerEvents: "auto",
          zIndex: 6,
          boxSizing: "border-box",
        }}
      />
    );
  })();

  return (
    <div ref={containerRef} style={{ flex: 1, minWidth: 0, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "relative", width: cssW, height: cssH, boxShadow: "0 8px 40px rgba(0,0,0,0.6)", flexShrink: 0 }}>
        <canvas ref={canvasRef} style={{ width: cssW, height: cssH, display: "block" }} />
        {/* Interaction overlay */}
        <div
          ref={overlayRef}
          onPointerDown={onOverlayPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onLostPointerCapture={onPointerUp}
          onDoubleClick={onDoubleClick}
          style={{ position: "absolute", inset: 0, touchAction: "none", userSelect: "none", WebkitUserSelect: "none", cursor: "default" }}
        >
          {safe && (
            <div
              style={{
                position: "absolute",
                left: safe.left * cssScale,
                top: safe.top * cssScale,
                right: safe.right * cssScale,
                bottom: safe.bottom * cssScale,
                border: "1px dashed rgba(255,255,255,0.35)",
                pointerEvents: "none",
              }}
            />
          )}
          {guides && guides.x !== null && guides.x !== undefined && (
            <div style={{ position: "absolute", left: guides.x * cssScale, top: 0, bottom: 0, width: 1, background: "#FF4D8D", pointerEvents: "none", zIndex: 4 }} />
          )}
          {guides && guides.y !== null && guides.y !== undefined && (
            <div style={{ position: "absolute", top: guides.y * cssScale, left: 0, right: 0, height: 1, background: "#FF4D8D", pointerEvents: "none", zIndex: 4 }} />
          )}
          {selectedLayers.map((l) => renderSelectionBox(l))}
          {toolbar}
          {editingBox}
        </div>
      </div>
    </div>
  );
}

function TbBtn({ children, label, onClick, danger }) {
  return (
    <button
      title={label}
      onClick={onClick}
      style={{
        width: 32,
        height: 30,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
        color: danger ? "#f88" : "#ddd",
        border: "none",
        borderRadius: 5,
        cursor: "pointer",
        fontSize: 14,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "#333")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {children}
    </button>
  );
}
