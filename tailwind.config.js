/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Primary brand — deep teal/cyan saintifik
        primary: {
          50: "#e6fafa",
          100: "#b3f0f0",
          200: "#80e6e6",
          300: "#4ddcdc",
          400: "#1ad2d2",
          500: "#00bfbf",
          600: "#009999",
          700: "#007373",
          800: "#004d4d",
          900: "#002626",
        },
        // Accent — electric blue untuk highlight
        accent: {
          50: "#e8f0ff",
          100: "#c5d8ff",
          200: "#93b4ff",
          300: "#6090ff",
          400: "#2d6cff",
          500: "#0047ff",
          600: "#0038cc",
          700: "#002999",
          800: "#001a66",
          900: "#000b33",
        },
        // Surface — untuk card dan background
        surface: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          850: "#131d2e",
          900: "#0f172a",
          950: "#080d18",
        },
        // Status colors
        success: {
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
        },
        warning: {
          400: "#facc15",
          500: "#eab308",
          600: "#ca8a04",
        },
        danger: {
          400: "#f87171",
          500: "#ef4444",
          600: "#dc2626",
        },
        info: {
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
        },
      },

      ringColor: (theme) => ({
        primary: theme("colors.primary"),
        accent: theme("colors.accent"),
      }),
      fontFamily: {
        sans: ["'DM Sans'", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["'Syne'", "ui-sans-serif", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },

      fontSize: {
        "2xs": ["0.65rem", { lineHeight: "1rem" }],
        xs: ["0.75rem", { lineHeight: "1.125rem" }],
        sm: ["0.875rem", { lineHeight: "1.375rem" }],
        base: ["1rem", { lineHeight: "1.6rem" }],
        lg: ["1.125rem", { lineHeight: "1.75rem" }],
        xl: ["1.25rem", { lineHeight: "1.875rem" }],
        "2xl": ["1.5rem", { lineHeight: "2rem" }],
        "3xl": ["1.875rem", { lineHeight: "2.375rem" }],
        "4xl": ["2.25rem", { lineHeight: "2.75rem" }],
        "5xl": ["3rem", { lineHeight: "3.5rem" }],
      },

      borderRadius: {
        DEFAULT: "0.5rem",
        sm: "0.375rem",
        md: "0.625rem",
        lg: "0.875rem",
        xl: "1.125rem",
        "2xl": "1.5rem",
        "3xl": "2rem",
      },

      spacing: {
        18: "4.5rem",
        22: "5.5rem",
        72: "18rem",
        80: "20rem",
        88: "22rem",
        96: "24rem",
      },

      // Sidebar widths
      width: {
        sidebar: "260px",
        "sidebar-collapsed": "68px",
      },

      // Glass effect shadows
      boxShadow: {
        glass:
          "0 8px 32px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255,255,255,0.08)",
        "glass-md":
          "0 16px 48px rgba(0, 0, 0, 0.18), inset 0 1px 0 rgba(255,255,255,0.10)",
        "glass-lg":
          "0 24px 64px rgba(0, 0, 0, 0.24), inset 0 1px 0 rgba(255,255,255,0.12)",
        "glow-primary": "0 0 24px rgba(0, 191, 191, 0.25)",
        "glow-accent": "0 0 24px rgba(45, 108, 255, 0.30)",
        card: "0 2px 8px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        "card-md": "0 4px 16px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)",
        "card-hover": "0 8px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06)",
      },

      backgroundImage: {
        // Gradient mesh background utama
        "mesh-dark":
          "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(0,191,191,0.12) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 90% 50%, rgba(45,108,255,0.10) 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 10% 80%, rgba(0,153,153,0.08) 0%, transparent 60%)",
        "mesh-light":
          "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(0,191,191,0.08) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 90% 50%, rgba(45,108,255,0.06) 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 10% 80%, rgba(0,153,153,0.05) 0%, transparent 60%)",
        // Shimmer gradient untuk skeleton loading
        shimmer:
          "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)",
        // Gradient teks
        "gradient-primary": "linear-gradient(135deg, #00bfbf 0%, #2d6cff 100%)",
        "gradient-warm": "linear-gradient(135deg, #00bfbf 0%, #4ddcdc 100%)",
      },

      backdropBlur: {
        xs: "2px",
        sm: "6px",
        md: "12px",
        lg: "20px",
        xl: "32px",
      },

      transitionDuration: {
        250: "250ms",
        350: "350ms",
        400: "400ms",
      },

      transitionTimingFunction: {
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
      },

      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-scale": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "slide-in-right": {
          "0%": { transform: "translateX(100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        "slide-in-left": {
          "0%": { transform: "translateX(-100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        "slide-up": {
          "0%": { transform: "translateY(16px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 12px rgba(0,191,191,0.2)" },
          "50%": { boxShadow: "0 0 28px rgba(0,191,191,0.4)" },
        },
        spin: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },

      animation: {
        "fade-in": "fade-in 0.35s ease-out both",
        "fade-in-scale": "fade-in-scale 0.3s ease-out both",
        "slide-in-right": "slide-in-right 0.35s cubic-bezier(0.4,0,0.2,1) both",
        "slide-in-left": "slide-in-left 0.35s cubic-bezier(0.4,0,0.2,1) both",
        "slide-up": "slide-up 0.35s ease-out both",
        shimmer: "shimmer 1.8s infinite linear",
        "pulse-glow": "pulse-glow 2.5s ease-in-out infinite",
        spin: "spin 0.8s linear infinite",
      },

      screens: {
        xs: "400px",
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1536px",
      },

      zIndex: {
        sidebar: "40",
        navbar: "50",
        overlay: "60",
        modal: "70",
        toast: "80",
        tooltip: "90",
      },
    },
  },
  plugins: [],
};
