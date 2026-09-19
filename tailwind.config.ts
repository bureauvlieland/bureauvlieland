import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
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
        'display': ['"Fraunces"', 'Georgia', 'serif'],
        'sans': ['"Inter"', 'system-ui', 'sans-serif'],
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
          soft: "hsl(var(--destructive-soft))",
          ink: "hsl(var(--destructive-ink))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
          soft: "hsl(var(--info-soft))",
          ink: "hsl(var(--info-ink))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
          soft: "hsl(var(--success-soft))",
          ink: "hsl(var(--success-ink))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
          soft: "hsl(var(--warning-soft))",
          ink: "hsl(var(--warning-ink))",
        },
        invoice: {
          DEFAULT: "hsl(var(--invoice))",
          foreground: "hsl(var(--invoice-foreground))",
          soft: "hsl(var(--invoice-soft))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
          soft: "hsl(var(--accent-soft))",
        },
        sand: {
          DEFAULT: "hsl(var(--sand))",
          foreground: "hsl(var(--sand-foreground))",
        },
        sunset: {
          DEFAULT: "hsl(var(--sunset))",
          foreground: "hsl(var(--sunset-foreground))",
        },
        // De enige knopkleur voor de primaire actie; per oppervlak ingesteld in index.css.
        action: {
          DEFAULT: "hsl(var(--action))",
          foreground: "hsl(var(--action-foreground))",
          hover: "hsl(var(--action-hover))",
        },
        "ocean-deep": "hsl(var(--ocean-deep))",
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
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
      backgroundImage: {
        "gradient-hero": "var(--gradient-hero)",
        "gradient-ocean": "var(--gradient-ocean)",
        "gradient-sunset": "var(--gradient-sunset)",
        "gradient-sand": "var(--gradient-sand)",
      },
      // Drie schaduwen; de Tailwind-namen wijzen naar dezelfde drie, zodat
      // bestaande shadow-lg/xl/2xl niet uit de toon vallen.
      boxShadow: {
        soft: "var(--shadow-soft)",
        medium: "var(--shadow-medium)",
        dramatic: "var(--shadow-dramatic)",
        glow: "var(--shadow-glow)",
        sm: "var(--shadow-soft)",
        DEFAULT: "var(--shadow-soft)",
        md: "var(--shadow-soft)",
        lg: "var(--shadow-medium)",
        xl: "var(--shadow-medium)",
        "2xl": "var(--shadow-dramatic)",
      },
      transitionTimingFunction: {
        smooth: "var(--transition-smooth)",
        standard: "var(--ease-standard)",
      },
      transitionDuration: {
        fast: "var(--duration-fast)",
        base: "var(--duration-base)",
        slow: "var(--duration-slow)",
      },
      // Typeschaal van het ontwerpsysteem: display-xl (hero), display-lg
      // (sectiekop), display-md (kaarttitel), eyebrow (kleine kop erboven).
      fontSize: {
        "display-xl": ["clamp(2.75rem, 6vw, 5.5rem)", { lineHeight: "0.95", letterSpacing: "-0.01em" }],
        "display-lg": ["clamp(2rem, 4vw, 3.25rem)", { lineHeight: "1.05", letterSpacing: "-0.01em" }],
        "display-md": ["clamp(1.5rem, 2.5vw, 1.75rem)", { lineHeight: "1.15" }],
        eyebrow: ["0.75rem", { lineHeight: "1rem", letterSpacing: "0.2em" }],
      },
      // Eén radiusschaal (ontwerpsysteem fase 1): sm 4px voor knoppen, velden en
      // chips, lg 8px voor kaarten en overlays. Alles boven lg is dezelfde 8px,
      // zodat bestaande rounded-xl/2xl meteen meelopen; opruimen gebeurt per fase.
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "var(--radius)",
        "2xl": "var(--radius)",
        "3xl": "var(--radius)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "cart-pulse": {
          "0%, 100%": {
            transform: "scale(1)",
          },
          "50%": {
            transform: "scale(1.08)",
          },
        },
        "badge-pop": {
          "0%": {
            transform: "scale(1)",
          },
          "50%": {
            transform: "scale(1.3)",
          },
          "100%": {
            transform: "scale(1)",
          },
        },
        "tab-highlight": {
          "0%, 100%": {
            backgroundColor: "hsl(var(--primary) / 0.1)",
          },
          "50%": {
            backgroundColor: "hsl(var(--primary) / 0.25)",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "cart-pulse": "cart-pulse 0.4s ease-in-out",
        "badge-pop": "badge-pop 0.3s ease-out",
        "tab-highlight": "tab-highlight 0.6s ease-in-out",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    // `coarse:` voor aanraakschermen (pointer: coarse): grotere aanraakdoelen
    // zonder de muisdichtheid op desktop te verliezen (ontwerpsysteem fase 2).
    plugin(({ addVariant }) => {
      addVariant("coarse", "@media (pointer: coarse)");
    }),
  ],
} satisfies Config;
