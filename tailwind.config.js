/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './lib/**/*.{js,jsx,ts,tsx}'
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Rouge premium institutionnel — palette principale
        brand: {
          50: '#fef2f3',
          100: '#fde3e5',
          200: '#fbcbcf',
          300: '#f7a3aa',
          400: '#f06f7a',
          500: '#e63e4d',
          600: '#cf2535',
          700: '#a91824',
          800: '#8b1722',
          900: '#751821',
          950: '#3f080d'
        },
        // Conserve "primary" comme alias rouge pour compat code existant
        primary: {
          DEFAULT: '#cf2535',
          50: '#fef2f3',
          100: '#fde3e5',
          500: '#e63e4d',
          600: '#cf2535',
          700: '#a91824',
          900: '#751821'
        },
        ink: {
          DEFAULT: '#0b0d10',
          50: '#f7f8fa',
          100: '#eef0f3',
          200: '#dce0e6',
          300: '#b6bcc7',
          400: '#828a98',
          500: '#5b6473',
          600: '#3f4754',
          700: '#2a313b',
          800: '#1a1f26',
          900: '#0b0d10',
          950: '#06080a'
        },
        accent: '#c8a24b',
        success: '#0e9f6e',
        warning: '#f59f00',
        danger: '#cf2535'
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Sora"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace']
      },
      fontSize: {
        '2xs': ['0.7rem', { lineHeight: '1rem' }]
      },
      borderRadius: {
        xl2: '1.25rem',
        '4xl': '2rem',
        '5xl': '2.5rem'
      },
      boxShadow: {
        'glow-brand': '0 12px 60px -12px rgba(207, 37, 53, 0.45)',
        'glow-soft': '0 30px 80px -30px rgba(15, 17, 22, 0.5)',
        'card': '0 8px 32px -12px rgba(15, 17, 22, 0.08)',
        'card-hover': '0 24px 80px -24px rgba(15, 17, 22, 0.18)',
        'inner-soft': 'inset 0 1px 0 0 rgba(255,255,255,0.6)'
      },
      backgroundImage: {
        'grad-brand': 'linear-gradient(135deg, #e63e4d 0%, #cf2535 45%, #751821 100%)',
        'grad-dark': 'linear-gradient(135deg, #0b0d10 0%, #2a313b 100%)',
        'grad-light': 'linear-gradient(180deg, #ffffff 0%, #fef2f3 100%)',
        'grad-hero': 'radial-gradient(60% 50% at 50% 0%, rgba(230,62,77,0.18) 0%, rgba(255,255,255,0) 70%), linear-gradient(180deg, #fff 0%, #fef2f3 100%)',
        'grad-hero-dark': 'radial-gradient(60% 50% at 50% 0%, rgba(230,62,77,0.35) 0%, rgba(11,13,16,0) 70%), linear-gradient(180deg, #06080a 0%, #1a1f26 100%)',
        'noise': "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' /%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.06 0' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' /%3E%3C/svg%3E\")"
      },
      animation: {
        'fade-in': 'fade-in 0.6s ease-out both',
        'slide-up': 'slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
        'pulse-ring': 'pulse-ring 1.8s cubic-bezier(0.215, 0.61, 0.355, 1) infinite',
        'shimmer': 'shimmer 2.4s linear infinite',
        'marquee': 'marquee 40s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 3s ease-in-out infinite',
        'count-up': 'count-up 0.8s ease-out both'
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 }
        },
        'slide-up': {
          '0%': { opacity: 0, transform: 'translateY(20px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' }
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.8)', opacity: 0.8 },
          '80%, 100%': { transform: 'scale(2.4)', opacity: 0 }
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        },
        'marquee': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' }
        },
        'float': {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' }
        },
        'glow': {
          '0%,100%': { boxShadow: '0 0 20px rgba(207,37,53,0.25)' },
          '50%': { boxShadow: '0 0 60px rgba(207,37,53,0.6)' }
        },
        'count-up': {
          '0%': { opacity: 0, transform: 'translateY(8px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' }
        }
      },
      backdropBlur: {
        xs: '2px'
      }
    }
  },
  plugins: []
};
