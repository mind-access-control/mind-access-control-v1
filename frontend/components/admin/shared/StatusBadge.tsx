import { Badge, BadgeProps } from "@/components/ui/badge";
import { AlertCircle, Check, X, Clock } from "lucide-react";

type StatusVariant = "success" | "error" | "warning" | "info" | "default";
type StatusIcon = "check" | "error" | "pending" | "clock" | "none";

interface StatusBadgeProps extends BadgeProps {
  status?: StatusVariant;
  icon?: StatusIcon;
}

const iconMap = {
  check: <Check className="w-3 h-3 mr-1" />,
  error: <X className="w-3 h-3 mr-1" />,
  pending: <AlertCircle className="w-3 h-3 mr-1" />,
  clock: <Clock className="w-3 h-3 mr-1" />,
  none: null
};

const variantMap: Record<StatusVariant, string> = {
  success: "bg-green-100 text-green-800 hover:bg-green-100",
  error: "bg-red-100 text-red-800 hover:bg-red-100",
  warning: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
  info: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  default: ""
};

export function StatusBadge({
  status = "default",
  icon = "none",
  children,
  className = "",
  ...props
}: StatusBadgeProps) {
  return (
    <Badge
      className={`flex items-center ${variantMap[status]} ${className}`}
      variant={status === "default" ? "default" : "secondary"}
      {...props}
    >
      {icon !== "none" && iconMap[icon]}
      {children}
    </Badge>
  );
}
