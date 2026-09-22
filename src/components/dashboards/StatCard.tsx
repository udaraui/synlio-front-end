import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  change: string;
  variant?: "card1" | "card2" | "card3" | "card4";
  icon?: LucideIcon;
  children?: React.ReactNode;
}

export const StatCard = ({
  title,
  value,
  change,
  variant = "card1",
  icon: Icon,
  children,
}: StatCardProps) => {
  const variantStyles = {
    card1: "bg-white dark:bg-accent text-foreground",
    card2: "bg-white/90 dark:bg-accent text-foreground",
    card3: "bg-white/80 dark:bg-accent text-foreground",
    card4: "bg-white/70 dark:bg-accent text-foreground",
  };

  return (
    <Card className={cn("border-0 shadow-sm py-2", variantStyles[variant])}>
      <CardContent className="px-5 py-0">
        <div className="flex items-start justify-between">
          <h3 className="text-sm font-medium">{title}</h3>
          {Icon && <Icon className="h-6 w-4 opacity-70" />}
        </div>
        {variant !== "card1" && variant !== "card2" && (
          <div className="space-y-1 flex items-center pt-1">
            <span className="text-lg font-bold text-foreground mb-0">
              {value}
            </span>
            <span className={`text-xs opacity-70 ms-2 ${variant === 'card3' ? "text-green-600" : "text-red-600"}`}>
              {change}
            </span>
          </div>
        )}
        {children && (
          <div className="pt-1">
            {children}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
