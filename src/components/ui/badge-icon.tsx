import { cn } from "@/lib/utils";
import {
  Award,
  BookOpen,
  BookOpenCheck,
  Coins,
  Compass,
  Crown,
  Flame,
  Gem,
  GraduationCap,
  HandMetal,
  Library,
  Medal,
  Sprout,
  Star,
  Sword,
  Swords,
  TrendingUp,
  Trophy,
  User,
  Zap,
  type LucideIcon,
} from "lucide-react";

// Map of icon names to lucide components
const iconMap: Record<string, LucideIcon> = {
  Award,
  BookOpen,
  BookOpenCheck,
  Coins,
  Compass,
  Crown,
  Flame,
  Gem,
  GraduationCap,
  HandMetal,
  Library,
  Medal,
  Sprout,
  Star,
  Sword,
  Swords,
  TrendingUp,
  Trophy,
  User,
  Zap,
};

interface BadgeIconProps {
  icon: string;
  className?: string;
  fallbackClassName?: string;
}

/**
 * Unified badge icon component that handles both:
 * - Lucide icon names (e.g., "Sword", "Sprout", "Flame")
 * - Emoji characters (e.g., "🔥", "⭐", "🏆")
 */
export const BadgeIcon = ({ icon, className, fallbackClassName }: BadgeIconProps) => {
  // Check if it's a lucide icon name
  const IconComponent = iconMap[icon];
  if (IconComponent) {
    return <IconComponent className={cn("w-5 h-5", className)} />;
  }

  // Check if it's an emoji (common emoji Unicode ranges)
  const isEmoji = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2300}-\u{23FF}]|[\u{2B50}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]/u.test(icon);
  
  if (isEmoji) {
    return <span className={cn("text-lg leading-none", className)}>{icon}</span>;
  }

  // Fallback: show first character
  return (
    <span className={cn("text-xs font-medium", fallbackClassName || className)}>
      {icon.charAt(0).toUpperCase()}
    </span>
  );
};

/**
 * Get the icon component for a given icon name
 * Returns the LucideIcon component or null if not found
 */
export const getIconComponent = (iconName: string): LucideIcon | null => {
  return iconMap[iconName] || null;
};

/**
 * Check if an icon name exists in the icon map
 */
export const hasIcon = (iconName: string): boolean => {
  return iconName in iconMap;
};

export default BadgeIcon;
