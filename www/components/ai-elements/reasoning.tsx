"use client";

import * as React from "react";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReasoningContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  isStreaming: boolean;
}

const ReasoningContext = React.createContext<ReasoningContextType | undefined>(
  undefined
);

const useReasoningContext = () => {
  const context = React.useContext(ReasoningContext);
  if (!context) {
    throw new Error("Reasoning components must be used within Reasoning");
  }
  return context;
};

export const Reasoning = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { isStreaming?: boolean }
>(({ className, children, isStreaming = false, ...props }, ref) => {
  const [isOpen, setIsOpen] = React.useState(false);

  // Auto-open when streaming starts, auto-close when streaming ends
  React.useEffect(() => {
    if (isStreaming) {
      setIsOpen(true);
    } else if (!isStreaming && isOpen) {
      // Auto-close after streaming finishes
      const timer = setTimeout(() => {
        setIsOpen(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isStreaming, isOpen]);

  return (
    <ReasoningContext.Provider value={{ isOpen, setIsOpen, isStreaming }}>
      <div
        ref={ref}
        className={cn(
          "rounded-lg border border-blue-800/50 bg-blue-950/20 overflow-hidden",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </ReasoningContext.Provider>
  );
});
Reasoning.displayName = "Reasoning";

export const ReasoningTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => {
  const { isOpen, setIsOpen, isStreaming } = useReasoningContext();

  return (
    <button
      ref={ref}
      className={cn(
        "flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-blue-900/20",
        className
      )}
      onClick={() => setIsOpen(!isOpen)}
      {...props}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-blue-200">
          {isStreaming ? "Thinking..." : "Reasoning"}
        </span>
        {isStreaming && (
          <span className="size-2 animate-pulse rounded-full bg-blue-400" />
        )}
      </div>
      {isOpen ? (
        <ChevronDownIcon className="size-4 text-blue-400" />
      ) : (
        <ChevronRightIcon className="size-4 text-blue-400" />
      )}
    </button>
  );
});
ReasoningTrigger.displayName = "ReasoningTrigger";

export const ReasoningContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const { isOpen } = useReasoningContext();

  if (!isOpen) return null;

  return (
    <div
      ref={ref}
      className={cn(
        "border-t border-blue-800/50 bg-blue-950/30 px-4 py-3 text-sm text-blue-100 whitespace-pre-wrap font-mono",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});
ReasoningContent.displayName = "ReasoningContent";
