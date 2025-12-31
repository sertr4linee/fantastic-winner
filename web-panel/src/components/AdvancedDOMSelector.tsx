'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { useDOMSelector } from '@/hooks/useDOMSelector';
import { DOMOverlay } from '@/components/DOMOverlay';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  MousePointerClick, 
  Copy, 
  Code2, 
  Eye, 
  EyeOff,
  Maximize2,
  RefreshCw,
  X
} from 'lucide-react';
import { injectDOMSelectorScript, setInspectionMode } from '@/lib/dom-selector-injector';

interface AdvancedDOMSelectorProps {
  /** URL de l'application à charger dans l'iframe */
  targetUrl: string;
  /** Callback quand un élément est sélectionné */
  onElementSelect?: (data: ElementSelectionData) => void;
  /** Mode par défaut */
  defaultInspecting?: boolean;
}

export interface ElementSelectionData {
  selector: string;
  element: {
    tag: string;
    id?: string;
    classes: string[];
    textContent?: string;
  };
  styles?: Partial<CSSStyleDeclaration>;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * Composant avancé de sélection DOM avec toutes les features
 * Production-ready avec injection de script, extraction de styles, etc.
 */
export function AdvancedDOMSelector({
  targetUrl,
  onElementSelect,
  defaultInspecting = false,
}: AdvancedDOMSelectorProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [isInspecting, setIsInspecting] = useState(defaultInspecting);
  const [selectedData, setSelectedData] = useState<ElementSelectionData | null>(null);
  const [showStyles, setShowStyles] = useState(false);
  const [iframeReady, setIframeReady] = useState(false);

  const {
    hoveredBounds,
    selectedBounds,
    clearSelection,
  } = useDOMSelector({
    iframeRef,
    enabled: isInspecting && iframeReady,
    onElementSelect: (element, selector) => {
      // Extraire les computed styles
      const iframe = iframeRef.current;
      const iframeWin = iframe?.contentWindow;
      
      let computedStyles: Partial<CSSStyleDeclaration> | undefined;
      
      if (iframeWin) {
        const styles = iframeWin.getComputedStyle(element);
        computedStyles = {
          display: styles.display,
          position: styles.position,
          width: styles.width,
          height: styles.height,
          padding: styles.padding,
          margin: styles.margin,
          backgroundColor: styles.backgroundColor,
          color: styles.color,
          fontSize: styles.fontSize,
          fontFamily: styles.fontFamily,
          fontWeight: styles.fontWeight,
          lineHeight: styles.lineHeight,
          borderRadius: styles.borderRadius,
          border: styles.border,
          boxShadow: styles.boxShadow,
          zIndex: styles.zIndex,
        };
      }

      const data: ElementSelectionData = {
        selector,
        element: {
          tag: element.tagName.toLowerCase(),
          id: element.id || undefined,
          classes: Array.from(element.classList),
          textContent: element.textContent?.trim().substring(0, 100),
        },
        styles: computedStyles,
        bounds: {
          x: selectedBounds?.x ?? 0,
          y: selectedBounds?.y ?? 0,
          width: selectedBounds?.width ?? 0,
          height: selectedBounds?.height ?? 0,
        },
      };

      setSelectedData(data);
      onElementSelect?.(data);
    },
  });

  // Injection du script quand l'iframe est prête
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      console.log('[AdvancedDOMSelector] Iframe loaded, injecting script...');
      injectDOMSelectorScript(iframe);
      setIframeReady(true);
    };

    if (iframe.contentDocument?.readyState === 'complete') {
      handleLoad();
    } else {
      iframe.addEventListener('load', handleLoad);
    }

    return () => {
      iframe.removeEventListener('load', handleLoad);
    };
  }, []);

  // Activer/désactiver le mode inspection
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !iframeReady) return;

    setInspectionMode(iframe, isInspecting);
  }, [isInspecting, iframeReady]);

  const handleToggleInspect = useCallback(() => {
    if (isInspecting) {
      clearSelection();
      setSelectedData(null);
    }
    setIsInspecting(!isInspecting);
  }, [isInspecting, clearSelection]);

  const handleCopySelector = useCallback(() => {
    if (selectedData) {
      navigator.clipboard.writeText(selectedData.selector);
    }
  }, [selectedData]);

  const handleCopyStyles = useCallback(() => {
    if (selectedData?.styles) {
      const cssText = Object.entries(selectedData.styles)
        .filter(([_, value]) => value)
        .map(([key, value]) => {
          const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
          return `  ${cssKey}: ${value};`;
        })
        .join('\n');
      
      navigator.clipboard.writeText(`{\n${cssText}\n}`);
    }
  }, [selectedData]);

  const handleRefresh = useCallback(() => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
      setIframeReady(false);
      clearSelection();
      setSelectedData(null);
    }
  }, [clearSelection]);

  const handleMaximize = useCallback(() => {
    if (iframeRef.current) {
      iframeRef.current.requestFullscreen?.();
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC pour désactiver l'inspection
      if (e.key === 'Escape' && isInspecting) {
        handleToggleInspect();
      }
      
      // Cmd/Ctrl + I pour toggle inspection
      if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
        e.preventDefault();
        handleToggleInspect();
      }

      // Cmd/Ctrl + C pour copier le sélecteur
      if ((e.metaKey || e.ctrlKey) && e.key === 'c' && selectedData) {
        e.preventDefault();
        handleCopySelector();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isInspecting, selectedData, handleToggleInspect, handleCopySelector]);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar principal */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="flex items-center justify-between gap-2 p-3">
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isInspecting ? 'default' : 'outline'}
                    size="sm"
                    onClick={handleToggleInspect}
                    disabled={!iframeReady}
                    className="gap-2"
                  >
                    <MousePointerClick className="w-4 h-4" />
                    {isInspecting ? 'Inspecting...' : 'Inspect'}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Toggle inspect mode (⌘I)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {!iframeReady && (
              <Badge variant="outline" className="text-xs">
                Loading...
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRefresh}
                    className="h-8 w-8 p-0"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Refresh iframe</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMaximize}
                    className="h-8 w-8 p-0"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Fullscreen</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Info barre de sélection */}
        {selectedData && (
          <>
            <Separator />
            <div className="p-3 bg-muted/30">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className="font-mono">
                      {selectedData.element.tag}
                    </Badge>
                    {selectedData.element.id && (
                      <Badge variant="outline" className="font-mono text-xs">
                        #{selectedData.element.id}
                      </Badge>
                    )}
                    {selectedData.element.classes.length > 0 && (
                      <Badge variant="outline" className="font-mono text-xs">
                        .{selectedData.element.classes.slice(0, 2).join('.')}
                      </Badge>
                    )}
                  </div>
                  
                  <code className="text-xs text-muted-foreground block truncate">
                    {selectedData.selector}
                  </code>
                  
                  {selectedData.element.textContent && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      "{selectedData.element.textContent}"
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCopySelector}
                          className="h-7 w-7 p-0"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Copy selector (⌘C)</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowStyles(!showStyles)}
                          className="h-7 w-7 p-0"
                        >
                          {showStyles ? (
                            <EyeOff className="w-3 h-3" />
                          ) : (
                            <Eye className="w-3 h-3" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Toggle styles</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCopyStyles}
                          disabled={!selectedData.styles}
                          className="h-7 w-7 p-0"
                        >
                          <Code2 className="w-3 h-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Copy CSS</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedData(null);
                      clearSelection();
                    }}
                    className="h-7 w-7 p-0"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              {/* Styles panel */}
              {showStyles && selectedData.styles && (
                <Card className="mt-3 p-3 max-h-48 overflow-y-auto">
                  <pre className="text-xs font-mono">
                    {Object.entries(selectedData.styles)
                      .filter(([_, value]) => value)
                      .map(([key, value]) => {
                        const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
                        return `${cssKey}: ${value};`;
                      })
                      .join('\n')}
                  </pre>
                </Card>
              )}
            </div>
          </>
        )}
      </div>

      {/* Iframe container */}
      <div className="flex-1 relative bg-muted/10">
        <iframe
          ref={iframeRef}
          src={targetUrl}
          className="w-full h-full border-0"
          title="Preview"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
        />

        {/* Overlays */}
        {isInspecting && iframeReady && (
          <DOMOverlay
            hoveredBounds={hoveredBounds}
            selectedBounds={selectedBounds}
            showLabel={true}
          />
        )}

        {/* Hint overlay */}
        {isInspecting && iframeReady && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none z-[999997]">
            <Card className="px-4 py-2 bg-background/95 backdrop-blur pointer-events-auto">
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 bg-muted rounded text-[10px] font-mono">
                    ESC
                  </kbd>
                  <span className="text-muted-foreground">Cancel</span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 bg-muted rounded text-[10px] font-mono">
                    Click
                  </kbd>
                  <span className="text-muted-foreground">Select</span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 bg-muted rounded text-[10px] font-mono">
                    ⌘C
                  </kbd>
                  <span className="text-muted-foreground">Copy</span>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
