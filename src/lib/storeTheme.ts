// Store theme utilities for storefront
import React from "react";

// Helper to convert HEX color to HSL values
export function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

// Generate CSS variables and font from store's colors and font
export function getStoreThemeStyles(
  primaryColor: string | null, 
  secondaryColor: string | null,
  fontFamily: string | null
): React.CSSProperties {
  const styles: React.CSSProperties = {};
  
  // Apply font family
  if (fontFamily) {
    styles.fontFamily = `'${fontFamily}', system-ui, sans-serif`;
  }
  
  // Apply primary color
  if (primaryColor) {
    const primaryHsl = hexToHsl(primaryColor);
    if (primaryHsl) {
      const { h, s, l } = primaryHsl;
      const foregroundL = l > 50 ? 10 : 98;
      
      Object.assign(styles, {
        '--primary': `${h} ${s}% ${l}%`,
        '--primary-foreground': `0 0% ${foregroundL}%`,
        '--ring': `${h} ${s}% ${l}%`,
      });
    }
  }
  
  // Apply secondary color
  if (secondaryColor) {
    const secondaryHsl = hexToHsl(secondaryColor);
    if (secondaryHsl) {
      const { h, s, l } = secondaryHsl;
      const foregroundL = l > 50 ? 10 : 98;
      
      Object.assign(styles, {
        '--secondary': `${h} ${s}% ${l}%`,
        '--secondary-foreground': `0 0% ${foregroundL}%`,
        '--accent': `${h} ${s}% ${l}%`,
        '--accent-foreground': `0 0% ${foregroundL}%`,
      });
    }
  }
  
  return styles;
}

// Check if morph animation is enabled (stored in localStorage per store)
export function getMorphAnimationEnabled(storeId: string): boolean {
  try {
    const stored = localStorage.getItem(`morph_animation_${storeId}`);
    return stored !== "false"; // Default to true
  } catch {
    return true;
  }
}
