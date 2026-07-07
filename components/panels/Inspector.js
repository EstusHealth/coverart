"use client";

import { SectionLabel, Row, RangeInput, ColorPicker, ToggleBtn, PanelBtn, selectStyle } from "./common";
import { BRANDS, BLOCK_PRESETS, FONTS, STRIKE_STYLES, fontWeights, remapColor } from "../../lib/constants";
import { canvasCaps } from "../../lib/render";

// Property editor for the current selection. Single selection gets the full
// per-type inspector; multi-selection gets alignment + opacity.
export default function Inspector({
  brand,
  layers,
  updateLayer,
  updateSelected,
  beginTransient,
  endTransient,
  onAlign,
  onReplaceImage,
  accent,
}) {
  if (!layers.length) return null;
  const single = layers.length === 1 ? layers[0] : null;
  const colors = BRANDS[brand].colors;
  const caps = canvasCaps();

  const set = (updates, opts) => single && updateLayer(single.id, updates, opts);
  const slider = (field, extra) => ({
    onChange: (v) => set({ [field]: v, ...extra }, { transient: true }),
    onEnd: endTransient,
  });

  return (
    <div style={{ marginBottom: 16 }}>
      <SectionLabel accent={accent}>{single ? `Edit ${single.type}` : `Edit ${layers.length} layers`}</SectionLabel>

      <Row label="Align">
        <div style={{ display: "flex", gap: 3 }}>
          {[["left", "⇤"], ["centerH", "↔"], ["right", "⇥"], ["top", "⤒"], ["centerV", "↕"], ["bottom", "⤓"]].map(([k, icon]) => (
            <button key={k} title={`Align ${k}`} onClick={() => onAlign(k)} style={{ width: 24, height: 22, fontSize: 12, background: "#333", color: "#ccc", border: "none", borderRadius: 3, cursor: "pointer", padding: 0 }}>
              {icon}
            </button>
          ))}
        </div>
      </Row>

      <Row label="Opacity">
        <RangeInput
          value={Math.round((single ? (single.opacity ?? 1) : (layers[0].opacity ?? 1)) * 100)}
          min={0} max={100}
          onChange={(v) => (single ? set({ opacity: v / 100 }, { transient: true }) : updateSelected({ opacity: v / 100 }, { transient: true }))}
          onEnd={endTransient}
        />
      </Row>

      {single && (
        <Row label="Rotation">
          <RangeInput value={single.rotation || 0} min={-180} max={180} {...slider("rotation")} />
        </Row>
      )}

      {single && single.type === "text" && <TextInspector layer={single} set={set} slider={slider} colors={colors} accent={accent} brand={brand} beginTransient={beginTransient} endTransient={endTransient} />}
      {single && single.type === "image" && <ImageInspector layer={single} set={set} slider={slider} caps={caps} onReplaceImage={onReplaceImage} accent={accent} />}
      {single && single.type === "shape" && <ShapeInspector layer={single} set={set} slider={slider} colors={colors} accent={accent} />}
    </div>
  );
}

function TextInspector({ layer, set, slider, colors, accent, brand, beginTransient, endTransient }) {
  const weights = fontWeights(layer.font);
  return (
    <>
      <textarea
        value={layer.text}
        onChange={(e) => set({ text: e.target.value }, { transient: true })}
        onFocus={beginTransient}
        onBlur={endTransient}
        rows={3}
        style={{ width: "100%", background: "#222", color: "#eee", border: "1px solid #444", borderRadius: 4, padding: 8, fontSize: 13, fontFamily: "inherit", resize: "vertical", margin: "4px 0 10px", boxSizing: "border-box" }}
      />
      <Row label="Font">
        <select
          value={layer.font}
          onChange={(e) => {
            const font = e.target.value;
            const w = fontWeights(font);
            set({ font, weight: w.includes(layer.weight) ? layer.weight : w[Math.floor(w.length / 2)] });
          }}
          style={selectStyle}
        >
          {Object.keys(FONTS).map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      </Row>
      <Row label="Size">
        <RangeInput value={layer.size} min={10} max={220} {...slider("size")} />
      </Row>
      <Row label="Weight">
        <select value={layer.weight} onChange={(e) => set({ weight: Number(e.target.value) })} style={selectStyle}>
          {weights.map((w) => <option key={w} value={w}>{w}</option>)}
        </select>
      </Row>
      <Row label="Color">
        <ColorPicker value={layer.color} onChange={(v) => set({ color: v }, { transient: true })} onEnd={endTransient} colors={colors} accent={accent} />
      </Row>
      <Row label="Text align">
        <div style={{ display: "flex", gap: 4 }}>
          {["left", "center", "right"].map((a) => (
            <ToggleBtn key={a} active={layer.align === a} onClick={() => set({ align: a })}>{a === "left" ? "⇤" : a === "center" ? "≡" : "⇥"}</ToggleBtn>
          ))}
        </div>
      </Row>
      <Row label="Spacing">
        <RangeInput value={layer.letterSpacing} min={0} max={20} {...slider("letterSpacing")} />
      </Row>
      <Row label="Line H.">
        <RangeInput value={layer.lineHeight} min={0.7} max={2} step={0.05} {...slider("lineHeight")} />
      </Row>
      {typeof layer.width === "number" && (
        <Row label="Width">
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "#aaa" }}>{Math.round(layer.width)}px wrap</span>
            <PanelBtn onClick={() => set({ width: null })} style={{ padding: "3px 8px", fontSize: 10 }}>Fit text</PanelBtn>
          </div>
        </Row>
      )}
      <Row label="Style">
        <div style={{ display: "flex", gap: 4 }}>
          <ToggleBtn title="Uppercase" active={layer.uppercase} onClick={() => set({ uppercase: !layer.uppercase })}>ABC</ToggleBtn>
          <ToggleBtn title="Italic" active={layer.italic} onClick={() => set({ italic: !layer.italic })}><em>I</em></ToggleBtn>
          <ToggleBtn title="Strikethrough" active={!!layer.strikethrough} onClick={() => set({ strikethrough: !layer.strikethrough })}><span style={{ textDecoration: "line-through" }}>S</span></ToggleBtn>
        </div>
      </Row>
      {layer.strikethrough && (
        <Row label="Strike">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 3, justifyContent: "flex-end" }}>
            {STRIKE_STYLES.map((s) => (
              <button
                key={s}
                onClick={() => set({ strikeStyle: s })}
                title={s}
                style={{ padding: "3px 8px", fontSize: 10, background: (layer.strikeStyle || "straight") === s ? accent : "#333", color: "#fff", border: "none", borderRadius: 3, cursor: "pointer", textTransform: "capitalize" }}
              >
                {s}
              </button>
            ))}
          </div>
        </Row>
      )}
      <div style={{ marginTop: 10 }}>
        <div style={{ fontSize: 10, color: "#666", marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Apply preset style</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {Object.entries(BLOCK_PRESETS).map(([name, preset]) => (
            <button
              key={name}
              onClick={() => set({ ...preset, color: remapColor(preset.color, brand, "text") })}
              style={{ padding: "3px 8px", fontSize: 10, background: "#2a2a2a", color: "#999", border: "1px solid #444", borderRadius: 3, cursor: "pointer" }}
            >
              {name}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

function ImageInspector({ layer, set, slider, caps, onReplaceImage, accent }) {
  const f = layer.filters || { blur: 0, brightness: 100, grayscale: 0 };
  const setFilter = (key) => ({
    onChange: (v) => set({ filters: { ...f, [key]: v } }, { transient: true }),
    onEnd: slider("_").onEnd,
  });
  return (
    <>
      <Row label="Fit">
        <div style={{ display: "flex", gap: 4 }}>
          {["cover", "contain", "fill"].map((fit) => (
            <ToggleBtn key={fit} active={layer.fit === fit} onClick={() => set({ fit })}>{fit}</ToggleBtn>
          ))}
        </div>
      </Row>
      {layer.fit !== "fill" && (
        <>
          <Row label="Focus X">
            <RangeInput value={layer.posX ?? 50} min={0} max={100} {...slider("posX")} />
          </Row>
          <Row label="Focus Y">
            <RangeInput value={layer.posY ?? 50} min={0} max={100} {...slider("posY")} />
          </Row>
        </>
      )}
      <Row label="Corners">
        <RangeInput value={layer.cornerRadius || 0} min={0} max={Math.round(Math.min(layer.w, layer.h) / 2)} {...slider("cornerRadius")} />
      </Row>
      <Row label="Flip">
        <ToggleBtn active={!!layer.flipH} onClick={() => set({ flipH: !layer.flipH })}>Mirror</ToggleBtn>
      </Row>
      {caps.filter ? (
        <>
          <Row label="Blur">
            <RangeInput value={f.blur} min={0} max={40} {...setFilter("blur")} />
          </Row>
          <Row label="Brightness">
            <RangeInput value={f.brightness} min={30} max={170} {...setFilter("brightness")} />
          </Row>
          <Row label="B&W">
            <RangeInput value={f.grayscale} min={0} max={100} {...setFilter("grayscale")} />
          </Row>
        </>
      ) : (
        <div style={{ fontSize: 10, color: "#666", margin: "6px 0" }}>Image filters need a newer browser.</div>
      )}
      <PanelBtn onClick={() => onReplaceImage(layer.id)} style={{ width: "100%", marginTop: 4 }}>Replace image…</PanelBtn>
    </>
  );
}

function ShapeInspector({ layer, set, slider, colors, accent }) {
  return (
    <>
      <Row label="Shape">
        <div style={{ display: "flex", gap: 4 }}>
          {[["rect", "▭"], ["ellipse", "◯"], ["pill", "⬭"], ["line", "—"]].map(([s, icon]) => (
            <ToggleBtn key={s} title={s} active={layer.shape === s} onClick={() => set({ shape: s })}>{icon}</ToggleBtn>
          ))}
        </div>
      </Row>
      <Row label="Fill">
        <ColorPicker value={layer.fill} onChange={(v) => set({ fill: v }, { transient: true })} onEnd={slider("_").onEnd} colors={colors} accent={accent} allowNone />
      </Row>
      <Row label="Stroke">
        <ColorPicker value={layer.stroke} onChange={(v) => set({ stroke: v }, { transient: true })} onEnd={slider("_").onEnd} colors={colors} accent={accent} allowNone />
      </Row>
      {layer.stroke && layer.stroke !== "none" && (
        <Row label="Stroke W.">
          <RangeInput value={layer.strokeWidth || 0} min={0} max={40} {...slider("strokeWidth")} />
        </Row>
      )}
      {layer.shape === "rect" && (
        <Row label="Corners">
          <RangeInput value={layer.cornerRadius || 0} min={0} max={Math.round(Math.min(layer.w, layer.h) / 2)} {...slider("cornerRadius")} />
        </Row>
      )}
    </>
  );
}
