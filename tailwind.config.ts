import type { Config } from 'tailwindcss';

/** Dark editorial system — based on the supplied Henry reference. */
const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#000000',
        obsidian: '#000000',
        carbon: '#141414',
        tar: '#0c0c0c',

        // Warm-gray text family
        bone: '#d4d0c9',
        ash: '#878581',
        smoke: '#615f5c',
        graphite: '#a1a1a1',
        chalk: '#ffffff',

        accent: '#d4d0c9',

        // Stat bar tints (used sparingly)
        tintGreen: '#1fe274',
        tintBlue: '#00a8f0',
        tintOrange: '#ff9634',
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          'sans-serif',
        ],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
      },
      fontSize: {
        eyebrow: ['10px', { lineHeight: '1.2', letterSpacing: '0' }],
        caption: ['12px', { lineHeight: '1.4', letterSpacing: '-0.02em' }],
        body: ['16px', { lineHeight: '1.5', letterSpacing: '-0.02em' }],
        subhead: ['17px', { lineHeight: '1.4', letterSpacing: '-0.01em' }],
        title: ['22px', { lineHeight: '1.25', letterSpacing: '-0.015em' }],
        headline: ['28px', { lineHeight: '1.2', letterSpacing: '-0.02em' }],
        display: ['44px', { lineHeight: '1.05', letterSpacing: '-0.03em' }],
        giant: ['72px', { lineHeight: '1.0', letterSpacing: '-0.04em' }],
        hero: ['96px', { lineHeight: '1.0', letterSpacing: '-0.04em' }],
      },
      fontWeight: {
        light: '300',
        regular: '400',
        medium: '500',
        semibold: '600',
      },
      spacing: {
        4: '4px', 8: '8px', 12: '12px', 16: '16px', 20: '20px',
        24: '24px', 32: '32px', 36: '36px', 40: '40px', 48: '48px',
        56: '56px', 60: '60px', 64: '64px', 80: '80px',
        112: '112px', 160: '160px',
      },
      borderRadius: {
        chip: '6px',
        card: '10px',
        surface: '10px',
        panel: '10px',
        pill: '9999px',
        dial: '50%',
      },
      maxWidth: {
        page: '1200px',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(20, 21, 26, 0.05)',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.32, 0.72, 0, 1)',
      },
      animation: {
        'fade-in': 'fade-in 200ms ease-out both',
        'rise-in': 'rise-in 280ms cubic-bezier(0.32, 0.72, 0, 1) both',
        'pulse-soft': 'pulse-soft 2.4s ease-in-out infinite',
        'spin-slow': 'spin 18s linear infinite',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'rise-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '0.7' },
          '50%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
