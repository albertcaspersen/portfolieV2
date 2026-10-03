<script setup>
import { RouterView } from 'vue-router'
</script>

<template>
  <RouterView />
</template>

<style>
/* Aeonik — place font files in /public/fonts/ */
@font-face {
  font-family: 'Aeonik';
  src: url('/fonts/Aeonik-Regular.woff2') format('woff2'),
       url('/fonts/Aeonik-Regular.woff') format('woff');
  font-weight: 400;
  font-style: normal;
}
@font-face {
  font-family: 'Aeonik';
  src: url('/fonts/Aeonik-Medium.woff2') format('woff2'),
       url('/fonts/Aeonik-Medium.woff') format('woff');
  font-weight: 500;
  font-style: normal;
}
@font-face {
  font-family: 'Aeonik';
  src: url('/fonts/Aeonik-Bold.woff2') format('woff2'),
       url('/fonts/Aeonik-Bold.woff') format('woff');
  font-weight: 700;
  font-style: normal;
}

*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html,
body {
  height: 100%;
}

body {
  font-family: 'Aeonik', sans-serif;
  background-color: #0d0d0d;
  color: #111;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#app {
  min-height: 100vh;
}
</style>
