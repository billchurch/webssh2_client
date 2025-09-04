import forms from '@tailwindcss/forms'

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './client.htm',
    './js/**/*.{js,ts}',
    './css/**/*.css',
  ],
  theme: {
    extend: {},
  },
  plugins: [forms()],
}
