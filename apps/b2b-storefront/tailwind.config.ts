import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui-storefront/src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          main: "var(--brand-main)",
          hover: "var(--brand-hover)",
          border: "var(--brand-border)",
          light: "var(--brand-light)",
          dark: "var(--brand-dark)",
        }
      }
    },
  },
  plugins: [],
};
export default config;
