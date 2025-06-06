import frequencyConfig from "@frequency-chain/style-guide/tailwind.config";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./theme/**/*.{html,hbs}"],
  theme: {
    // ... custom theme config, if any
  },
  presets: [frequencyConfig],
};
