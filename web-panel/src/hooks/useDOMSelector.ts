'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export interface ElementBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  element: HTMLElement;
  selector: string;
}

interface UseDOMSelectorOptions {
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  enabled?: boolean;
  onElementSelect?: (element: HTMLElement, selector: string) => void;
  throttleMs?: number;
}

/**
 * Hook production-grade pour sélection DOM avec overlay fluide
 * Inspiré de Builder.io et Webflow
 */
export function useDOMSelector({
  iframeRef,
  enabled = true,
  onElementSelect,
  throttleMs = 16, // ~60fps
}: UseDOMSelectorOptions) {
  const [hoveredBounds, setHoveredBounds] = useState<ElementBounds | null>(null);
  const [selectedBounds, setSelectedBounds] = useState<ElementBounds | null>(null);
  const [iframeOffset, setIframeOffset] = useState({ x: 0, y: 0 });

  const rafIdRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const currentElementRef = useRef<HTMLElement | null>(null);

  /**
   * Calcule un sélecteur CSS unique pour un élément
   * Stratégie: ID > data-* > class combo > nth-child
   */
  const getUniqueSelector = useCallback((element: HTMLElement): string => {
    // Priorité 1: ID unique
    if (element.id) {
      return `#${element.id}`;
    }

    // Priorité 2: Attributs data-* custom
    const dataAttrs = Array.from(element.attributes)
      .filter(attr => attr.name.startsWith('data-'))
      .map(attr => `[${attr.name}="${attr.value}"]`)
      .join('');
    if (dataAttrs) {
      const testSelector = `${element.tagName.toLowerCase()}${dataAttrs}`;
      const doc = element.ownerDocument;
      if (doc.querySelectorAll(testSelector).length === 1) {
        return testSelector;
      }
    }

    // Priorité 3: Classes (max 3 pour éviter les sélecteurs trop longs)
    const classes = Array.from(element.classList)
      .filter(cls => !cls.startsWith('hover-') && !cls.startsWith('active-'))
      .slice(0, 3)
      .join('.');
    
    if (classes) {
      const testSelector = `${element.tagName.toLowerCase()}.${classes}`;
      const doc = element.ownerDocument;
      if (doc.querySelectorAll(testSelector).length === 1) {
        return testSelector;
      }
    }

    // Priorité 4: nth-child path
    const path: string[] = [];
    let current: HTMLElement | null = element;
    
    while (current && current !== element.ownerDocument.body) {
      let selector = current.tagName.toLowerCase();
      
      if (current.parentElement) {
        const siblings = Array.from(current.parentElement.children);
        const sameTagSiblings = siblings.filter(
          sibling => sibling.tagName === current!.tagName
        );
        
        if (sameTagSiblings.length > 1) {
          const index = sameTagSiblings.indexOf(current) + 1;
          selector += `:nth-of-type(${index})`;
        }
      }
      
      path.unshift(selector);
      current = current.parentElement;
    }

    return path.join(' > ');
  }, []);

  /**
   * Calcule la bounding box précise avec tous les edge cases
   * Gère: scroll, transforms, iframe offset, zoom
   */
  const calculateBounds = useCallback(
    (element: HTMLElement): ElementBounds | null => {
      if (!iframeRef.current) return null;

      const iframeDoc = iframeRef.current.contentDocument;
      const iframeWin = iframeRef.current.contentWindow;
      
      if (!iframeDoc || !iframeWin) return null;

      // 1. Récupérer le rect de l'élément dans l'iframe
      const rect = element.getBoundingClientRect();

      // 2. Récupérer le rect de l'iframe dans la page parent
      const iframeRect = iframeRef.current.getBoundingClientRect();

      // 3. Calculer le scroll de l'iframe
      const scrollX = iframeWin.pageXOffset || iframeDoc.documentElement.scrollLeft;
      const scrollY = iframeWin.pageYOffset || iframeDoc.documentElement.scrollTop;

      // 4. Détecter le zoom (devicePixelRatio ou transform scale)
      const zoom = iframeWin.devicePixelRatio || 1;
      
      // 5. Calculer les coordonnées finales dans le parent
      // rect est déjà relatif au viewport de l'iframe
      const x = iframeRect.left + rect.left;
      const y = iframeRect.top + rect.top;

      // 6. Vérifier si l'élément est visible
      if (rect.width === 0 || rect.height === 0) return null;

      return {
        x,
        y,
        width: rect.width,
        height: rect.height,
        element,
        selector: getUniqueSelector(element),
      };
    },
    [iframeRef, getUniqueSelector]
  );

  /**
   * Update throttlé avec RAF pour performance optimale
   */
  const updateHoveredElement = useCallback(
    (element: HTMLElement | null) => {
      // Anti-jitter: ne pas update si c'est le même élément
      if (element === currentElementRef.current) return;

      const now = performance.now();
      
      // Throttling basé sur le temps
      if (now - lastUpdateRef.current < throttleMs) {
        return;
      }

      // Annuler l'ancien RAF si en cours
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }

      rafIdRef.current = requestAnimationFrame(() => {
        currentElementRef.current = element;
        lastUpdateRef.current = now;

        if (element) {
          const bounds = calculateBounds(element);
          setHoveredBounds(bounds);
        } else {
          setHoveredBounds(null);
        }

        rafIdRef.current = null;
      });
    },
    [calculateBounds, throttleMs]
  );

  /**
   * Gestion du mousemove dans l'iframe
   */
  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!enabled) return;

      const target = event.target as HTMLElement;
      
      console.log('[useDOMSelector] Mouse move - target:', target?.tagName);
      
      // Filtrer les éléments non désirés
      if (!target || target === document.body || target === document.documentElement) {
        updateHoveredElement(null);
        return;
      }

      updateHoveredElement(target);
    },
    [enabled, updateHoveredElement]
  );

  /**
   * Gestion du click pour sélection
   */
  const handleClick = useCallback(
    (event: MouseEvent) => {
      if (!enabled) return;

      console.log('[useDOMSelector] Click detected');

      event.preventDefault();
      event.stopPropagation();

      const target = event.target as HTMLElement;
      if (!target) return;

      console.log('[useDOMSelector] Click target:', target.tagName);

      const bounds = calculateBounds(target);
      if (bounds) {
        console.log('[useDOMSelector] Setting selected bounds:', bounds);
        setSelectedBounds(bounds);
        onElementSelect?.(target, bounds.selector);
      }
    },
    [enabled, calculateBounds, onElementSelect]
  );

  /**
   * Update de l'offset de l'iframe (resize, scroll parent)
   */
  const updateIframeOffset = useCallback(() => {
    if (!iframeRef.current) return;

    const rect = iframeRef.current.getBoundingClientRect();
    setIframeOffset({ x: rect.left, y: rect.top });

    // Re-calculer les bounds si un élément est sélectionné
    if (currentElementRef.current) {
      const bounds = calculateBounds(currentElementRef.current);
      setHoveredBounds(bounds);
    }
  }, [iframeRef, calculateBounds]);

  /**
   * Setup des event listeners dans l'iframe
   */
  useEffect(() => {
    console.log('[useDOMSelector] Effect triggered - enabled:', enabled, 'iframe:', !!iframeRef.current);
    
    if (!enabled) return;

    const iframe = iframeRef.current;
    if (!iframe) {
      console.log('[useDOMSelector] No iframe ref');
      return;
    }

    const iframeDoc = iframe.contentDocument;
    const iframeWin = iframe.contentWindow;
    
    console.log('[useDOMSelector] Checking iframe access:', {
      hasContentDocument: !!iframeDoc,
      hasContentWindow: !!iframeWin,
      hasBody: !!iframeDoc?.body,
      iframeSrc: iframe.src,
      iframeReady: iframeDoc?.readyState,
      documentOrigin: typeof window !== 'undefined' ? window.location.origin : 'unknown',
      iframeOrigin: iframe.src ? new URL(iframe.src).origin : 'unknown'
    });
    
    if (!iframeDoc || !iframeWin) {
      console.error('[useDOMSelector] Cannot access iframe content - CORS or timing issue');
      console.error('[useDOMSelector] This usually means iframe is cross-origin or not ready yet');
      return;
    }

    console.log('[useDOMSelector] Setting up event listeners...');

    // Attendre que l'iframe soit complètement chargée
    const setupListeners = () => {
      console.log('[useDOMSelector] Listeners setup called');
      iframeDoc.addEventListener('mousemove', handleMouseMove, { passive: true });
      iframeDoc.addEventListener('click', handleClick, { capture: true });
      iframeWin.addEventListener('scroll', updateIframeOffset, { passive: true });
      iframeWin.addEventListener('resize', updateIframeOffset, { passive: true });
      console.log('[useDOMSelector] Event listeners attached');
    };

    if (iframeDoc.readyState === 'complete') {
      console.log('[useDOMSelector] iframe already loaded');
      setupListeners();
    } else {
      console.log('[useDOMSelector] Waiting for iframe to load');
      iframeWin.addEventListener('load', setupListeners);
    }

    // Observer le resize de l'iframe dans le parent
    const resizeObserver = new ResizeObserver(updateIframeOffset);
    resizeObserver.observe(iframe);

    // Scroll du parent
    window.addEventListener('scroll', updateIframeOffset, { passive: true });

    return () => {
      iframeDoc.removeEventListener('mousemove', handleMouseMove);
      iframeDoc.removeEventListener('click', handleClick);
      iframeWin.removeEventListener('scroll', updateIframeOffset);
      iframeWin.removeEventListener('resize', updateIframeOffset);
      iframeWin.removeEventListener('load', setupListeners);
      resizeObserver.disconnect();
      window.removeEventListener('scroll', updateIframeOffset);

      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [enabled, iframeRef, handleMouseMove, handleClick, updateIframeOffset]);

  /**
   * Déselection
   */
  const clearSelection = useCallback(() => {
    setSelectedBounds(null);
  }, []);

  return {
    hoveredBounds,
    selectedBounds,
    iframeOffset,
    clearSelection,
  };
}
