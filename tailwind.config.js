/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,tsx}', './components/**/*.{js,ts,tsx}'],

  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Arrière-plans (Backgrounds)
        'bg-canvas': 'var(--bg-canvas)',
        'bg-surface': 'var(--bg-surface)',
        'bg-surface-secondary': 'var(--bg-surface-secondary)',
        'bg-brand': 'var(--bg-brand)',
        'bg-brand-hover': 'var(--bg-brand-hover)',
        'bg-brand-subtle': 'var(--bg-brand-subtle)',
        'bg-disabled': 'var(--bg-disabled)',

        // Textes
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-tertiary': 'var(--text-tertiary)',
        'text-brand': 'var(--text-brand)',
        'text-on-brand': 'var(--text-on-brand)',
        'text-disabled': 'var(--text-disabled)',

        // Bordures
        'border-default': 'var(--border-default)',
        'border-light': 'var(--border-light)',
        'border-strong': 'var(--border-strong)',
        'border-focus': 'var(--border-focus)',
        'border-disabled': 'var(--border-disabled)',

        // Status & Feedbacks (Outdoor)
        'status-bg-error': 'var(--status-bg-error)',
        'status-bg-error-subtle': 'var(--status-bg-error-subtle)',
        'status-text-error': 'var(--status-text-error)',
        'status-bg-success': 'var(--status-bg-success)',
        'status-bg-success-subtle': 'var(--status-bg-success-subtle)',
        'status-text-success': 'var(--status-text-success)',
        'status-bg-warning': 'var(--status-bg-warning)',
        'status-bg-warning-subtle': 'var(--status-bg-warning-subtle)',
        'status-text-warning': 'var(--status-text-warning)',
        'status-bg-info': 'var(--status-bg-info)',
        'status-bg-info-subtle': 'var(--status-bg-info-subtle)',
        'status-text-info': 'var(--status-text-info)',
      },
      fontFamily: {
        sans: ['Satoshi', 'sans-serif'],
        display: ['BricolageGrotesque', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
