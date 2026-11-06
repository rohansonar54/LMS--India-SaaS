import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      borderColor: {
        DEFAULT: '#cbd5e1',
        slate: {
          50: '#f1f5f9',
          100: '#e2e8f0', // enhanced from very faint #f1f5f9
          200: '#cbd5e1', // enhanced from faint #e2e8f0 to crisp #cbd5e1
          300: '#94a3b8', // enhanced from #cbd5e1
          400: '#64748b',
        },
        gray: {
          100: '#e5e7eb',
          200: '#cbd5e1',
          300: '#9ca3af',
        },
      },
      divideColor: {
        DEFAULT: '#cbd5e1',
        slate: {
          50: '#f1f5f9',
          100: '#e2e8f0',
          200: '#cbd5e1',
          300: '#94a3b8',
        },
        gray: {
          100: '#e5e7eb',
          200: '#cbd5e1',
          300: '#9ca3af',
        },
      },
    },
  },
  plugins: [],
};

export default config;
