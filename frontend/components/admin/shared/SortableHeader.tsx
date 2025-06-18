import { ChevronUp, ChevronDown } from "lucide-react";

interface SortableHeaderProps {
  children: React.ReactNode;
  active?: boolean;
  sortDirection?: "asc" | "desc";
  onClick?: () => void;
  className?: string;
}

export function SortableHeader({
  children,
  active = false,
  sortDirection,
  onClick,
  className = ""
}: SortableHeaderProps) {
  return (
    <div
      className={`flex items-center cursor-pointer select-none hover:bg-gray-50 ${className}`}
      onClick={onClick}
    >
      {children}
      {active && sortDirection && (
        <span className="ml-1">
          {sortDirection === "asc" ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </span>
      )}
    </div>
  );
}
