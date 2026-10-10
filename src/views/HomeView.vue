<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import gsap from 'gsap'
import Navbar from '../components/Navbar.vue'
//import DanceMan from '../components/DanceMan.vue'//
import DanceMan from '../components/DanceManCopy6.vue'
import Preloader from '../components/Preloader.vue'

const PRELOADER_SESSION_KEY = 'site-preloaded'

const router = useRouter()
const danceRef = ref(null)
const headerRef = ref(null)
const loadProgress = ref(0)
const isLoaded = ref(false)
// Preloaderen skal kun vises ved første besøg i denne session, ikke når man navigerer tilbage til Home.
const showPreloader = ref(sessionStorage.getItem(PRELOADER_SESSION_KEY) !== '1')
let navigating = false

const navigateFromHome = (e, path) => {
  e.preventDefault()
  if (navigating) return
  navigating = true
  danceRef.value?.triggerProjects({
    onComplete: () => router.push(path)
  })
  const label = headerRef.value.querySelector('.label')
  const nameLines = headerRef.value.querySelectorAll('.name-line')
  gsap.to([label, ...nameLines], { opacity: 0, y: 24, duration: 0.6, ease: 'power2.inOut', stagger: 0.08 })
}

const goToContact = (e) => navigateFromHome(e, '/contact')

const goToProjects = (e) => navigateFromHome(e, '/projects')

const goToAbout = (e) => {
  navigateFromHome(e, '/about')
}

const handleNavigation = (e, to) => {
  if (to === '/') return
  e.preventDefault()
  if (to === '/projects') goToProjects(e)
  if (to === '/about') goToAbout(e)
  if (to === '/contact') goToContact(e)
}

onMounted(() => {
  const label = headerRef.value.querySelector('.label')
  const nameLines = headerRef.value.querySelectorAll('.name-line')
  gsap.set([label, ...nameLines], { opacity: 0, y: 24 })
})

// Teksten toner først ind når modellen/lyden reelt er klar, ikke efter en fast timer.
const onSceneLoaded = () => {
  isLoaded.value = true
  sessionStorage.setItem(PRELOADER_SESSION_KEY, '1')
  // Uden preloader (tilbage-navigation) starter introen med det samme.
  if (!showPreloader.value) danceRef.value?.startIntro()
  const label = headerRef.value.querySelector('.label')
  const nameLines = headerRef.value.querySelectorAll('.name-line')
  gsap.to([label, ...nameLines], { opacity: 1, y: 0, duration: 2.5, delay: 0.3, ease: 'power2.out', stagger: 0.20 })
}

// Preloaderen er færdig og fadet ud – kør først nu kamera-/tåge-introen.
const onPreloaderComplete = () => {
  danceRef.value?.startIntro()
}

const onSceneProgress = (value) => {
  loadProgress.value = value
}
</script>

<template>
  <div class="page">
    <header class="grid header" ref="headerRef">
      <Navbar @navigate="handleNavigation" />

      <div class="header-left">
        <span class="label">CREATIVE DEVELOPER</span>
        <h1 class="name" aria-label="Albert Caspersen">
          <span class="name-line">ALBERT</span>
          <span class="name-line">CASPERSEN</span>
        </h1>
      </div>
    </header>

    <div class="model-container">
      <DanceMan ref="danceRef" @progress="onSceneProgress" @loaded="onSceneLoaded" />
    </div>

    <Preloader v-if="showPreloader" :progress="loadProgress" :done="isLoaded" @complete="onPreloaderComplete" />
  </div>
</template>

<style scoped>
.page {
  position: relative;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: linear-gradient(90deg, #1a0904 0%, #120604 100%);
}

/* 3D Model */
.model-container {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  overflow: hidden;
  background: transparent;
  z-index: 0;
}

.header,
.footer {
  position: relative;
  z-index: 2;
}

.grid {
  display: block;
}

.header {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  align-items: start;
  column-gap: max(8px, 1.4vw);
  padding: max(20px, 3vw);
  pointer-events: none;
}

.header-left {
  position: absolute;
  left: 26px;
  bottom: 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
}

.name {
  display: flex;
  flex-direction: column;
  margin: 0;
  color: #D9D8E8;
  text-transform: uppercase;
  line-height: 0.8;
  font-weight: 500;
  margin-bottom: 1rem;

}

.name-line {
  display: block;
  font-size: clamp(4rem, 9vw, 15rem);
  line-height: 0.8;
  color: #FF0059;
}

.label {
  font-size: clamp(0.8rem, 1.6vw, 1.8rem);
  letter-spacing: 0.12em;
  color: #FF0059;
  font-weight: 400;
  text-transform: uppercase;
}

@media (max-width: 640px) {
  .header-left {
    left: max(16px, env(safe-area-inset-left));
    bottom: max(18px, env(safe-area-inset-bottom));
  }

  .name-line {
    font-size: clamp(2.5rem, 13vw, 4rem);
  }
}
</style>
