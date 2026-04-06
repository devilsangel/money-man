import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "media",
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          '"SF Pro Display"',
          '"SF Pro Text"',
          '"Helvetica Neue"',
          "Arial",
          "sans-serif",
        ],
      },
      colors: {
        // Apple HIG semantic colors
        "system-blue": "#007AFF",
        "system-green": "#34C759",
        "system-orange": "#FF9500",
        "system-red": "#FF3B30",
        "system-purple": "#AF52DE",
        "system-indigo": "#5856D6",
        "system-teal": "#5AC8FA",
        "system-pink": "#FF2D55",
        "system-yellow": "#FFCC00",

        // Background layers
        "sys-bg": "var(--sys-bg)",
        "sys-bg-secondary": "var(--sys-bg-secondary)",
        "sys-bg-tertiary": "var(--sys-bg-tertiary)",

        // Labels
        "sys-label": "var(--sys-label)",
        "sys-label-secondary": "var(--sys-label-secondary)",
        "sys-label-tertiary": "var(--sys-label-tertiary)",

        // Separator
        "sys-separator": "var(--sys-separator)",
        "sys-fill": "var(--sys-fill)",
      },
      borderRadius: {
        card: "10px",
        btn: "8px",
        input: "6px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)",
        "card-dark": "0 1px 3px rgba(0,0,0,0.3), 0 4px 12px rgba(0,0,0,0.2)",
        modal: "0 20px 60px rgba(0,0,0,0.15)",
      },
      fontSize: {
        "large-title": ["34px", { lineHeight: "41px", fontWeight: "700" }],
        "title-1": ["28px", { lineHeight: "34px", fontWeight: "700" }],
        "title-2": ["22px", { lineHeight: "28px", fontWeight: "700" }],
        "title-3": ["20px", { lineHeight: "25px", fontWeight: "600" }],
        headline: ["17px", { lineHeight: "22px", fontWeight: "600" }],
        body: ["17px", { lineHeight: "22px", fontWeight: "400" }],
        callout: ["16px", { lineHeight: "21px", fontWeight: "400" }],
        subheadline: ["15px", { lineHeight: "20px", fontWeight: "400" }],
        footnote: ["13px", { lineHeight: "18px", fontWeight: "400" }],
        caption: ["12px", { lineHeight: "16px", fontWeight: "400" }],
      },
    },
  },
  plugins: [],
} satisfies Config;
