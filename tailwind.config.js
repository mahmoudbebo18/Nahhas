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
      // The type scale. Five sizes and no others — a size picked per screen is
      // how a UI ends up with 11/12/13/14/15/17 all within one card. Sizes
      // only: line-height is inherited from <body>, which sets it per script
      // (Arabic needs more room above and below than Latin does).
      fontSize: {
        meta: '12px', // codes, counts, dates under a title
        secondary: '13px', // supporting lines, labels, badges' bigger sibling
        body: '15px', // default reading size, button text
        title: '17px', // card and section titles
        display: '22px', // the one screen title
      },
      // The radius scale: badge < control < card. Nothing rounder than a card
      // except a true circle (rounded-full) for avatars and counters.
      borderRadius: {
        badge: '6px',
        control: '10px',
        card: '14px',
      },
      // Cards are flat — a border, never a shadow. A shadow means "this floats
      // above the page": sheets, toasts and popovers only.
      boxShadow: {
        sheet: '0 -8px 32px rgb(0 0 0 / 0.18)',
        // A sheet is anchored to the bottom edge, so its shadow only ever
        // spills upward. A centred dialog needs one that falls all round.
        modal: '0 24px 64px -16px rgb(0 0 0 / 0.35), 0 4px 12px rgb(0 0 0 / 0.12)',
        // Toasts float above the sheet scrim; `raised` is too soft to lift
        // off a dimmed backdrop.
        overlay: '0 12px 32px -8px rgb(0 0 0 / 0.30), 0 2px 8px rgb(0 0 0 / 0.14)',
      },
      spacing: {
        // Thumb-friendly height for full-width controls (buttons, inputs).
        tap: '3rem', // 48px
        // The floor for anything pressable — icon buttons, crumbs, checkboxes.
        touch: '2.75rem', // 44px
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
