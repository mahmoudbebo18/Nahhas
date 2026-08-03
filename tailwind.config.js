/** @type {import('tailwindcss').Config} */

// Every colour resolves through a CSS custom property holding an "R G B"
// triplet (see src/index.css). That indirection is what lets a single `dark`
// class on <html> re-theme the whole app, while `<alpha-value>` keeps
// Tailwind's opacity modifiers (bg-primary/10, text-text/60, …) working.
const token = (name) => `rgb(var(--c-${name}) / <alpha-value>)`

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: token('bg'),
        surface: token('surface'),
        'surface-2': token('surface-2'),
        text: token('text'),
        muted: token('text-muted'),
        subtle: token('text-subtle'),
        border: token('border'),
        'border-strong': token('border-strong'),

        primary: {
          DEFAULT: token('primary'),
          hover: token('primary-hover'),
          fg: token('primary-fg'),
          soft: token('primary-soft'),
        },
        header: {
          DEFAULT: token('header'),
          fg: token('header-fg'),
        },
        accent: {
          DEFAULT: token('accent'),
          hover: token('accent-hover'),
          fg: token('accent-fg'),
          soft: token('accent-soft'),
        },

        success: token('success'),
        danger: token('danger'),
        warning: token('warning'),
      },
      fontFamily: {
        // Inter first so Latin text always renders in Inter; Arabic code
        // points aren't in Inter, so they fall through to Avenir Arabic
        // (which is additionally unicode-range-scoped in index.css).
        sans: [
          'Inter',
          'Avenir Arabic',
          'ui-sans-serif',
          'system-ui',
          'Segoe UI',
          'Tahoma',
          'sans-serif',
        ],
        arabic: ['Avenir Arabic', 'Inter', 'Tahoma', 'sans-serif'],
        numeric: ['Inter', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.125rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        card: '0 1px 2px rgb(0 0 0 / 0.04), 0 1px 3px rgb(0 0 0 / 0.06)',
        raised: '0 4px 12px rgb(0 0 0 / 0.08), 0 1px 3px rgb(0 0 0 / 0.06)',
        sheet: '0 -8px 32px rgb(0 0 0 / 0.18)',
        // A sheet is anchored to the bottom edge, so its shadow only ever
        // spills upward. A centred dialog needs one that falls all round.
        modal: '0 24px 64px -16px rgb(0 0 0 / 0.35), 0 4px 12px rgb(0 0 0 / 0.12)',
        // Toasts float above the sheet scrim; `raised` is too soft to lift
        // off a dimmed backdrop.
        overlay: '0 12px 32px -8px rgb(0 0 0 / 0.30), 0 2px 8px rgb(0 0 0 / 0.14)',
      },
      spacing: {
        // Thumb-friendly minimum tap target, used as min-h on every control.
        tap: '3rem', // 48px
        'safe-b': 'env(safe-area-inset-bottom, 0px)',
      },
      screens: {
        xs: '400px',
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'shimmer-rtl': {
          '100%': { transform: 'translateX(-100%)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.6s infinite',
        'shimmer-rtl': 'shimmer-rtl 1.6s infinite',
      },
    },
  },
  plugins: [],
}
