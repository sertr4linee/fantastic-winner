'use client';

import { useRef, useState } from 'react';
import { useDOMSelector } from '@/hooks/useDOMSelector';
import { DOMOverlay } from '@/components/DOMOverlay';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

/**
 * Exemple d'intégration complète du sélecteur DOM
 * Démo production-ready
 */
export function DOMSelectorDemo() {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [isInspecting, setIsInspecting] = useState(false);
  const [selectedElement, setSelectedElement] = useState<{
    selector: string;
    tag: string;
    id?: string;
    classes?: string[];
  } | null>(null);

  const {
    hoveredBounds,
    selectedBounds,
    clearSelection,
  } = useDOMSelector({
    iframeRef,
    enabled: isInspecting,
    onElementSelect: (element, selector) => {
      console.log('Element selected:', element, selector);
      
      setSelectedElement({
        selector,
        tag: element.tagName.toLowerCase(),
        id: element.id || undefined,
        classes: element.className ? Array.from(element.classList) : undefined,
      });
    },
  });

  const handleToggleInspect = () => {
    if (isInspecting) {
      clearSelection();
    }
    setIsInspecting(!isInspecting);
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Toolbar */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-4 p-4">
          <Button
            variant={isInspecting ? 'default' : 'outline'}
            onClick={handleToggleInspect}
            className="gap-2"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M2 2L14 14M2 2H6M2 2V6M14 14H10M14 14V10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {isInspecting ? 'Inspecting...' : 'Inspect Element'}
          </Button>

          {selectedElement && (
            <Card className="flex items-center gap-2 px-3 py-2">
              <Badge variant="secondary">{selectedElement.tag}</Badge>
              {selectedElement.id && (
                <Badge variant="outline">#{selectedElement.id}</Badge>
              )}
              {selectedElement.classes && selectedElement.classes.length > 0 && (
                <Badge variant="outline">
                  .{selectedElement.classes.slice(0, 2).join('.')}
                </Badge>
              )}
              <code className="text-xs text-muted-foreground ml-2 max-w-md truncate">
                {selectedElement.selector}
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedElement(null);
                  clearSelection();
                }}
                className="h-6 w-6 p-0 ml-2"
              >
                ×
              </Button>
            </Card>
          )}
        </div>
      </div>

      {/* Iframe container */}
      <div className="flex-1 relative">
        <iframe
          ref={iframeRef}
          src="http://localhost:3000" // Votre app à éditer
          className="w-full h-full border-0"
          title="Preview"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />

        {/* Overlays */}
        {isInspecting && (
          <DOMOverlay
            hoveredBounds={hoveredBounds}
            selectedBounds={selectedBounds}
            showLabel={true}
          />
        )}

        {/* Cursor hint */}
        {isInspecting && (
          <div className="absolute top-4 right-4 pointer-events-none">
            <Card className="px-3 py-2 bg-background/95 backdrop-blur">
              <p className="text-sm text-muted-foreground">
                Click to select • ESC to cancel
              </p>
            </Card>
          </div>
        )}
      </div>

      {/* Keyboard shortcuts */}
      {isInspecting && (
        <div className="fixed inset-0 pointer-events-none z-[999997]">
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
            <Card className="px-4 py-2 bg-background/95 backdrop-blur pointer-events-auto">
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 bg-muted rounded">ESC</kbd>
                  <span className="text-muted-foreground">Cancel</span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 bg-muted rounded">Click</kbd>
                  <span className="text-muted-foreground">Select</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
