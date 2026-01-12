/** @type {import('tailwindcss').Config} */
export default {
    content: ['./src/**/*.{html,js,svelte,ts}'],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Space Grotesk', 'sans-serif'],
            },
            colors: {
                'xr-blue': '#0B1C2D',
                'neon-cyan': '#00E5FF',
            }
        },
    },
    plugins: [],
}
