import type { Config } from "tailwindcss";
import colors from "tailwindcss/colors";
import formsPlugin from "@tailwindcss/forms";

const config: Config = {
  darkMode: ["selector", '[data-theme="dark"]'],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@tremor/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    transparent: "transparent",
    current: "currentColor",
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        muted: "var(--muted)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        border: "var(--border)",
        "border-strong": "var(--border-strong)",
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
          muted: "var(--accent-muted)",
          foreground: "var(--accent-foreground)",
        },
        danger: "var(--danger)",
        // Tremor palette remapped to InsightPilot teal (not default blue/purple)
        tremor: {
          brand: {
            faint: colors.teal[50],
            muted: colors.teal[200],
            subtle: colors.teal[400],
            DEFAULT: colors.teal[700],
            emphasis: colors.teal[800],
            inverted: colors.white,
          },
          background: {
            muted: "#f3f1ec",
            subtle: "#ebe8e1",
            DEFAULT: "#faf9f6",
            emphasis: colors.stone[700],
          },
          border: {
            DEFAULT: "#ddd8ce",
          },
          ring: {
            DEFAULT: "#ddd8ce",
          },
          content: {
            subtle: colors.stone[400],
            DEFAULT: colors.stone[500],
            emphasis: colors.stone[700],
            strong: "#1a1916",
            inverted: colors.white,
          },
        },
        "dark-tremor": {
          brand: {
            faint: "#143532",
            muted: colors.teal[950],
            subtle: colors.teal[700],
            DEFAULT: colors.teal[400],
            emphasis: colors.teal[300],
            inverted: "#0a1613",
          },
          background: {
            muted: "#121110",
            subtle: "#242320",
            DEFAULT: "#1b1a18",
            emphasis: colors.stone[300],
          },
          border: {
            DEFAULT: "#2f2d29",
          },
          ring: {
            DEFAULT: "#2f2d29",
          },
          content: {
            subtle: colors.stone[600],
            DEFAULT: colors.stone[500],
            emphasis: colors.stone[200],
            strong: "#eceae4",
            inverted: colors.stone[950],
          },
        },
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        "tremor-input": "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        "tremor-card":
          "0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.08)",
        "tremor-dropdown":
          "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
        "dark-tremor-input": "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        "dark-tremor-card":
          "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
        "dark-tremor-dropdown":
          "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        "tremor-small": "0.375rem",
        "tremor-default": "0.5rem",
        "tremor-full": "9999px",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      maxWidth: {
        chat: "48rem",
        shell: "72rem",
      },
      fontSize: {
        display: [
          "clamp(2.25rem, 4vw, 3.25rem)",
          { lineHeight: "1.1", letterSpacing: "-0.03em" },
        ],
        title: ["1.25rem", { lineHeight: "1.3", letterSpacing: "-0.02em" }],
        "chat-body": ["1.0625rem", { lineHeight: "1.65" }],
        caption: ["0.8125rem", { lineHeight: "1.4" }],
        "tremor-label": ["0.75rem", { lineHeight: "1rem" }],
        "tremor-default": ["0.875rem", { lineHeight: "1.25rem" }],
        "tremor-title": ["1.125rem", { lineHeight: "1.75rem" }],
        "tremor-metric": ["1.875rem", { lineHeight: "2.25rem" }],
      },
      spacing: {
        18: "4.5rem",
      },
    },
  },
  safelist: [
    {
      pattern:
        /^(bg-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
      variants: ["hover", "data-[selected]"],
    },
    {
      pattern:
        /^(text-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
      variants: ["hover", "data-[selected]"],
    },
    {
      pattern:
        /^(border-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
      variants: ["hover", "data-[selected]"],
    },
    {
      pattern:
        /^(ring-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
    },
    {
      pattern:
        /^(stroke-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
    },
    {
      pattern:
        /^(fill-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
    },
  ],
  plugins: [formsPlugin],
};

export default config;
