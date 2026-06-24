/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1.5rem",
        lg: "2rem",
        xl: "3rem",
      },
    },
    extend: {
      colors: {
        // 学术编辑风调色板
        ink: {
          50: "#f7f5f1",
          100: "#ede8df",
          200: "#d8cfbf",
          300: "#b8a98e",
          400: "#8a7a5e",
          500: "#5c4f3a",
          600: "#3d3326",
          700: "#2a2218",
          800: "#1f1812",
          900: "#1a1612",
          950: "#0f0c08",
        },
        parchment: {
          50: "#fdfbf6",
          100: "#f9f4ea",
          200: "#f5f0e8",
          300: "#ede4d2",
          400: "#ddcfb0",
          500: "#c8b88f",
          600: "#a89868",
        },
        amber: {
          // 烧琥珀金
          DEFAULT: "#c8862c",
          light: "#e0a449",
          dark: "#9c6516",
          glow: "#f0c062",
        },
        wine: {
          // 深酒红
          DEFAULT: "#8b2635",
          light: "#a83a4a",
          dark: "#6b1a26",
        },
        moss: {
          // 苔藓绿（正确反馈）
          DEFAULT: "#5a7a4a",
          light: "#7a9a6a",
          dark: "#3a5a2a",
        },
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', '"Noto Serif SC"', "serif"],
        serif: ['"Noto Serif SC"', '"Cormorant Garamond"', "serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      fontSize: {
        "display-xl": ["clamp(3rem, 8vw, 6.5rem)", { lineHeight: "0.95", letterSpacing: "-0.02em" }],
        "display-lg": ["clamp(2.25rem, 5vw, 4rem)", { lineHeight: "1", letterSpacing: "-0.015em" }],
        "display-md": ["clamp(1.75rem, 3.5vw, 2.75rem)", { lineHeight: "1.1", letterSpacing: "-0.01em" }],
      },
      animation: {
        "fade-in": "fadeIn 0.8s ease-out forwards",
        "fade-up": "fadeUp 0.8s ease-out forwards",
        "slide-up": "slideUp 0.5s ease-out forwards",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        "shimmer": "shimmer 3s linear infinite",
        "grain": "grain 8s steps(10) infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(100%)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(200, 134, 44, 0.4)" },
          "50%": { boxShadow: "0 0 0 12px rgba(200, 134, 44, 0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        grain: {
          "0%, 100%": { transform: "translate(0, 0)" },
          "10%": { transform: "translate(-5%, -10%)" },
          "20%": { transform: "translate(-15%, 5%)" },
          "30%": { transform: "translate(7%, -25%)" },
          "40%": { transform: "translate(-5%, 25%)" },
          "50%": { transform: "translate(-15%, 10%)" },
          "60%": { transform: "translate(15%, 0%)" },
          "70%": { transform: "translate(0%, 15%)" },
          "80%": { transform: "translate(3%, 35%)" },
          "90%": { transform: "translate(-10%, 10%)" },
        },
      },
      backgroundImage: {
        "paper-grain":
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.1 0 0 0 0 0.08 0 0 0 0 0.05 0 0 0 0.08 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        "gold-line":
          "linear-gradient(90deg, transparent 0%, rgba(200,134,44,0.4) 50%, transparent 100%)",
      },
      boxShadow: {
        editorial: "0 1px 3px rgba(26,22,18,0.08), 0 8px 24px rgba(26,22,18,0.06)",
        "editorial-lg": "0 4px 12px rgba(26,22,18,0.1), 0 24px 48px rgba(26,22,18,0.12)",
        "gold-glow": "0 0 0 1px rgba(200,134,44,0.3), 0 8px 32px rgba(200,134,44,0.15)",
      },
    },
  },
  plugins: [],
};
