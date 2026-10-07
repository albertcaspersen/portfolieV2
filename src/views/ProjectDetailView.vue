<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import gsap from 'gsap'
import { SplitText } from 'gsap/SplitText'
import Navbar from '../components/Navbar.vue'
import { getProject, projects } from '../data/projects.js'
import { useSmoothScroll } from '../composables/useSmoothScroll.js'

gsap.registerPlugin(SplitText)

const route = useRoute()
const router = useRouter()
const rootRef = ref(null)
const mediaRef = ref(null)

// Lerp smooth scroll on the media column (desktop); touch stays native on mobile.
const smoothScroll = useSmoothScroll(mediaRef, { lerp: 0.08, eventTargetRef: rootRef })

const project = computed(() => getProject(route.params.slug))
const projectIndex = computed(() => projects.findIndex((item) => item.slug === route.params.slug))
const previousProject = computed(() => projects[(projectIndex.value - 1 + projects.length) % projects.length])
const nextProject = computed(() => projects[(projectIndex.value + 1) % projects.length])

const projectVideos = computed(() => {
  if (!project.value) return []
  return project.value.videos ?? (project.value.video ? [project.value.video] : [])
})

// Images shown on the right, newest-to-oldest. Fall back to the single cover.
const galleryImages = computed(() => {
  if (!project.value) return []
  return project.value.gallery ?? [project.value.image]
})

const goBack = () => router.push('/projects')

const overlayRef = ref(null)
const isTransitioning = ref(false)

// SplitText instances kept so we can revert them before re-splitting / unmount.
let textSplits = []

const revertSplits = () => {
  textSplits.forEach((split) => split.revert())
  textSplits = []
}

// gsap warns on empty NodeLists, so resolve selectors to arrays we can length-check.
const els = (selector) => (rootRef.value ? Array.from(rootRef.value.querySelectorAll(selector)) : [])

// Split the text into masked lines and park them in the hidden "from" state, and
// hide the media. Chrome (nav, close, prev/next) is intentionally left untouched.
const hideContent = () => {
  if (!rootRef.value) return
  // Media column may have scrolled on the previous project — reset it.
  const media = rootRef.value.querySelector('.detail-media')
  if (media) media.scrollTop = 0
  smoothScroll.reset()

  revertSplits()
  const lineEls = []
  els('.reveal-text').forEach((el) => {
    const split = new SplitText(el, { type: 'lines', mask: 'lines', linesClass: 'reveal-line' })
    textSplits.push(split)
    lineEls.push(...split.lines)
  })
  if (lineEls.length) gsap.set(lineEls, { transformOrigin: '0% 100%', yPercent: 160, rotate: 10 })

  const mediaEls = els('.reveal-media')
  if (mediaEls.length) gsap.set(mediaEls, { opacity: 0, y: 24 })
}

// Reveal the parked content. Text slides up like the menu nav; media fades up.
// Chrome only animates on the very first entrance (animateChrome).
const revealContent = ({ animateChrome = false } = {}) => {
  if (!rootRef.value) return

  const tl = gsap.timeline({ delay: 0.05 })

  const lineEls = textSplits.flatMap((split) => split.lines)
  if (lineEls.length) {
    tl.to(lineEls, { yPercent: 0, rotate: 0, duration: 1, ease: 'power4.out', stagger: 0.1 }, 0)
  }

  const mediaEls = els('.reveal-media')
  if (mediaEls.length) {
    tl.to(mediaEls, { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out', stagger: 0.07 }, 0)
  }

  if (animateChrome) {
    const chromeEls = els('.reveal-chrome')
    if (chromeEls.length) {
      tl.fromTo(
        chromeEls,
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out', stagger: 0.07 },
        0
      )
    }
  }
}

const openProject = (item, direction = 1) => {
  if (isTransitioning.value || item.slug === route.params.slug) return
  isTransitioning.value = true

  const panel = overlayRef.value
  // Dark panel sweeps in from the clicked side, covers everything, then exits the far side.
  gsap.set(panel, { xPercent: 100 * direction, autoAlpha: 1 })

  const tl = gsap.timeline()
  tl.to(panel, { xPercent: 0, duration: 0.5, ease: 'power3.inOut' })
    .add(() => router.push(`/projects/${item.slug}`))
    .to(panel, { xPercent: -100 * direction, duration: 0.6, ease: 'power3.inOut' }, '+=0.08')
    .set(panel, { autoAlpha: 0 })
    // Transition done — now play the text/media in. Chrome stays put.
    .add(() => {
      isTransitioning.value = false
      revealContent()
    })
}

onMounted(() => {
  // Unknown slug — send the visitor back to the grid.
  if (!project.value) {
    router.replace('/projects')
    return
  }
  // First entrance: chrome is hidden too, then everything animates in.
  const chromeEls = els('.reveal-chrome')
  if (chromeEls.length) gsap.set(chromeEls, { opacity: 0, y: 24 })
  hideContent()
  revealContent({ animateChrome: true })
})

// Support navigating between projects without a full remount.
watch(
  () => route.params.slug,
  async () => {
    if (!project.value) {
      router.replace('/projects')
      return
    }
    await nextTick()
    // Hide the new project's content immediately (it renders under the cover).
    hideContent()
    // Transition-driven switches reveal from openProject's timeline; any other
    // navigation (e.g. browser history) reveals right away.
    if (!isTransitioning.value) revealContent()
  }
)

const onKey = (event) => {
  if (event.key === 'Escape') goBack()
}
onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  revertSplits()
})
</script>

<template>
  <div ref="rootRef" v-if="project" class="project-detail">
    <div ref="overlayRef" class="transition-overlay" aria-hidden="true"></div>
    <Navbar class="page-nav reveal-chrome" />
    <button class="project-close reveal-chrome" type="button" aria-label="Tilbage til projekter" @click="goBack">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    </button>
    <div class="detail-grid">
      <nav class="project-switcher reveal-chrome" aria-label="Skift projekt">
        <button type="button" @click="openProject(previousProject, -1)">PREV</button>
        <span aria-hidden="true">/</span>
        <button type="button" @click="openProject(nextProject, 1)">NEXT</button>
      </nav>

      <!-- Remount content on project changes without remounting the navigation. -->
      <section :key="`info-${route.params.slug}`" class="detail-info">
        <h1 class="detail-title reveal-text">{{ project.title }}</h1>
        <div class="detail-body">
          <span class="detail-tag reveal-text">{{ project.tag }} • {{ project.year }}</span>
          <div class="detail-text">
            <p class="detail-description reveal-text">{{ project.description }}</p>
            <ul v-if="project.tech?.length" class="detail-tech">
              <li v-for="item in project.tech" :key="item" class="reveal-text">{{ item }}</li>
            </ul>
          </div>
        </div>
      </section>

      <section :key="`media-${route.params.slug}`" ref="mediaRef" class="detail-media">
        <video
          v-for="src in projectVideos"
          :key="src"
          class="media-item reveal-media"
          :src="src"
          autoplay
          muted
          loop
          playsinline
          preload="auto"
        ></video>
        <img
          v-for="(src, i) in galleryImages"
          :key="src"
          class="media-item reveal-media"
          :src="src"
          :alt="`${project.title} — ${i + 1}`"
          loading="lazy"
        />
      </section>
    </div>
  </div>
</template>

<style scoped>
.project-detail {
  position: fixed;
  inset: 0;
  background-color: #060606;
  color: #ffffff;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
  overflow: hidden;
}

.page-nav {
  flex: 0 0 auto;
}

.project-close {
  position: fixed;
  top: 1.2rem;
  left: 1rem;
  z-index: 35;
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: #ff0059;
  cursor: pointer;
  transition: color 180ms ease, transform 180ms ease;
}

.project-close:hover {
  color: #ff0059;
  transform: rotate(90deg);
}

.project-close:focus-visible {
  outline: 1px solid #ff0059;
  outline-offset: 4px;
}

.project-close svg {
  width: 25px;
  height: 25px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
}

.transition-overlay {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: #0a0a0a;
  visibility: hidden;
  will-change: transform;
}

.project-switcher {
  position: absolute;
  grid-column: 2;
  grid-row: 1;
  top: 2rem;
  left: 0;
  right: 0;
  z-index: 35;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  gap: 1.4rem;
  color: rgba(255, 255, 255, 0.55);
  font-size: 1.1rem;
  font-weight: 500;
  line-height: 1;
  pointer-events: none;
}

.project-switcher button {
  padding: 0;
  border: 0;
  background: none;
  color: #ff0059;
  font: inherit;
  letter-spacing: inherit;
  cursor: pointer;
  pointer-events: auto;
  transition: color 180ms ease;
}

.project-switcher button:hover {
  color: #ffffff;
}

.project-switcher button:focus-visible {
  outline: 1px solid currentColor;
  outline-offset: 5px;
}

.detail-grid {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.25fr);
  gap: max(24px, 3vw);
  align-items: stretch;
}

/* Left column stays put — only the media column scrolls. */
.detail-info {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: clamp(40px, 8vh, 96px);
  padding: clamp(120px, 18vh, 180px) max(16px, 1.5vw) 0 max(20px, 2vw);
  box-sizing: border-box;
  font-size: clamp(12px, 1vw, 16px);
}

/* Tag sits in a narrow left sub-column next to the description + tech. */
.detail-body {
  display: grid;
  grid-template-columns: minmax(96px, 0.5fr) minmax(0, 1fr);
  gap: max(12px, 1.4vw);
  align-items: baseline;
}

.detail-text {
  display: flex;
  flex-direction: column;
  gap: max(18px, 2vw);
}

.detail-tag {
  font-size: 0.95em;
  letter-spacing: 0.1em;
  color: rgba(255, 255, 255, 0.6);
}

.detail-title {
  margin: 0;
  font-size: 3.4em;
  font-weight: 400;
  line-height: 1.02;
  color: #ff0059;
}

.detail-description {
  margin: 0;
  font-size: 1.05em;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.82);
  max-width: 34ch;
  text-align: justify;
}

.detail-tech {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: max(4px, 0.3vw);
  font-size: 1.05em;
  color: rgba(255, 255, 255, 0.9);
}

/* Only this column scrolls; add breathing room above every project's media. */
.detail-media {
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: max(18px, 2vw);
  box-sizing: border-box;
  padding-top: clamp(72px, 10vh, 120px);
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.25) transparent;
}

.detail-media::-webkit-scrollbar {
  width: 8px;
}

.detail-media::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 999px;
}

.media-item {
  width: 100%;
  height: auto;
  display: block;
  flex: 0 0 auto;
}

@media (max-width: 860px) {
  .project-switcher {
    position: fixed;
    grid-column: auto;
    grid-row: auto;
    gap: 0.6rem;
    font-size: 1.1rem;
  }

  .project-detail {
    position: relative;
    min-height: 100vh;
    overflow: visible;
  }

  .detail-grid {
    grid-template-columns: 1fr;
    gap: clamp(24px, 6vw, 40px);
  }

  .detail-info {
    align-self: stretch;
    justify-content: flex-start;
    gap: clamp(24px, 6vw, 40px);
    padding: max(16px, 4vw);
    transform: none;
    font-size: clamp(14px, 3.6vw, 18px);
  }

  .detail-title {
    font-size: 2.3em;
  }

  .detail-body {
    grid-template-columns: 1fr;
    gap: max(10px, 2vw);
  }

  .detail-media {
    overflow: visible;
    height: auto;
  }
}
</style>
