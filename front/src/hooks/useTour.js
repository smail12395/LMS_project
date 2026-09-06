// src/hooks/useTour.js
// Page-level hook that resumes the preview product tour when the current route
// is ready (i.e. its data-tour elements exist in the DOM).
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { resumeForRoute, clearActiveDriver } from '../services/previewTourController';

export const useTour = (ready = true, ctx = {}, force = false) => {
  const location = useLocation();
  const ctxRef = useRef({});
  ctxRef.current = { ...ctxRef.current, ...ctx };
  const readyRef = useRef(ready);
  readyRef.current = ready;

  useEffect(() => {
    if (!readyRef.current) return;
    resumeForRoute(location.pathname, ctxRef.current);
    // Destroy the spotlight on unmount / re-run so the overlay never lingers.
    return () => clearActiveDriver();
  }, [location.pathname, ready, force]);
};
