/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "var(--ink)", panel: "var(--panel)", panel2: "var(--panel2)", line: "var(--line)",
        fg: "var(--fg)", muted: "var(--muted)", neon: "var(--neon)", warn: "var(--warn)", bad: "var(--bad)",
      },
      fontFamily: { sans: ["Heebo", "system-ui", "sans-serif"], osd: ["Heebo", "system-ui", "sans-serif"], mono: ['"JetBrains Mono"', "ui-monospace", "monospace"] },
    },
  },
  plugins: [],
};
