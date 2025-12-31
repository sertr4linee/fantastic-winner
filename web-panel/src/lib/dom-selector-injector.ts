/**
 * Script à injecter dans l'iframe pour améliorer la détection d'éléments
 * Optionnel mais recommandé pour les apps complexes
 */

export const DOM_SELECTOR_INJECTOR = `
(function() {
  'use strict';
  
  // Marquer que le sélecteur est actif
  window.__DOM_SELECTOR_ACTIVE__ = true;
  
  // Empêcher les behaviors par défaut pendant l'inspection
  let isInspecting = false;
  
  // Écouter les messages du parent
  window.addEventListener('message', (event) => {
    if (event.data.type === 'DOM_SELECTOR_ENABLE') {
      isInspecting = true;
      document.body.style.cursor = 'crosshair';
    } else if (event.data.type === 'DOM_SELECTOR_DISABLE') {
      isInspecting = false;
      document.body.style.cursor = '';
    }
  });
  
  // Intercepter certains events pendant l'inspection
  document.addEventListener('click', (e) => {
    if (isInspecting) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }
  }, true); // Capture phase
  
  // Désactiver les liens pendant l'inspection
  document.addEventListener('mousedown', (e) => {
    if (isInspecting) {
      e.preventDefault();
    }
  }, true);
  
  // Helper: Générer un ID unique pour tracking
  window.__DOM_SELECTOR_generateId__ = function(element) {
    if (!element.__domSelectorId__) {
      element.__domSelectorId__ = 'elem_' + Math.random().toString(36).substr(2, 9);
    }
    return element.__domSelectorId__;
  };
  
  console.log('[DOM Selector] Injector loaded');
})();
`;

/**
 * Injecte le script dans une iframe
 */
export function injectDOMSelectorScript(iframe: HTMLIFrameElement) {
  const iframeDoc = iframe.contentDocument;
  const iframeWin = iframe.contentWindow;
  
  if (!iframeDoc || !iframeWin) {
    console.warn('[DOM Selector] Cannot inject: iframe not ready');
    return;
  }

  // Vérifier si déjà injecté
  if ((iframeWin as any).__DOM_SELECTOR_ACTIVE__) {
    console.log('[DOM Selector] Already injected');
    return;
  }

  // Créer et injecter le script
  const script = iframeDoc.createElement('script');
  script.textContent = DOM_SELECTOR_INJECTOR;
  (iframeDoc.head || iframeDoc.body).appendChild(script);
  
  console.log('[DOM Selector] Script injected successfully');
}

/**
 * Active/désactive le mode inspection dans l'iframe
 */
export function setInspectionMode(iframe: HTMLIFrameElement, enabled: boolean) {
  const iframeWin = iframe.contentWindow;
  if (!iframeWin) return;

  iframeWin.postMessage(
    {
      type: enabled ? 'DOM_SELECTOR_ENABLE' : 'DOM_SELECTOR_DISABLE',
    },
    '*'
  );
}
