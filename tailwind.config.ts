import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#F7F8FC",
        foreground: "#111827",
        border: "#E5E7EB",
        input: "#FFFFFF",
        ring: "#5B5FEF",
        card: "#FFFFFF",
        primary: {
          DEFAULT: "#5B5FEF",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#22C55E",
          foreground: "#FFFFFF",
        },
        accent: {
          DEFAULT: "#F59E0B",
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "#F3F4F6",
          foreground: "#6B7280",
        },
        destructive: {
          DEFAULT: "#b42318",
          foreground: "#fff",
        },
        success: {
          DEFAULT: "#0f9d58",
          foreground: "#f0fdf4",
        },
      },
      fontFamily: {
        sans: ["Manrope", "ui-sans-serif", "system-ui"],
      },
      boxShadow: {
        panel: "0 14px 40px rgba(15, 23, 42, 0.08)",
        soft: "0 6px 20px rgba(15, 23, 42, 0.06)",
      },
      backgroundImage: {
        "page-glow":
          "radial-gradient(circle at top left, rgba(91,95,239,0.14), transparent 28%), radial-gradient(circle at top right, rgba(34,197,94,0.1), transparent 24%)",
      },
    },
  },
  plugins: [],
} satisfies Config;
