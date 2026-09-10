import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/app/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#E63946",
          50: "#FEF2F2",
          100: "#FDE8E8",
          200: "#FAD1D5",
          300: "#F6A5AD",
          400: "#EF6C76",
          500: "#E63946",
          600: "#C5202E",
          700: "#A51422",
          800: "#89111D",
          900: "#74101C",
          950: "#40050A",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#F4845F",
          50: "#FFF5F0",
          100: "#FFE8DD",
          200: "#FFCFBA",
          300: "#FFAD8C",
          400: "#F4845F",
          500: "#F06838",
          600: "#E04D1A",
          700: "#BC3C13",
          800: "#963317",
          900: "#792D16",
          950: "#411308",
          foreground: "#FFFFFF",
        },
        accent: {
          DEFAULT: "#FFB703",
          50: "#FFFBEB",
          100: "#FFF3C4",
          200: "#FFE588",
          300: "#FFD24C",
          400: "#FFC11E",
          500: "#FFB703",
          600: "#E69500",
          700: "#BF7200",
          800: "#995800",
          900: "#7A4700",
          950: "#462500",
          foreground: "#1A1A1A",
        },
        destructive: {
          DEFAULT: "#DC2626",
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "#F5F5F5",
          foreground: "#737373",
        },
        popover: {
          DEFAULT: "#FFFFFF",
          foreground: "#171717",
        },
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#171717",
        },
        success: {
          DEFAULT: "#16A34A",
          foreground: "#FFFFFF",
        },
        warning: {
          DEFAULT: "#F59E0B",
          foreground: "#FFFFFF",
        },
        info: {
          DEFAULT: "#3B82F6",
          foreground: "#FFFFFF",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-cal)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
        "slide-in-bottom": {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(230, 57, 70, 0.4)" },
          "50%": { boxShadow: "0 0 0 8px rgba(230, 57, 70, 0)" },
        },
        "food-float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        spin: {
          to: { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "slide-in-bottom": "slide-in-bottom 0.3s ease-out",
        "fade-in": "fade-in 0.2s ease-out",
        "pulse-glow": "pulse-glow 2s infinite",
        "food-float": "food-float 3s ease-in-out infinite",
        spin: "spin 1s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
