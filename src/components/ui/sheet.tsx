"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

export interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

export interface SheetContentProps {
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
}

export interface SheetHeaderProps {
  children: ReactNode;
  className?: string;
}

export interface SheetTitleProps {
  children: ReactNode;
  className?: string;
}

export interface SheetDescriptionProps {
  children: ReactNode;
  className?: string;
}

export interface SheetFooterProps {
  children: ReactNode;
  className?: string;
}

function Sheet({ open, onOpenChange, children }: SheetProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      {children}
    </div>
  );
}

function SheetContent({
  children,
  side = "right",
  className,
}: SheetContentProps) {
  const sideStyles = {
    top: "inset-x-0 top-0 border-b",
    bottom: "inset-x-0 bottom-0 border-t",
    left: "inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm",
    right: "inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm",
  };

  return (
    <div className={cn("fixed z-50 gap-4 bg-white p-6 shadow-xl transition ease-in-out dark:bg-gray-900", sideStyles[side], className)}>
      {children}
    </div>
  );
}

function SheetHeader({ children, className }: SheetHeaderProps) {
  return (
    <div className={cn("flex flex-col space-y-2 text-center sm:text-left", className)}>
      {children}
    </div>
  );
}

function SheetTitle({ children, className }: SheetTitleProps) {
  return (
    <h2 className={cn("text-lg font-semibold text-gray-900 dark:text-gray-100", className)}>
      {children}
    </h2>
  );
}

function SheetDescription({ children, className }: SheetDescriptionProps) {
  return (
    <p className={cn("text-sm text-gray-500 dark:text-gray-400", className)}>
      {children}
    </p>
  );
}

function SheetFooter({ children, className }: SheetFooterProps) {
  return (
    <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}>
      {children}
    </div>
  );
}

function SheetClose({
  onOpenChange,
  className,
}: {
  onOpenChange: (open: boolean) => void;
  className?: string;
}) {
  return (
    <button
      onClick={() => onOpenChange(false)}
      className={cn(
        "absolute right-4 top-4 rounded-lg p-1 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300",
        className
      )}
    >
      <X className="h-4 w-4" />
    </button>
  );
}

export { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose };
