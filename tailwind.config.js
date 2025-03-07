/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Main theme colors
        'primary': '#3E442B',
        'secondary': '#6A7062',
        'accent': '#8D909B',
        
        // Background colors
        'lightBg': '#F9FAFB',
        'darkBg': '#3E442B',
        
        // Content block colors
        'oddBlock': '#AAADC4',
        'evenBlock': '#D6EEFF',
        'oddBlockDark': '#6A7062',
        'evenBlockDark': '#8D909B',
        
        // Text colors
        'textDark': '#3E442B',
        'textLight': '#D6EEFF',
        
        // Shortcuts for backward compatibility
        'drab-brown': '#3E442B',
        'ebony': '#6A7062',
        'cool-gray': '#8D909B',
        'cool-gray-light': '#AAADC4',
        'columbia-blue': '#D6EEFF',
      }
    },
  },
  plugins: [],
}
