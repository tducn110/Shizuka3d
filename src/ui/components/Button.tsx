import React, { ButtonHTMLAttributes } from "react"
import { audioManager } from "../../audio/audioManager"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "hero" | "icon"
  children: React.ReactNode
}

export default function Button({
  variant = "primary",
  children,
  style,
  onMouseEnter,
  onMouseLeave,
  onClick,
  ...props
}: ButtonProps) {
  const isHero = variant === "hero"
  const isSecondary = variant === "secondary"
  const isIcon = variant === "icon"

  const baseStyle: React.CSSProperties = {
    fontFamily: "'Outfit', sans-serif",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: isHero
      ? "transform 0.15s, box-shadow 0.15s"
      : isIcon
        ? "background 0.15s"
        : "opacity 0.15s",
  }

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      padding: "12px 0",
      borderRadius: 12,
      border: "none",
      background: "#2e2016",
      color: "#fffdf8",
      fontSize: 15,
      fontWeight: 600,
      width: "100%",
    },
    secondary: {
      padding: "12px 0",
      borderRadius: 12,
      border: "1.5px solid rgba(0,0,0,0.12)",
      background: "transparent",
      color: "#6b5744",
      fontSize: 15,
      fontWeight: 600,
      width: "100%",
    },
    hero: {
      padding: "14px 40px",
      borderRadius: 16,
      border: "none",
      background: "#2e2016",
      color: "#faf7f0",
      fontSize: 16,
      fontWeight: 700,
      letterSpacing: "0.01em",
      boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
      pointerEvents: "all",
    },
    icon: {
      width: 38,
      height: 38,
      borderRadius: 10,
      border: "1.5px solid rgba(0,0,0,0.1)",
      background: "rgba(255,255,255,0.7)",
      color: "#6b5744",
    },
  }

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isHero) {
      e.currentTarget.style.transform = "translateY(-2px)"
      e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.22)"
    } else if (isIcon) {
      e.currentTarget.style.background = "rgba(255,255,255,0.95)"
    } else {
      e.currentTarget.style.opacity = "0.82"
    }
    onMouseEnter?.(e)
  }

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isHero) {
      e.currentTarget.style.transform = ""
      e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.18)"
    } else if (isIcon) {
      e.currentTarget.style.background = "rgba(255,255,255,0.7)"
    } else {
      e.currentTarget.style.opacity = "1"
    }
    onMouseLeave?.(e)
  }

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    audioManager.playButtonClick()
    onClick?.(e)
  }

  return (
    <button
      style={{ ...baseStyle, ...variantStyles[variant], ...style }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  )
}
