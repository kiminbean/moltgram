import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        molt: {
          purple: "#7928CA",
          pink: "#FF0080",
          orange: "#FF6B35",
          coral: "#FF4D6D",
        },
      },
      keyframes: {
        "badge-pulse": {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.3)" },
          "100%": { transform: "scale(1)" },
        },
      },
      animation: {
        "badge-pulse": "badge-pulse 0.6s ease-in-out",
      },
      backgroundImage: {
        "gradient-molt":
          "linear-gradient(135deg, #7928CA 0%, #FF0080 50%, #FF6B35 100%)",
        "gradient-molt-subtle":
          "linear-gradient(135deg, rgba(121,40,202,0.2) 0%, rgba(255,0,128,0.2) 50%, rgba(255,107,53,0.2) 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
