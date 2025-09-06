import forms from '@tailwindcss/forms'

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './client.htm',
    './*.{js,ts,tsx}',
    './js/**/*.{js,ts,tsx}',
    './services/**/*.{js,ts,tsx}',
    './stores/**/*.{js,ts,tsx}',
    './utils/**/*.{js,ts,tsx}',
    './lib/**/*.{js,ts,tsx}',
    './css/**/*.css'
  ],
  safelist: [
    // Status colors (existing)
    'bg-green-500',
    'bg-red-500',
    'bg-orange-500',

    // === CURATED HEADER STYLING (BALANCED APPROACH) ===
    // Common classes that users are likely to need

    // Background Gradients - All Directions
    'bg-gradient-to-r',
    'bg-gradient-to-l',
    'bg-gradient-to-t',
    'bg-gradient-to-b',
    'bg-gradient-to-tr',
    'bg-gradient-to-tl',
    'bg-gradient-to-br',
    'bg-gradient-to-bl',

    // Popular Gradient Colors (from/to/via) - Most common production colors
    'from-red-500',
    'from-red-600',
    'from-red-700',
    'from-blue-500',
    'from-blue-600',
    'from-blue-700',
    'from-green-500',
    'from-green-600',
    'from-green-700',
    'from-yellow-400',
    'from-yellow-500',
    'from-orange-400',
    'from-orange-500',
    'from-purple-500',
    'from-purple-600',
    'from-indigo-500',
    'from-indigo-600',
    'from-pink-500',
    'from-pink-600',
    'from-cyan-400',
    'from-cyan-500',
    'from-emerald-500',
    'from-teal-500',
    'from-slate-700',
    'from-gray-800',

    'to-red-500',
    'to-red-600',
    'to-red-700',
    'to-blue-500',
    'to-blue-600',
    'to-blue-700',
    'to-green-500',
    'to-green-600',
    'to-green-700',
    'to-yellow-400',
    'to-yellow-500',
    'to-orange-400',
    'to-orange-500',
    'to-purple-500',
    'to-purple-600',
    'to-indigo-500',
    'to-indigo-600',
    'to-pink-500',
    'to-pink-600',
    'to-cyan-400',
    'to-cyan-500',
    'to-emerald-500',
    'to-teal-500',
    'to-slate-700',
    'to-gray-800',

    'via-yellow-500',
    'via-pink-500',
    'via-purple-500',
    'via-blue-500',

    // Solid Background Colors
    'bg-red-500',
    'bg-red-600',
    'bg-blue-500',
    'bg-blue-600',
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-cyan-500',
    'bg-emerald-500',
    'bg-slate-700',

    // Text Colors for Headers
    'text-white',
    'text-black',
    'text-yellow-100',
    'text-blue-100',
    'text-red-100',
    'text-green-100',
    'text-gray-100',

    // Text Sizes
    'text-xs',
    'text-sm',
    'text-base',
    'text-lg',
    'text-xl',
    'text-2xl',
    'text-3xl',
    'text-4xl',

    // Font Weights
    'font-normal',
    'font-medium',
    'font-semibold',
    'font-bold',
    'font-black',

    // Header Heights
    'h-4',
    'h-5',
    'h-6',
    'h-7',
    'h-8',
    'h-10',
    'h-12',
    'h-14',
    'h-16',

    // Padding/Spacing
    'px-2',
    'px-4',
    'px-6',
    'py-1',
    'py-2',
    'py-3',

    // Borders
    'border',
    'border-2',
    'border-4',
    'border-red-500',
    'border-blue-500',
    'border-white',
    'border-dashed',
    'border-solid',

    // Border Radius
    'rounded',
    'rounded-lg',
    'rounded-xl',

    // Shadows
    'shadow',
    'shadow-md',
    'shadow-lg',
    'shadow-xl',

    // Animations
    'animate-pulse',
    'animate-bounce',

    // Layout
    'flex',
    'items-center',
    'justify-center',
    'text-center',
    'text-left'
  ],
  theme: {
    extend: {}
  },
  plugins: [forms()]
}
