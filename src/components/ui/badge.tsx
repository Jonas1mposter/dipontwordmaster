import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground shadow",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground shadow",
        outline: "text-foreground border-border",
        success: "border-transparent bg-success text-success-foreground shadow",
        gold: "border-transparent bg-gradient-to-r from-amber-500 to-yellow-400 text-background font-gaming shadow-lg shadow-accent/20",
        bronze: "border-transparent bg-rank-bronze text-background font-gaming",
        silver: "border-transparent bg-rank-silver text-background font-gaming",
        platinum: "border-transparent bg-rank-platinum text-background font-gaming",
        diamond: "border-transparent bg-rank-diamond text-background font-gaming",
        champion: "border-transparent bg-gradient-to-r from-primary to-neon-pink text-primary-foreground font-gaming shadow-lg shadow-primary/30",
        xp: "border-primary/30 bg-primary/10 text-primary font-gaming",
        energy: "border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan font-gaming",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
