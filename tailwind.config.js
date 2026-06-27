/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          soft: 'hsl(var(--primary-soft))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))'
        },
        chart: {
          1: 'hsl(var(--chart-1))',
          2: 'hsl(var(--chart-2))',
          3: 'hsl(var(--chart-3))',
          4: 'hsl(var(--chart-4))',
          5: 'hsl(var(--chart-5))'
        },
        // 暖白中性色阶（清亮用）
        warm: {
          50: '#FCFBF7',
          100: '#F6F2E9',
          200: '#ECE7DA',
          300: '#DCD4C0',
          400: '#A39B8B',
          500: '#6E6557',
          600: '#3D3A33',
          700: '#2C2A26'
        },
        // 柑橘亮主色阶
        citrus: {
          50: '#FCE7D2',
          100: '#F8D5B0',
          200: '#F5A04D',
          300: '#DD8233',
          400: '#C26A38',
          500: '#B05E1C',
          600: '#8A4612'
        },
        // 薄荷辅助
        mint: {
          50: '#E5F0EC',
          100: '#D5E5DE',
          200: '#7AAA9B',
          300: '#5A8B7C',
          400: '#3F6B5E'
        }
      },
      fontFamily: {
        sans: ['Inter Tight', '-apple-system', 'BlinkMacSystemFont', '"PingFang SC"', '"Microsoft YaHei"', 'sans-serif'],
        display: ['"Bricolage Grotesque"', 'Inter Tight', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace']
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.16, 1, 0.3, 1)',
        'spring-soft': 'cubic-bezier(0.34, 1.2, 0.64, 1)'
      },
      boxShadow: {
        'accent-glow': '0 4px 14px hsl(27 92% 63% / 0.28)',
        'accent-glow-lg': '0 8px 24px hsl(27 92% 63% / 0.35)',
        'card-hover': '0 14px 32px -14px hsl(30 11% 16% / 0.18)'
      },
      keyframes: {
        'fly-in': {
          '0%': { opacity: 0, transform: 'translateY(6px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' }
        },
        'pulse-rec': {
          '0%, 100%': { boxShadow: '0 0 0 0 hsl(16 65% 56% / 0.55)' },
          '50%': { boxShadow: '0 0 0 7px hsl(16 65% 56% / 0)' }
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' }
        }
      },
      animation: {
        'fly-in': 'fly-in 0.55s cubic-bezier(0.16, 1, 0.3, 1) both',
        'pulse-rec': 'pulse-rec 1.5s ease-in-out infinite',
        shimmer: 'shimmer 1.6s linear infinite'
      }
    }
  },
  plugins: []
}
