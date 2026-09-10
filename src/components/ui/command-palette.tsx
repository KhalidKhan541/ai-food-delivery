"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import { Search, Command } from "lucide-react";
import { cn } from "@/lib/cn";

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  placeholder?: string;
  children: ReactNode;
}

export interface CommandGroupProps {
  heading?: string;
  children: ReactNode;
  className?: string;
}

export interface CommandItemProps {
  children: ReactNode;
  onSelect?: () => void;
  icon?: ReactNode;
  shortcut?: string;
  className?: string;
}

function CommandPalette({
  open,
  onOpenChange,
  placeholder = "Search...",
  children,
}: CommandPaletteProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <div className="fixed inset-0 flex items-start justify-center pt-[20vh]">
        <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:bg-gray-900 overflow-hidden">
          <div className="flex items-center border-b border-gray-200 px-4 dark:border-gray-700">
            <Search className="h-5 w-5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              placeholder={placeholder}
              className="flex-1 bg-transparent px-3 py-4 text-sm outline-none placeholder:text-gray-400 dark:text-gray-100"
            />
            <kbd className="hidden rounded-md border border-gray-200 px-2 py-0.5 text-xs font-medium text-gray-500 dark:border-gray-700 sm:inline-block">
              ESC
            </kbd>
          </div>
          <div className="max-h-[300px] overflow-y-auto p-2">{children}</div>
        </div>
      </div>
    </div>
  );
}

function CommandGroup({ heading, children, className }: CommandGroupProps) {
  return (
    <div className={cn("py-2", className)}>
      {heading && (
        <p className="mb-1 px-2 text-xs font-medium text-gray-500 dark:text-gray-400">
          {heading}
        </p>
      )}
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function CommandItem({
  children,
  onSelect,
  icon,
  shortcut,
  className,
}: CommandItemProps) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-gray-700 transition-colors hover:bg-orange-50 dark:text-gray-300 dark:hover:bg-orange-950",
        className
      )}
    >
      {icon && <span className="h-4 w-4 text-gray-400">{icon}</span>}
      <span className="flex-1 text-left">{children}</span>
      {shortcut && (
        <kbd className="rounded border border-gray-200 px-1.5 py-0.5 text-xs text-gray-500 dark:border-gray-700">
          {shortcut}
        </kbd>
      )}
    </button>
  );
}

export { CommandPalette, CommandGroup, CommandItem };
