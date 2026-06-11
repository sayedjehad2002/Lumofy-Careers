import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
  	container: {
  		center: true,
  		padding: '2rem',
  		screens: {
  			'2xl': '1400px'
  		}
  	},
  	extend: {
  		screens: {
  			'3xl': '1920px',
  			'4xl': '2560px'
  		},
  		fontFamily: {
  			sans: [
  				'IBM Plex Sans',
  				'Source Sans 3',
  				'ui-sans-serif',
  				'system-ui',
  				'-apple-system',
  				'BlinkMacSystemFont',
  				'Segoe UI',
  				'Roboto',
  				'Helvetica Neue',
  				'Arial',
  				'Noto Sans',
  				'sans-serif'
  			],
  			display: [
  				'Source Sans 3',
  				'ui-sans-serif',
  				'system-ui',
  				'sans-serif'
  			],
  			serif: [
  				'Lora',
  				'ui-serif',
  				'Georgia',
  				'Cambria',
  				'Times New Roman',
  				'Times',
  				'serif'
  			],
  			mono: [
  				'Space Mono',
  				'ui-monospace',
  				'SFMono-Regular',
  				'Menlo',
  				'Monaco',
  				'Consolas',
  				'Liberation Mono',
  				'Courier New',
  				'monospace'
  			]
  		},
  		colors: {
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))',
  				/* AA-readable variant for SMALL primary-colored text on dark surfaces
  				   (Sirius at 52% lightness is 3.3:1 there — fails 4.5:1). Same hue. */
  				readable: 'hsl(var(--primary-readable))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))',
  				/* AA-readable variant for small error TEXT (not buttons/borders). */
  				readable: 'hsl(var(--destructive-readable))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			},
			surface: 'hsl(var(--surface))',
			'surface-hover': 'hsl(var(--surface-hover))',
			lumofy: {
				DEFAULT: 'hsl(var(--lumofy-blue))',
				glow: 'hsl(var(--lumofy-glow))'
			},
			brand: {
				sirius: 'hsl(var(--brand-sirius))',
				eclipse: 'hsl(var(--brand-eclipse))',
				aurora: 'hsl(var(--brand-aurora))',
				stellar: 'hsl(var(--brand-stellar))',
				nova: 'hsl(var(--brand-nova))',
			},
			intel: {
				surface: 'hsl(var(--intel-surface))',
				card: 'hsl(var(--intel-card))',
				'card-hover': 'hsl(var(--intel-card-hover))',
				border: 'hsl(var(--intel-border))',
				'text-primary': 'hsl(var(--intel-text-primary))',
				'text-secondary': 'hsl(var(--intel-text-secondary))',
				'text-muted': 'hsl(var(--intel-text-muted))',
				success: 'hsl(var(--intel-success))',
				'success-subtle': 'hsl(var(--intel-success-subtle))',
				warning: 'hsl(var(--intel-warning))',
				'warning-subtle': 'hsl(var(--intel-warning-subtle))',
				danger: 'hsl(var(--intel-danger))',
				'danger-subtle': 'hsl(var(--intel-danger-subtle))',
				accent: 'hsl(var(--intel-accent))',
				'accent-subtle': 'hsl(var(--intel-accent-subtle))',
				'tab-bg': 'hsl(var(--intel-tab-bg))',
				'tab-active': 'hsl(var(--intel-tab-active))',
				'gauge-track': 'hsl(var(--intel-gauge-track))',
			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			},
  			'fade-up': {
  				'0%': {
  					opacity: '0',
  					transform: 'translateY(20px)'
  				},
  				'100%': {
  					opacity: '1',
  					transform: 'translateY(0)'
  				}
  			},
  			'fade-in': {
  				'0%': {
  					opacity: '0'
  				},
  				'100%': {
  					opacity: '1'
  				}
  			},
  			'pulse-glow': {
  				'0%, 100%': {
  					boxShadow: '0 0 15px hsl(223 83% 60% / 0.2)'
  				},
  				'50%': {
  					boxShadow: '0 0 30px hsl(223 83% 60% / 0.4)'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			'fade-up': 'fade-up 0.5s ease-out',
  			'fade-in': 'fade-in 0.3s ease-out',
  			'pulse-glow': 'pulse-glow 2s ease-in-out infinite'
  		},
  		boxShadow: {
  			'2xs': 'var(--shadow-2xs)',
  			xs: 'var(--shadow-xs)',
  			sm: 'var(--shadow-sm)',
  			md: 'var(--shadow-md)',
  			lg: 'var(--shadow-lg)',
  			xl: 'var(--shadow-xl)',
  			'2xl': 'var(--shadow-2xl)'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
