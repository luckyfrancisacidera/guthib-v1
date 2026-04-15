import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  safelist: [
    // Cosmetic shop: border effects
    "ring-2", "ring-emerald-400", "ring-purple-500", "ring-amber-400", "ring-cyan-400", "ring-pink-500",
    "ring-sky-300", "ring-red-500", "ring-indigo-400", "ring-white",
    "shadow-[0_0_10px_rgba(125,211,252,0.5)]", "shadow-[0_0_12px_rgba(168,85,247,0.5)]",
    "shadow-[0_0_12px_rgba(251,191,36,0.5)]", "shadow-[0_0_14px_rgba(239,68,68,0.6)]",
    "shadow-[0_0_16px_rgba(34,211,238,0.6)]", "shadow-[0_0_18px_rgba(129,140,248,0.6)]",
    "shadow-[0_0_20px_rgba(236,72,153,0.6)]", "shadow-[0_0_20px_rgba(255,255,255,0.4)]",
    "animate-pulse",
    // Cosmetic shop: name effects
    "text-emerald-400", "text-amber-400", "text-cyan-300", "text-purple-400", "text-orange-400",
    "text-blue-400", "text-rose-300", "text-lime-400", "text-foreground", "text-transparent",
    "drop-shadow-[0_0_6px_rgba(103,232,249,0.8)]", "drop-shadow-[0_0_6px_rgba(168,85,247,0.8)]",
    "drop-shadow-[0_0_6px_rgba(253,164,175,0.7)]", "drop-shadow-[0_0_8px_rgba(251,146,60,0.8)]",
    "drop-shadow-[0_0_8px_rgba(96,165,250,0.9)]", "drop-shadow-[0_0_8px_rgba(163,230,53,0.8)]",
    "drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]",
    "bg-clip-text", "bg-gradient-to-r",
    "from-red-400", "via-yellow-400", "to-cyan-400",
    // Cosmetic shop: badge styles
    "bg-white/10", "border-white/30", "backdrop-blur-sm",
    "bg-indigo-950/50", "border-indigo-500/40", "text-indigo-300",
    "from-purple-500/20", "via-pink-500/20", "to-cyan-500/20", "border-purple-400/40",
    "bg-amber-950/50", "border-amber-400/50", "text-amber-300",
    "bg-cyan-950/50", "border-cyan-400/50", "text-cyan-300",
    "from-indigo-500/20", "via-purple-500/20", "to-pink-500/20", "border-indigo-400/40",
    "bg-purple-950/50", "border-yellow-500/40", "text-yellow-300",
    "shadow-[0_0_8px_rgba(34,211,238,0.3)]",
    // Cosmetic shop: profile accents
    "from-blue-500/20", "to-cyan-500/10", "from-orange-500/20", "to-pink-500/10",
    "from-emerald-500/20", "via-cyan-500/10", "to-purple-500/20",
    "from-green-500/20", "via-blue-500/15", "from-pink-500/20", "via-rose-400/15", "to-fuchsia-500/10",
    "from-violet-500/20", "to-indigo-500/10",
    "from-slate-600/30", "via-zinc-500/20", "to-neutral-600/30",
    "from-amber-500/25", "via-orange-400/15", "to-yellow-500/10",
    "from-pink-500/25", "via-purple-500/15", "to-cyan-500/25",
    "from-gray-900/40", "via-slate-800/30", "to-gray-900/40",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        display: ['Mona Sans', 'Inter', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        gh: {
          green: "hsl(var(--gh-green))",
          purple: "hsl(var(--gh-purple))",
          "purple-glow": "hsl(var(--gh-purple-glow))",
          blue: "hsl(var(--gh-blue))",
          orange: "hsl(var(--gh-orange))",
          pink: "hsl(var(--gh-pink))",
          yellow: "hsl(var(--gh-yellow))",
          surface: "hsl(var(--gh-dark-surface))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
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
        scroll: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
