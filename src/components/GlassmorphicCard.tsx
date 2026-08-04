import { ReactNode } from "react";

interface GlassmorphicCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: "cyan" | "violet";
  onClick?: () => void;
}

export function GlassmorphicCard({
  children,
  className = "",
  glowColor = "cyan",
  onClick,
}: GlassmorphicCardProps) {
  const glowClass =
    glowColor === "cyan"
      ? "shadow-[0_0_30px_rgba(0,217,255,0.15)]"
      : "shadow-[0_0_30px_rgba(217,70,239,0.15)]";

  return (
    <div
      onClick={onClick}
      className={`relative rounded-xl border backdrop-blur-xl bg-slate-900/60 border-slate-700/50 ${glowClass} hover:shadow-[0_0_40px_rgba(0,217,255,0.25)] transition-all duration-300 ${onClick ? "cursor-pointer" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
