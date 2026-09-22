"use client";

import React from "react";

export function LogoIcon({ className, style, color }: { className?: string; style?: React.CSSProperties; color?: string }) {
  return (
    <span
      aria-label="Synalytics"
      role="img"
      className={className}
      style={{
        display: "inline-block",
        width: 16,
        height: 16,
        flexShrink: 0,
        color: color,
        backgroundColor: "currentColor",
        WebkitMaskImage: "url('/logo.png')",
        maskImage: "url('/logo.png')",
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        opacity: 0.85,
        ...style,
      }}
    />
  );
}
