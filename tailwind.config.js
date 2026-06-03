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
        // ═══════════════════════════════════════════════
        // BRAND — rouge Funding Watch (CTAs + accents)
        // ═══════════════════════════════════════════════
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
        primary: {
          DEFAULT: '#cf2535',
          50: '#fef2f3',
          100: '#fde3e5',
          500: '#e63e4d',
          600: '#cf2535',
          700: '#a91824',
          900: '#751821'
        },

        // ═══════════════════════════════════════════════
        // DATA — bleu institutionnel pour links/sort/info
        // (Devex/Crunchbase pattern : bleu = data interactive)
        // ═══════════════════════════════════════════════
        data: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554'
        },

        // ═══════════════════════════════════════════════
        // INK — palette neutre dominante (texte + surfaces)
        // Conserve pour compat code existant.
        // ═══════════════════════════════════════════════
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

        // ═══════════════════════════════════════════════
        // SURFACE — backgrounds Devex-style (très subtil)
        // ═══════════════════════════════════════════════
        surface: {
          base: '#ffffff',
          subtle: '#fafbfc',      // page bg
          muted: '#f4f6f8',       // sidebar / panel bg
          raised: '#ffffff',      // cards
          overlay: 'rgba(11,13,16,0.6)', // modals overlay
        },

        // ═══════════════════════════════════════════════
        // BORDER — palette lignes (data tables)
        // ═══════════════════════════════════════════════
        line: {
          DEFAULT: '#e4e7eb',
          subtle: '#eef0f3',
          strong: '#cdd3da',
          focus: '#3b82f6',
        },

        // ═══════════════════════════════════════════════
        // SEMANTIC — feedback states
        // ═══════════════════════════════════════════════
        accent: '#c8a24b',
        success: {
          DEFAULT: '#059669',
          50: '#ecfdf5',
          100: '#d1fae5',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
        warning: {
          DEFAULT: '#d97706',
          50: '#fffbeb',
          100: '#fef3c7',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
        info: {
          DEFAULT: '#0284c7',
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
        },
        danger: {
          DEFAULT: '#dc2626',
          50: '#fef2f2',
          100: '#fee2e2',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
        }
      },

      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'system-ui', 'sans-serif'],
        display: ['"Sora"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        // Pour les chiffres tabulaires (data tables, KPI numbers)
        tabular: ['Inter', 'system-ui', 'sans-serif'],
      },

      fontSize: {
        '2xs': ['0.7rem', { lineHeight: '1rem' }],
        '3xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },

      letterSpacing: {
        // Pour titres data-pro (légèrement resserrés Crunchbase-style)
        'tightest': '-0.04em',
        'tighter-2': '-0.025em',
        // Pour eyebrows / labels uppercase
        'wider-2': '0.08em',
        'widest-2': '0.12em',
      },

      borderRadius: {
        // Existing
        xl2: '1.25rem',
        '4xl': '2rem',
        '5xl': '2.5rem',
        // Devex pattern : moins rond, plus sérieux
        'data': '0.5rem',     // tables, badges
        'card-pro': '0.75rem' // cards Devex-style
      },

      spacing: {
        // Dense data padding pour tables / rows
        'row': '0.625rem',    // y-padding des rows tables
        'cell': '0.875rem',   // x-padding des cells tables
      },

      boxShadow: {
        // Existing
        'glow-brand': '0 12px 60px -12px rgba(207, 37, 53, 0.45)',
        'glow-soft': '0 30px 80px -30px rgba(15, 17, 22, 0.5)',
        'card': '0 8px 32px -12px rgba(15, 17, 22, 0.08)',
        'card-hover': '0 24px 80px -24px rgba(15, 17, 22, 0.18)',
        'inner-soft': 'inset 0 1px 0 0 rgba(255,255,255,0.6)',
        // Devex-style : très subtil, juste 1px+blur
        'data-card': '0 1px 2px rgba(15,17,22,0.04), 0 1px 1px rgba(15,17,22,0.06)',
        'data-card-hover': '0 4px 12px rgba(15,17,22,0.08), 0 2px 4px rgba(15,17,22,0.04)',
        'data-row-hover': 'inset 3px 0 0 0 #3b82f6',
        'sticky-header': '0 1px 0 0 #e4e7eb, 0 2px 4px rgba(15,17,22,0.03)',
        'focus-ring': '0 0 0 3px rgba(59,130,246,0.18)',
        'focus-ring-brand': '0 0 0 3px rgba(207,37,53,0.18)',
      },

      backgroundImage: {
        'grad-brand': 'linear-gradient(135deg, #e63e4d 0%, #cf2535 45%, #751821 100%)',
        'grad-dark': 'linear-gradient(135deg, #0b0d10 0%, #2a313b 100%)',
        'grad-light': 'linear-gradient(180deg, #ffffff 0%, #fef2f3 100%)',
        'grad-hero': 'radial-gradient(60% 50% at 50% 0%, rgba(230,62,77,0.18) 0%, rgba(255,255,255,0) 70%), linear-gradient(180deg, #fff 0%, #fef2f3 100%)',
        'grad-hero-dark': 'radial-gradient(60% 50% at 50% 0%, rgba(230,62,77,0.35) 0%, rgba(11,13,16,0) 70%), linear-gradient(180deg, #06080a 0%, #1a1f26 100%)',
        'grad-data': 'linear-gradient(180deg, #fafbfc 0%, #ffffff 100%)',
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
        'count-up': 'count-up 0.8s ease-out both',
        // Devex-style micro-interactions
        'row-highlight': 'row-highlight 0.4s ease-out',
      },

      keyframes: {
        'fade-in': { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        'slide-up': { '0%': { opacity: 0, transform: 'translateY(20px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        'pulse-ring': { '0%': { transform: 'scale(0.8)', opacity: 0.8 }, '80%, 100%': { transform: 'scale(2.4)', opacity: 0 } },
        'shimmer': { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        'marquee': { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } },
        'float': { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
        'glow': { '0%,100%': { boxShadow: '0 0 20px rgba(207,37,53,0.25)' }, '50%': { boxShadow: '0 0 60px rgba(207,37,53,0.6)' } },
        'count-up': { '0%': { opacity: 0, transform: 'translateY(8px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        'row-highlight': { '0%': { backgroundColor: 'rgba(59,130,246,0.08)' }, '100%': { backgroundColor: 'transparent' } },
      },

      backdropBlur: {
        xs: '2px'
      }
    }
  },
  // Sprint 5B — typography pour les pages légales (/privacy, /terms, /cookies, /legal)
  plugins: [require('@tailwindcss/typography')]
};
