import { cn } from "@/lib/cn";

export interface ProgressProps {
  value: number;
  max?: number;
  size?: "sm" | "md" | "lg";
  color?: "orange" | "green" | "blue" | "red" | "yellow";
  showLabel?: boolean;
  className?: string;
}

const sizeMap = {
  sm: "h-1.5",
  md: "h-2.5",
  lg: "h-4",
};

const colorMap = {
  orange: "bg-orange-500",
  green: "bg-green-500",
  blue: "bg-blue-500",
  red: "bg-red-500",
  yellow: "bg-yellow-500",
};

function Progress({
  value,
  max = 100,
  size = "md",
  color = "orange",
  showLabel = false,
  className,
}: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className={cn("w-full", className)}>
      {showLabel && (
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
            Progress
          </span>
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
            {Math.round(percentage)}%
          </span>
        </div>
      )}
      <div
        className={cn(
          "w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700",
          sizeMap[size]
        )}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            colorMap[color]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export { Progress };
