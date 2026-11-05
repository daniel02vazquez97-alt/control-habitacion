/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        hotel: {
          sucia: '#D97706',        // Ámbar intenso
          limpia: '#0284C7',       // Azul cielo
          inspeccionada: '#16A34A', // Verde esmeralda
          bloqueada: '#DC2626',    // Rojo carmesí
          ocupada: '#7C3AED',      // Violeta
        },
      },
    },
  },
  plugins: [],
};
