"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface RadioGroupProps {
  name: string;
  options: { value: string; label: string; description?: string }[];
  value?: string;
  onChange?: (value: string) => void;
  label?: string;
  error?: string;
  className?: string;
}

function RadioGroup({
  name,
  options,
  value,
  onChange,
  label,
  error,
  className,
}: RadioGroupProps) {
  return (
    <div className={cn("w-full", className)}>
      {label && (
        <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </p>
      )}
      <div className="space-y-2">
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all",
              value === option.value
                ? "border-orange-500 bg-orange-50 dark:bg-orange-950"
                : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange?.(option.value)}
              className="sr-only"
            />
            <div
              className={cn(
                "flex h-4 w-4 items-center justify-center rounded-full border-2 transition-all",
                value === option.value
                  ? "border-orange-500"
                  : "border-gray-300 dark:border-gray-600"
              )}
            >
              {value === option.value && (
                <div className="h-2 w-2 rounded-full bg-orange-500" />
              )}
            </div>
            <div>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {option.label}
              </span>
              {option.description && (
                <span className="block text-xs text-gray-500 dark:text-gray-400">
                  {option.description}
                </span>
              )}
            </div>
          </label>
        ))}
      </div>
      {error && (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}

export { RadioGroup };
