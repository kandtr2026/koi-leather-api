/** @type {import('tailwindcss').Config} */
module.exports = {
  // The admin panel is a single self-contained page: markup AND the inline
  // <script> that builds rows/badges via template literals both live in
  // index.html, so scanning that one file catches every class we use.
  content: ['./public/index.html'],
  theme: { extend: {} },
  plugins: [],
};
