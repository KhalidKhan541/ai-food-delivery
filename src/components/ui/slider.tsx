"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> {
  label?: string;
  error?: string;
  min?: number;
  max?: number;
  step?: number;
  value?: number;
  onChange?: (value: number) => void;
  showValue?: boolean;
  unit?: string;
}

const Slider = forwardRef<HTMLInputElement, SliderProps>(
  ({ className, label, error, min = 0, max = 100, step = 1, value, onChange, showValue = true, unit = "", ...props }, ref) => {
    const percentage = ((value || min) / max) * 100;

    return (
      <div className="w-full">
        {(label || showValue) && (
          <div className="mb-2 flex items-center justify-between">
            {label && (
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {label}
              </label>
            )}
            {showValue && (
              <span className="text-sm font-medium text-orange-500">
                {value}{unit}
              </span>
            )}
          </div>
        )}
        <div className="relative">
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className="h-full bg-orange-500 transition-all"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <input
            type="range"
            ref={ref}
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange?.(Number(e.target.value))}
            className={cn(
              "absolute inset-0 h-2 w-full cursor-pointer appearance-none bg-transparent opacity-0 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-orange-500 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110",
              className
            )}
            {...props}
          />
          <div
            className="pointer-events-none absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-500 shadow-md"
            style={{ left: `${percentage}%` }}
          />
        </div>
        {error && (
          <p className="mt-1 text-xs text-red-500">{error}</p>
        )}
      </div>
    );
  }
);

Slider.displayName = "Slider";

export { Slider };
