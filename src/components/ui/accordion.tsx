"use client";

import { useState, createContext, useContext, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

interface AccordionContextValue {
  openItems: Set<string>;
  toggle: (value: string) => void;
}

const AccordionContext = createContext<AccordionContextValue>({
  openItems: new Set(),
  toggle: () => {},
});

export interface AccordionProps {
  children: ReactNode;
  type?: "single" | "multiple";
  defaultValue?: string[];
  className?: string;
}

export interface AccordionItemProps {
  value: string;
  children: ReactNode;
  className?: string;
}

export interface AccordionTriggerProps {
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
}

export interface AccordionContentProps {
  children: ReactNode;
  className?: string;
}

function Accordion({
  children,
  type = "single",
  defaultValue = [],
  className,
}: AccordionProps) {
  const [openItems, setOpenItems] = useState(new Set(defaultValue));

  const toggle = (value: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(value)) {
        next.delete(value);
      } else {
        if (type === "single") next.clear();
        next.add(value);
      }
      return next;
    });
  };

  return (
    <AccordionContext.Provider value={{ openItems, toggle }}>
      <div className={cn("space-y-1", className)}>{children}</div>
    </AccordionContext.Provider>
  );
}

function AccordionItem({ value, children, className }: AccordionItemProps) {
  const { openItems } = useContext(AccordionContext);
  const isOpen = openItems.has(value);

  return (
    <div
      className={cn(
        "rounded-xl border border-gray-200 dark:border-gray-700",
        isOpen && "bg-gray-50 dark:bg-gray-800/50",
        className
      )}
      data-state={isOpen ? "open" : "closed"}
    >
      {children}
    </div>
  );
}

function AccordionTrigger({
  children,
  className,
  icon,
}: AccordionTriggerProps) {
  const { toggle } = useContext(AccordionContext);
  const itemContext = useContext(AccordionItemContext);

  return (
    <button
      onClick={() => toggle(itemContext.value)}
      className={cn(
        "flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium transition-colors hover:text-orange-500",
        className
      )}
    >
      <div className="flex items-center gap-2">
        {icon && <span className="h-4 w-4">{icon}</span>}
        {children}
      </div>
      <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 data-[state=open]:rotate-180" />
    </button>
  );
}

interface AccordionItemContextValue {
  value: string;
}

const AccordionItemContext = createContext<AccordionItemContextValue>({
  value: "",
});

function AccordionItemProvider({
  value,
  children,
}: {
  value: string;
  children: ReactNode;
}) {
  return (
    <AccordionItemContext.Provider value={{ value }}>
      {children}
    </AccordionItemContext.Provider>
  );
}

function AccordionContent({
  children,
  className,
}: AccordionContentProps) {
  const { openItems } = useContext(AccordionContext);
  const itemContext = useContext(AccordionItemContext);
  const isOpen = openItems.has(itemContext.value);

  if (!isOpen) return null;

  return (
    <div className={cn("px-4 pb-3 text-sm text-gray-600 dark:text-gray-400", className)}>
      {children}
    </div>
  );
}

// Re-export with proper context wrapping
function AccordionItemWrapper({ value, children, className }: AccordionItemProps) {
  return (
    <AccordionItem value={value} className={className}>
      <AccordionItemProvider value={value}>{children}</AccordionItemProvider>
    </AccordionItem>
  );
}

export { Accordion, AccordionItemWrapper as AccordionItem, AccordionTrigger, AccordionContent };
