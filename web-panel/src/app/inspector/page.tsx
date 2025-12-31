'use client';

import { AdvancedDOMSelector, type ElementSelectionData } from '@/components/AdvancedDOMSelector';

/**
 * Page exemple d'intégration du sélecteur DOM avancé
 */
export default function InspectorPage() {
  const handleElementSelect = (data: ElementSelectionData) => {
    console.log('Element selected:', data);
    
    // Ici tu peux:
    // - Envoyer les données à VS Code via WebSocket
    // - Afficher un panel d'édition
    // - Générer du code React/HTML
    // - Modifier l'élément en temps réel
    // - etc.
  };

  return (
    <div className="h-screen w-screen overflow-hidden">
      <AdvancedDOMSelector
        targetUrl="http://localhost:3000" // Ton app Next.js
        onElementSelect={handleElementSelect}
        defaultInspecting={false}
      />
    </div>
  );
}
