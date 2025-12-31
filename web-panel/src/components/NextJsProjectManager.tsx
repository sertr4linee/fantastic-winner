"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  PlayIcon,
  StopCircleIcon,
  ExternalLinkIcon,
  RefreshCwIcon,
  FolderIcon,
  CheckCircle2Icon,
  XCircleIcon,
  Loader2Icon,
} from "lucide-react";

export interface NextJsProject {
  path: string;
  name: string;
  packageJsonPath: string;
  hasNextConfig: boolean;
  port: number;
  status: "stopped" | "starting" | "running" | "error";
  error?: string;
}

interface NextJsProjectManagerProps {
  projects: NextJsProject[];
  onStartProject: (projectPath: string) => void;
  onStopProject: (projectPath: string) => void;
  onOpenPreview: (projectPath: string, port: number) => void;
  onRefreshProjects: () => void;
  sendToCopilot?: (prompt: string) => void;
  isLoading?: boolean;
  className?: string;
}

export function NextJsProjectManager({
  projects,
  onStartProject,
  onStopProject,
  onOpenPreview,
  onRefreshProjects,
  sendToCopilot,
  isLoading = false,
  className,
}: NextJsProjectManagerProps) {
  const getStatusIcon = (status: NextJsProject["status"]) => {
    switch (status) {
      case "running":
        return <CheckCircle2Icon className="size-4 text-green-500" />;
      case "starting":
        return <Loader2Icon className="size-4 text-yellow-500 animate-spin" />;
      case "error":
        return <XCircleIcon className="size-4 text-red-500" />;
      default:
        return <StopCircleIcon className="size-4 text-zinc-500" />;
    }
  };

  const getStatusText = (status: NextJsProject["status"]) => {
    switch (status) {
      case "running":
        return "Running";
      case "starting":
        return "Starting...";
      case "error":
        return "Error";
      default:
        return "Stopped";
    }
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-zinc-800 bg-zinc-950 p-6",
        className
      )}
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-bold text-xl text-zinc-100 flex items-center gap-2">
            <svg
              className="size-6"
              viewBox="0 0 180 180"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <mask
                id="mask0_408_139"
                style={{ maskType: "alpha" }}
                maskUnits="userSpaceOnUse"
                x="0"
                y="0"
                width="180"
                height="180"
              >
                <circle cx="90" cy="90" r="90" fill="black" />
              </mask>
              <g mask="url(#mask0_408_139)">
                <circle cx="90" cy="90" r="90" fill="black" />
                <path
                  d="M149.508 157.52L69.142 54H54V125.97H66.1136V69.3836L139.999 164.845C143.333 162.614 146.509 160.165 149.508 157.52Z"
                  fill="url(#paint0_linear_408_139)"
                />
                <rect
                  x="115"
                  y="54"
                  width="12"
                  height="72"
                  fill="url(#paint1_linear_408_139)"
                />
              </g>
              <defs>
                <linearGradient
                  id="paint0_linear_408_139"
                  x1="109"
                  y1="116.5"
                  x2="144.5"
                  y2="160.5"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="white" />
                  <stop offset="1" stopColor="white" stopOpacity="0" />
                </linearGradient>
                <linearGradient
                  id="paint1_linear_408_139"
                  x1="121"
                  y1="54"
                  x2="120.799"
                  y2="106.875"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="white" />
                  <stop offset="1" stopColor="white" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
            Next.js Projects
          </h2>
          <p className="text-sm text-zinc-500">
            Detected Next.js projects in your workspace
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefreshProjects}
          disabled={isLoading}
          className="gap-2 border-zinc-700 hover:bg-zinc-800"
        >
          <RefreshCwIcon
            className={cn("size-4", isLoading && "animate-spin")}
          />
          Refresh
        </Button>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-8 text-center">
          <FolderIcon className="mx-auto size-12 text-zinc-600 mb-3" />
          <p className="text-zinc-300 font-medium">No Next.js projects found</p>
          <p className="text-zinc-500 text-sm mt-1">
            Add a Next.js project to your workspace to get started
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((project) => (
            <div
              key={project.path}
              className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-zinc-800">
                    <svg
                      className="size-5"
                      viewBox="0 0 180 180"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <circle cx="90" cy="90" r="90" fill="white" />
                      <path
                        d="M149.508 157.52L69.142 54H54V125.97H66.1136V69.3836L139.999 164.845C143.333 162.614 146.509 160.165 149.508 157.52Z"
                        fill="black"
                      />
                      <rect x="115" y="54" width="12" height="72" fill="black" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-zinc-100">{project.name}</h3>
                    <p className="text-xs text-zinc-500 font-mono">
                      {project.path}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Status Badge */}
                  <div className="flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1">
                    {getStatusIcon(project.status)}
                    <span className="text-sm text-zinc-300">
                      {getStatusText(project.status)}
                    </span>
                    {project.status === "running" && (
                      <span className="text-xs text-zinc-500">
                        :{project.port}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {project.status === "stopped" || project.status === "error" ? (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => onStartProject(project.path)}
                        className="gap-2 bg-linear-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white border-0 shadow-lg shadow-green-900/30 transition-all"
                      >
                        <PlayIcon className="size-4" />
                        Start Dev
                      </Button>
                    ) : project.status === "starting" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled
                        className="gap-2 border-zinc-700 bg-zinc-800/50"
                      >
                        <Loader2Icon className="size-4 animate-spin" />
                        Starting...
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => onStopProject(project.path)}
                          className="gap-2 bg-linear-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 border-0 shadow-lg shadow-red-900/30 transition-all"
                        >
                          <StopCircleIcon className="size-4" />
                          Stop
                        </Button>
                        {sendToCopilot && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const setupPrompt = `Add DOM Selector support to the Next.js project at ${project.path}:

1. Create the file app/DOMSelectorBridge.tsx with this exact content:
\`\`\`tsx
'use client';

import { useEffect } from 'react';

export function DOMSelectorBridge() {
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'dom-selector-inject' && event.data.script) {
        const script = document.createElement('script');
        script.textContent = event.data.script;
        document.body.appendChild(script);
      }
    };

    window.addEventListener('message', handleMessage);
    
    const injectSelector = () => {
      if ((window as any).__DOM_SELECTOR_INJECTED__) return;
      (window as any).__DOM_SELECTOR_INJECTED__ = true;

      let isInspecting = false;
      let hoverOverlay: HTMLDivElement | null = null;
      let currentElement: Element | null = null;

      function createOverlay() {
        if (hoverOverlay) return;
        hoverOverlay = document.createElement('div');
        hoverOverlay.id = '__dom-selector-overlay__';
        hoverOverlay.style.cssText = \\\`position: fixed; pointer-events: none; z-index: 999999; background: rgba(59, 130, 246, 0.15); border: 2px solid rgba(59, 130, 246, 0.8); transition: all 0.05s ease-out; display: none;\\\`;
        document.body.appendChild(hoverOverlay);
      }

      function removeOverlay() {
        if (hoverOverlay) {
          hoverOverlay.remove();
          hoverOverlay = null;
        }
      }

      function getUniqueSelector(element: Element): string {
        if (element.id) return '#' + element.id;
        const path: string[] = [];
        let current: Element | null = element;
        while (current && current !== document.body && current !== document.documentElement) {
          let selector = current.tagName.toLowerCase();
          if (current.className && typeof current.className === 'string') {
            const classes = current.className.trim().split(/\\\\s+/).filter((c: string) => c && !c.startsWith('hover')).slice(0, 2);
            if (classes.length) selector += '.' + classes.join('.');
          }
          if (current.parentElement) {
            const siblings = Array.from(current.parentElement.children);
            const sameTag = siblings.filter(s => s.tagName === current!.tagName);
            if (sameTag.length > 1) {
              const index = sameTag.indexOf(current) + 1;
              selector += ':nth-of-type(' + index + ')';
            }
          }
          path.unshift(selector);
          current = current.parentElement;
        }
        return path.join(' > ');
      }

      function sendBounds(element: Element | null, type: string) {
        if (!element) {
          window.parent.postMessage({ type: 'dom-selector-' + type, bounds: null }, '*');
          return;
        }
        const rect = element.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(element);
        const styles = {
          display: computedStyle.display, position: computedStyle.position, backgroundColor: computedStyle.backgroundColor,
          color: computedStyle.color, fontSize: computedStyle.fontSize, fontFamily: computedStyle.fontFamily,
          fontWeight: computedStyle.fontWeight, lineHeight: computedStyle.lineHeight,
          padding: computedStyle.padding, paddingTop: computedStyle.paddingTop, paddingRight: computedStyle.paddingRight,
          paddingBottom: computedStyle.paddingBottom, paddingLeft: computedStyle.paddingLeft,
          margin: computedStyle.margin, marginTop: computedStyle.marginTop, marginRight: computedStyle.marginRight,
          marginBottom: computedStyle.marginBottom, marginLeft: computedStyle.marginLeft,
          border: computedStyle.border, borderRadius: computedStyle.borderRadius,
          width: computedStyle.width, height: computedStyle.height, maxWidth: computedStyle.maxWidth, maxHeight: computedStyle.maxHeight,
          minWidth: computedStyle.minWidth, minHeight: computedStyle.minHeight, boxSizing: computedStyle.boxSizing,
          flexDirection: computedStyle.flexDirection, flexWrap: computedStyle.flexWrap, justifyContent: computedStyle.justifyContent,
          alignItems: computedStyle.alignItems, gap: computedStyle.gap, gridTemplateColumns: computedStyle.gridTemplateColumns,
          gridTemplateRows: computedStyle.gridTemplateRows, textAlign: computedStyle.textAlign, textDecoration: computedStyle.textDecoration,
          textTransform: computedStyle.textTransform, letterSpacing: computedStyle.letterSpacing,
          opacity: computedStyle.opacity, transform: computedStyle.transform, transition: computedStyle.transition,
          cursor: computedStyle.cursor, overflow: computedStyle.overflow, zIndex: computedStyle.zIndex,
        };
        const attributes: Record<string, string> = {};
        if (element instanceof HTMLElement) {
          Array.from(element.attributes).forEach(attr => { attributes[attr.name] = attr.value; });
        }
        const textContent = element.textContent?.trim().substring(0, 200) || '';
        window.parent.postMessage({
          type: 'dom-selector-' + type,
          bounds: {
            x: rect.left, y: rect.top, width: rect.width, height: rect.height,
            selector: getUniqueSelector(element), tagName: element.tagName.toLowerCase(),
            id: element.id || undefined, className: element.className || undefined,
            computedStyles: styles, attributes: attributes, textContent: textContent,
            children: element.children.length,
          }
        }, '*');
      }

      function updateOverlay(element: Element | null) {
        if (!hoverOverlay || !element) {
          if (hoverOverlay) hoverOverlay.style.display = 'none';
          return;
        }
        const rect = element.getBoundingClientRect();
        hoverOverlay.style.display = 'block';
        hoverOverlay.style.left = rect.left + 'px';
        hoverOverlay.style.top = rect.top + 'px';
        hoverOverlay.style.width = rect.width + 'px';
        hoverOverlay.style.height = rect.height + 'px';
      }

      function handleMouseMove(e: MouseEvent) {
        if (!isInspecting) return;
        const element = document.elementFromPoint(e.clientX, e.clientY);
        if (!element || element === hoverOverlay || element === document.body || element === document.documentElement) return;
        if (element !== currentElement) {
          currentElement = element;
          updateOverlay(element);
          sendBounds(element, 'hover');
        }
      }

      function handleClick(e: MouseEvent) {
        if (!isInspecting) return;
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        const element = document.elementFromPoint(e.clientX, e.clientY);
        if (element && element !== hoverOverlay) sendBounds(element, 'select');
        return false;
      }

      function handleKeyDown(e: KeyboardEvent) {
        if (e.key === 'Escape' && isInspecting) {
          window.parent.postMessage({ type: 'dom-selector-cancel' }, '*');
        }
      }

      window.addEventListener('message', (e) => {
        if (e.data.type === 'dom-selector-enable') {
          isInspecting = true;
          createOverlay();
          document.body.style.cursor = 'crosshair';
        } else if (e.data.type === 'dom-selector-disable') {
          isInspecting = false;
          removeOverlay();
          currentElement = null;
          document.body.style.cursor = '';
        }
      });

      document.addEventListener('mousemove', handleMouseMove, { capture: true, passive: true });
      document.addEventListener('click', handleClick, { capture: true });
      document.addEventListener('keydown', handleKeyDown, { capture: true });
      window.parent.postMessage({ type: 'dom-selector-ready' }, '*');
    };

    const timeout = setTimeout(injectSelector, 100);
    return () => {
      window.removeEventListener('message', handleMessage);
      clearTimeout(timeout);
    };
  }, []);

  return null;
}
\`\`\`

2. Update app/layout.tsx to import and use DOMSelectorBridge:
- Add: import { DOMSelectorBridge } from './DOMSelectorBridge';
- Add <DOMSelectorBridge /> inside the body tag (before or after children)

This enables cross-origin DOM element selection for the web panel inspector.`;
                              sendToCopilot(setupPrompt);
                            }}
                            className="gap-2 text-xs border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-all"
                          >
                            🔧 Setup DOM
                          </Button>
                        )}
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => onOpenPreview(project.path, project.port)}
                          className="gap-2 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 shadow-lg shadow-blue-900/30 transition-all"
                        >
                          <ExternalLinkIcon className="size-4" />
                          Preview
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Error message */}
              {project.error && (
                <div className="mt-3 rounded-md border border-red-900/50 bg-red-950/20 p-3 text-sm text-red-300">
                  {project.error}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
