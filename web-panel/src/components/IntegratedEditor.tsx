'use client';

import { useState, useCallback } from 'react';
import { NextJsProjectManager } from '@/components/NextJsProjectManager';
import { AdvancedDOMSelector, type ElementSelectionData } from '@/components/AdvancedDOMSelector';
import { useVSCodeBridge } from '@/hooks/useVSCodeBridge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Code2, FileCode, Wand2 } from 'lucide-react';

/**
 * Composant intégré : Next.js Project Manager + DOM Inspector
 * Permet de:
 * 1. Gérer les projets Next.js (start/stop)
 * 2. Inspecter les éléments visuellement
 * 3. Générer du code React automatiquement
 * 4. Envoyer les prompts à GitHub Copilot
 */
export function IntegratedEditor() {
  const { 
    nextJsProjects, 
    detectNextJsProjects, 
    startNextJsProject, 
    stopNextJsProject,
    sendToCopilot,
  } = useVSCodeBridge();

  const [selectedElement, setSelectedElement] = useState<ElementSelectionData | null>(null);
  const [activeProject, setActiveProject] = useState<string | null>(null);
  const [generatedCode, setGeneratedCode] = useState<string>('');

  // Détecter les projets au montage
  useState(() => {
    detectNextJsProjects();
  });

  // Trouver le projet actif qui tourne
  const runningProject = nextJsProjects.find(p => p.status === 'running');

  // Générer du code React basé sur l'élément sélectionné
  const generateReactCode = useCallback((data: ElementSelectionData) => {
    const { tag, id, classes, textContent } = data.element;
    const { styles } = data;

    // Construire les props
    const props: string[] = [];
    if (id) props.push(`id="${id}"`);
    if (classes.length) {
      const classString = classes
        .filter(c => !c.startsWith('hover-') && !c.startsWith('active-'))
        .join(' ');
      if (classString) props.push(`className="${classString}"`);
    }

    // Extraire les styles inline si nécessaire
    const inlineStyles: string[] = [];
    if (styles) {
      if (styles.backgroundColor && styles.backgroundColor !== 'rgba(0, 0, 0, 0)') {
        inlineStyles.push(`backgroundColor: '${styles.backgroundColor}'`);
      }
      if (styles.color && styles.color !== 'rgb(0, 0, 0)') {
        inlineStyles.push(`color: '${styles.color}'`);
      }
      if (styles.fontSize) {
        inlineStyles.push(`fontSize: '${styles.fontSize}'`);
      }
    }

    const stylesProp = inlineStyles.length > 0
      ? `style={{ ${inlineStyles.join(', ')} }}`
      : '';

    // Générer le code
    const code = `<${tag} ${props.join(' ')} ${stylesProp}>
  ${textContent || 'Content here'}
</${tag}>`;

    return code;
  }, []);

  // Callback quand un élément est sélectionné
  const handleElementSelect = useCallback((data: ElementSelectionData) => {
    setSelectedElement(data);
    const code = generateReactCode(data);
    setGeneratedCode(code);
  }, [generateReactCode]);

  // Générer avec AI
  const handleGenerateWithAI = useCallback(() => {
    if (!selectedElement) return;

    const prompt = `Generate a modern React component based on this element:
- Tag: ${selectedElement.element.tag}
- Classes: ${selectedElement.element.classes.join(', ')}
- Styles: ${JSON.stringify(selectedElement.styles, null, 2)}

Create a functional React component with TypeScript, using Tailwind CSS classes when possible.`;

    sendToCopilot(prompt);
  }, [selectedElement, sendToCopilot]);

  // Insérer le code dans l'éditeur VS Code
  const handleInsertCode = useCallback(() => {
    if (!generatedCode) return;

    // Envoyer à VS Code via le bridge
    sendToCopilot(`Insert this code at cursor position:\n\n${generatedCode}`);
  }, [generatedCode, sendToCopilot]);

  return (
    <div className="flex flex-col h-screen">
      {/* Header avec info du projet actif */}
      <div className="border-b bg-background/95 backdrop-blur p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold">AI App Builder</h1>
            {runningProject && (
              <Badge variant="outline" className="gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                {runningProject.name} • Port {runningProject.port}
              </Badge>
            )}
          </div>

          {selectedElement && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleInsertCode}
                className="gap-2"
              >
                <FileCode className="w-4 h-4" />
                Insert Code
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleGenerateWithAI}
                className="gap-2"
              >
                <Wand2 className="w-4 h-4" />
                Generate with AI
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Layout principal */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar gauche - Project Manager */}
        <div className="w-80 border-r overflow-y-auto">
          <NextJsProjectManager 
            projects={nextJsProjects}
            onStartProject={startNextJsProject}
            onStopProject={stopNextJsProject}
            onOpenPreview={(path) => setActiveProject(path)}
            onRefreshProjects={detectNextJsProjects}
          />
        </div>

        {/* Zone centrale - DOM Inspector */}
        <div className="flex-1 flex flex-col">
          {runningProject ? (
            <AdvancedDOMSelector
              targetUrl={`http://localhost:${runningProject.port}`}
              onElementSelect={handleElementSelect}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <Card className="p-8 max-w-md text-center">
                <h3 className="text-lg font-semibold mb-2">No Project Running</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Start a Next.js project from the sidebar to begin inspecting elements.
                </p>
                <Button onClick={detectNextJsProjects}>
                  Detect Projects
                </Button>
              </Card>
            </div>
          )}
        </div>

        {/* Sidebar droite - Code Panel */}
        {selectedElement && (
          <div className="w-96 border-l flex flex-col overflow-y-auto">
            <div className="border-b p-2 flex gap-1">
              <Button variant="ghost" size="sm" className="text-xs">
                <Code2 className="w-3 h-3 mr-1" />
                Code
              </Button>
              <Button variant="ghost" size="sm" className="text-xs">
                Styles
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">React Component</h4>
                <Card className="p-3">
                  <pre className="text-xs font-mono overflow-x-auto">
                    <code>{generatedCode}</code>
                  </pre>
                </Card>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">CSS Selector</h4>
                <Card className="p-3">
                  <code className="text-xs">{selectedElement.selector}</code>
                </Card>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">Element Info</h4>
                <Card className="p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{selectedElement.element.tag}</Badge>
                    {selectedElement.element.id && (
                      <Badge variant="outline">#{selectedElement.element.id}</Badge>
                    )}
                  </div>
                  {selectedElement.element.classes.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {selectedElement.element.classes.map(cls => (
                        <Badge key={cls} variant="outline" className="text-xs">
                          .{cls}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {selectedElement.element.textContent && (
                    <p className="text-xs text-muted-foreground">
                      {selectedElement.element.textContent}
                    </p>
                  )}
                </Card>
              </div>

              {selectedElement.styles && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Computed Styles</h4>
                  <Card className="p-3">
                    <pre className="text-xs font-mono">
                      {Object.entries(selectedElement.styles)
                        .filter(([_, value]) => value)
                        .map(([key, value]) => {
                          const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
                          return `${cssKey}: ${value};`;
                        })
                        .join('\n')}
                    </pre>
                  </Card>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
