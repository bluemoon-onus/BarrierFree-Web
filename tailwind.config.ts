import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        access: {
          bg: "#000000",
          text: "#FFFFFF",
          accent: "#FFD700",
          zone: "#1a1a2e",
          highlight: "#00FF88",
        },
      },
    },
  },
  plugins: [],
};
export default config;
