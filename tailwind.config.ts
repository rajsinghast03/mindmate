import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: {
          50: "#FCFAF7",
          100: "#FAF8F5",
          200: "#F4EFEA",
          300: "#EAE3DC",
          400: "#DFD5CA",
          500: "#C6B9AA",
        },
        ink: {
          950: "#141413",
          900: "#1E1E1C",
          800: "#2C2B28",
          700: "#44423E",
          600: "#63605A",
          500: "#7F7B74",
          400: "#A39E96",
          300: "#C8C4BD",
        },
        accent: {
          50: "#FEF7F5",
          100: "#FBEEEB",
          200: "#F7D8D2",
          300: "#F0B5AB",
          400: "#E8897A",
          500: "#E05A47",
          600: "#D4513E",
          700: "#B33E2E",
          800: "#8C3225",
        },
        sage: {
          50: "#F6F8F6",
          100: "#EEF4F0",
          200: "#D7E4DC",
          500: "#5C7A68",
          600: "#4C6656",
          700: "#3D5245",
        }
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Newsreader", "Playfair Display", "Georgia", "serif"],
        sans: ["var(--font-sans)", "Inter", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(20, 20, 19, 0.05)',
        'card': '0 8px 30px -4px rgba(20, 20, 19, 0.07)',
        'lifted': '0 16px 40px -8px rgba(20, 20, 19, 0.1)',
      },
      // Hand-rolled rather than pulling in tailwindcss-animate for three
      // keyframes. Note the `animate-in fade-in ...` classes elsewhere in the
      // app are that plugin's API and are currently no-ops.
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'rise-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'drop-in': {
          from: { opacity: '0', transform: 'translateY(-6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'typing-dot': {
          '0%, 60%, 100%': { opacity: '0.25', transform: 'translateY(0)' },
          '30%': { opacity: '1', transform: 'translateY(-2px)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        'rise-in': 'rise-in 180ms ease-out',
        'drop-in': 'drop-in 150ms ease-out',
        'typing-dot': 'typing-dot 1.2s ease-in-out infinite',
      }
    },
  },
  plugins: [
    require("@tailwindcss/typography"),
  ],
};

export default config;
