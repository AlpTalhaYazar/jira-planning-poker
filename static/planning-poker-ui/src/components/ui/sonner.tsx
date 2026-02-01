"use client";

import type { CSSProperties } from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ theme = "light", ...props }: ToasterProps) => (
  <Sonner
    theme={theme as ToasterProps["theme"]}
    className="toaster group"
    style={
      {
        "--normal-bg": "var(--popover)",
        "--normal-text": "var(--popover-foreground)",
        "--normal-border": "var(--border)",
      } as CSSProperties
    }
    {...props}
  />
);

export { Toaster };
