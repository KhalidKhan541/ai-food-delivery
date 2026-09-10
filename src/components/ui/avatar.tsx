"use client";

import { useState, forwardRef, type ImgHTMLAttributes } from "react";
import { User } from "lucide-react";
import { cn } from "@/lib/cn";

export interface AvatarProps extends ImgHTMLAttributes<HTMLImageElement> {
  src?: string | null;
  alt?: string;
  fallback?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeMap = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
  xl: "h-20 w-20 text-xl",
};

const Avatar = forwardRef<HTMLImageElement, AvatarProps>(
  ({ className, src, alt = "", fallback, size = "md", ...props }, ref) => {
    const [hasError, setHasError] = useState(false);

    if (!src || hasError) {
      return (
        <div
          className={cn(
            "relative flex items-center justify-center overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700",
            sizeMap[size],
            className
          )}
        >
          {fallback ? (
            <span className="font-medium text-gray-600 dark:text-gray-300">
              {fallback}
            </span>
          ) : (
            <User className="h-1/2 w-1/2 text-gray-400 dark:text-gray-500" />
          )}
        </div>
      );
    }

    return (
      <img
        ref={ref}
        src={src}
        alt={alt}
        onError={() => setHasError(true)}
        className={cn(
          "rounded-full object-cover",
          sizeMap[size],
          className
        )}
        {...props}
      />
    );
  }
);

Avatar.displayName = "Avatar";

export { Avatar };
