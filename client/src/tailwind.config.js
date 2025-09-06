import forms from '@tailwindcss/forms'

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './client.htm',
    './js/**/*.{js,ts,tsx}',
    './css/**/*.css'
  ],
  safelist: ['bg-green-500', 'bg-red-500', 'bg-orange-500'],
  theme: {
    extend: {}
  },
  plugins: [forms()]
}
