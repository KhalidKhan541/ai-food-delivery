"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  error?: string;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, error, id, checked, ...props }, ref) => {
    const checkboxId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex items-start gap-2">
        <div className="relative flex items-center">
          <input
            type="checkbox"
            id={checkboxId}
            className="peer sr-only"
            ref={ref}
            checked={checked}
            {...props}
          />
          <label
            htmlFor={checkboxId}
            className={cn(
              "flex h-5 w-5 cursor-pointer items-center justify-center rounded-md border border-gray-300 transition-all peer-checked:border-orange-500 peer-checked:bg-orange-500 peer-focus-visible:ring-2 peer-focus-visible:ring-orange-500 peer-focus-visible:ring-offset-2 dark:border-gray-600",
              error && "border-red-500",
              className
            )}
          >
            <Check className="h-3 w-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
          </label>
        </div>
        {label && (
          <label
            htmlFor={checkboxId}
            className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {label}
          </label>
        )}
        {error && (
          <p className="mt-0.5 text-xs text-red-500">{error}</p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";

export { Checkbox };
