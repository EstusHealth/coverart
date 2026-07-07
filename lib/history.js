"use client";

import { useCallback, useRef, useState } from "react";

const MAX_HISTORY = 60;

// Undo/redo over a document value using committed snapshots.
//
//   const h = useHistory(initial)
//
// h.setDoc(updater)                  — normal edit: pushes the previous doc onto the undo stack.
// h.beginTransient()                 — start of a drag/slider/typing burst: snapshot once.
// h.setDoc(updater, {transient:true})— live updates during the burst: no history entries.
// h.endTransient()                   — end of burst: record the pre-burst snapshot if changed.
// h.replaceDoc(doc)                  — load/restore without recording history.
//
// All bookkeeping happens OUTSIDE the setState updater (StrictMode double-
// invokes updaters; impure updaters would double-push snapshots). docRef is
// kept in sync immediately so sequential setDoc calls within one event
// handler compose correctly.
export function useHistory(initial) {
  const [doc, setDocState] = useState(initial);
  const docRef = useRef(doc);
  const pastRef = useRef([]);
  const futureRef = useRef([]);
  const transientBaseRef = useRef(null);
  const [, setTick] = useState(0);
  const bump = () => setTick((t) => t + 1);

  const push = (snapshot) => {
    pastRef.current.push(snapshot);
    if (pastRef.current.length > MAX_HISTORY) pastRef.current.shift();
    futureRef.current = [];
  };

  const setDoc = useCallback((updater, opts = {}) => {
    const prev = docRef.current;
    if (prev === null || prev === undefined) return;
    const next = typeof updater === "function" ? updater(prev) : updater;
    if (next === prev) return;
    if (opts.transient) {
      if (transientBaseRef.current === null) transientBaseRef.current = prev;
    } else if (transientBaseRef.current === null) {
      push(prev);
    }
    docRef.current = next;
    setDocState(next);
  }, []);

  const beginTransient = useCallback(() => {
    if (transientBaseRef.current === null) transientBaseRef.current = docRef.current;
  }, []);

  const endTransient = useCallback(() => {
    const base = transientBaseRef.current;
    transientBaseRef.current = null;
    if (base !== null && base !== docRef.current) {
      push(base);
      bump();
    }
  }, []);

  const isTransient = useCallback(() => transientBaseRef.current !== null, []);

  const undo = useCallback(() => {
    // Abandon any in-flight transient edit rather than recording it.
    transientBaseRef.current = null;
    if (!pastRef.current.length) return;
    const prev = pastRef.current.pop();
    futureRef.current.push(docRef.current);
    docRef.current = prev;
    setDocState(prev);
    bump();
  }, []);

  const redo = useCallback(() => {
    transientBaseRef.current = null;
    if (!futureRef.current.length) return;
    const next = futureRef.current.pop();
    pastRef.current.push(docRef.current);
    docRef.current = next;
    setDocState(next);
    bump();
  }, []);

  // Correctional update that records no history (e.g. re-tidying stacks after
  // a late webfont load changes text metrics).
  const amendDoc = useCallback((updater) => {
    const prev = docRef.current;
    if (prev === null || prev === undefined) return;
    const next = typeof updater === "function" ? updater(prev) : updater;
    if (next === prev) return;
    docRef.current = next;
    setDocState(next);
  }, []);

  const replaceDoc = useCallback((next) => {
    transientBaseRef.current = null;
    pastRef.current = [];
    futureRef.current = [];
    docRef.current = next;
    setDocState(next);
    bump();
  }, []);

  return {
    doc,
    docRef,
    setDoc,
    beginTransient,
    endTransient,
    isTransient,
    undo,
    redo,
    amendDoc,
    replaceDoc,
    canUndo: pastRef.current.length > 0,
    canRedo: futureRef.current.length > 0,
  };
}
