/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        safeway: {
          red: "#c8102e",
          green: "#008000",
        },
      },
    },
  },
  plugins: [],
};
