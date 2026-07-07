"use client";

// IndexedDB-backed persistence: autosave of the working document, a "My
// designs" gallery (doc + thumbnail per entry), and a small key/value slot
// for the persistent brand logo. Designs contain image dataURLs that
// routinely blow past the localStorage quota, so IndexedDB is the store;
// every call degrades to a no-op/null if IDB is unavailable.

const DB_NAME = "estus-social-creator";
const DESIGNS = "designs";
const KV = "kv";
const AUTOSAVE_KEY = "autosave";
export const DOC_VERSION = 2;

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("IndexedDB unavailable"));
    const req = indexedDB.open(DB_NAME, 2);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DESIGNS)) db.createObjectStore(DESIGNS);
      if (!db.objectStoreNames.contains(KV)) db.createObjectStore(KV);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore(store, mode, fn) {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(store, mode);
      const result = fn(tx.objectStore(store));
      tx.oncomplete = () => resolve(result && "result" in result ? result.result : undefined);
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

/* ------------------------------- migration -------------------------------- */

// Single migration chain shared by autosave restore and .json import.
// v2 is the first layer-based version; older (v1) flow docs are not
// migratable and return null. Additive future changes should prefer
// defensive defaults in the renderer over hard migrations.
export function migrateDoc(doc, fromVersion) {
  if (fromVersion > DOC_VERSION) throw new Error(`This design was made with a newer version of the app (v${fromVersion}).`);
  if (fromVersion < 2) return null;
  return doc;
}

function isValidDoc(doc) {
  return doc && typeof doc === "object" && doc.canvas && Array.isArray(doc.layers);
}

// Imported/restored docs pass through here so a malformed file degrades to
// dropped layers instead of a crash deep inside the renderer.
const LAYER_TYPES = ["text", "image", "shape"];
const num = (v, fallback) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);
export function sanitizeDoc(doc) {
  const w = num(doc.canvas.w, 0);
  const h = num(doc.canvas.h, 0);
  if (w < 50 || h < 50 || w > 8000 || h > 8000) throw new Error("Design has an invalid canvas size");
  const layers = doc.layers
    .filter((l) => l && typeof l === "object" && LAYER_TYPES.includes(l.type) && l.id)
    .map((l) => {
      const base = { ...l, x: num(l.x, w / 2), y: num(l.y, h / 2), rotation: num(l.rotation, 0), opacity: Math.max(0, Math.min(1, num(l.opacity, 1))) };
      if (l.type === "text") {
        if (typeof base.text !== "string") base.text = "";
        base.size = Math.max(4, num(base.size, 24));
        base.lineHeight = num(base.lineHeight, 1.2);
        base.letterSpacing = num(base.letterSpacing, 0);
        base.weight = num(base.weight, 400);
        if (base.width !== null && base.width !== undefined) base.width = num(base.width, null);
      } else {
        base.w = Math.max(1, num(base.w, 100));
        base.h = Math.max(1, num(base.h, 100));
        if (l.type === "image" && typeof base.src !== "string") return null;
      }
      return base;
    })
    .filter(Boolean);
  return { ...doc, brand: doc.brand === "Health" ? "Health" : "Estus", canvas: { ...doc.canvas, w, h }, layers };
}

/* -------------------------------- autosave -------------------------------- */

export async function saveAutosave(doc, meta = {}) {
  try {
    await withStore(DESIGNS, "readwrite", (s) => s.put({ version: DOC_VERSION, savedAt: Date.now(), doc, meta }, AUTOSAVE_KEY));
    return true;
  } catch {
    return false;
  }
}

export async function loadAutosave() {
  try {
    const record = await withStore(DESIGNS, "readonly", (s) => s.get(AUTOSAVE_KEY));
    if (!record || !isValidDoc(record.doc)) return null;
    if ((record.version ?? 2) > DOC_VERSION) {
      // Autosave from a newer app version: keep a backup copy so the default
      // doc this session autosaves over it doesn't destroy the user's work.
      await withStore(DESIGNS, "readwrite", (s) => s.put(record, `${AUTOSAVE_KEY}-v${record.version}-backup`));
      return null;
    }
    const doc = migrateDoc(record.doc, record.version ?? 2);
    return doc ? { doc: sanitizeDoc(doc), meta: record.meta || {} } : null;
  } catch {
    return null;
  }
}

/* -------------------------------- gallery --------------------------------- */

const galleryKey = (id) => `design:${id}`;

export async function saveToGallery(id, name, doc, thumbnail) {
  try {
    await withStore(DESIGNS, "readwrite", (s) =>
      s.put({ version: DOC_VERSION, id, name, savedAt: Date.now(), doc, thumbnail }, galleryKey(id))
    );
    return true;
  } catch {
    return false;
  }
}

export async function listGallery() {
  try {
    const all = await withStore(DESIGNS, "readonly", (s) => s.getAll());
    return (all || [])
      .filter((r) => r && r.id && isValidDoc(r.doc))
      .sort((a, b) => b.savedAt - a.savedAt)
      .map(({ id, name, savedAt, thumbnail, version }) => ({ id, name, savedAt, thumbnail, version }));
  } catch {
    return [];
  }
}

export async function loadFromGallery(id) {
  try {
    const record = await withStore(DESIGNS, "readonly", (s) => s.get(galleryKey(id)));
    if (!record || !isValidDoc(record.doc)) return null;
    const doc = migrateDoc(record.doc, record.version ?? 2);
    return doc ? sanitizeDoc(doc) : null;
  } catch {
    return null;
  }
}

export async function deleteFromGallery(id) {
  try {
    await withStore(DESIGNS, "readwrite", (s) => s.delete(galleryKey(id)));
  } catch {
    /* ignore */
  }
}

/* ------------------------------ key/value slot ---------------------------- */

export async function kvSet(key, value) {
  try {
    await withStore(KV, "readwrite", (s) => s.put(value, key));
    return true;
  } catch {
    return false;
  }
}

export async function kvGet(key) {
  try {
    return (await withStore(KV, "readonly", (s) => s.get(key))) ?? null;
  } catch {
    return null;
  }
}

/* ------------------------------ .json files ------------------------------- */

export function downloadDesignFile(doc, filename) {
  const blob = new Blob([JSON.stringify({ version: DOC_VERSION, doc }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function parseDesignFile(text) {
  const data = JSON.parse(text);
  if (!data || typeof data !== "object" || !isValidDoc(data.doc)) throw new Error("Not a valid design file");
  const doc = migrateDoc(data.doc, data.version ?? 2);
  if (!doc) throw new Error("This design file is from an incompatible older version");
  return sanitizeDoc(doc);
}
