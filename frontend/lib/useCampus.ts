"use client";
import { useEffect, useRef, useState } from "react";
import { getIncident, getState } from "./api";
import type { CampusState, Incident } from "./types";

/** Polls the campus state. The API advances the simulation on every call. */
export function useCampus(intervalMs = 1500) {
  const [state, setState] = useState<CampusState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);

  useEffect(() => {
    let alive = true;
    const pull = async () => {
      if (busy.current) return;
      busy.current = true;
      try {
        const s = await getState();
        if (alive) {
          setState(s);
          setError(null);
        }
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Cannot reach the API");
      } finally {
        busy.current = false;
      }
    };
    pull();
    const t = setInterval(pull, intervalMs);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [intervalMs]);

  return { state, error, setState };
}

/** Polls one incident until it is closed. */
export function useIncident(id: string | null, intervalMs = 1200) {
  const [incident, setIncident] = useState<Incident | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setIncident(null);
      return;
    }
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const pull = async () => {
      try {
        const inc = await getIncident(id);
        if (!alive) return;
        setIncident(inc);
        setError(null);
        if (inc.status === "investigating") timer = setTimeout(pull, intervalMs);
      } catch (e) {
        if (alive) {
          setError(e instanceof Error ? e.message : "Cannot load incident");
          timer = setTimeout(pull, intervalMs * 2);
        }
      }
    };
    pull();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [id, intervalMs]);

  return { incident, error };
}
