<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import gsap from 'gsap'
import Navbar from '../components/Navbar.vue'
import NoiseWipeImage from '../components/NoiseWipeImage.vue'
import { projects } from '../data/projects.js'
import { preloadVideo } from '../composables/useVideoPreload.js'
import { useSmoothScroll } from '../composables/useSmoothScroll.js'

const router = useRouter()
const rootRef = ref(null)
const rowRef = ref(null)
// Keep the eased wheel scrolling for the desktop horizontal row only.
if (window.matchMedia('(min-width: 861px)').matches) {
  useSmoothScroll(rowRef, { axis: 'x', lerp: 0.08 })
}
const activeIndex = ref(null)
const revealPoints = ref({})
const rowHeight = ref(0)

const cardWidths = ref(projects.map(() => 0))

const openProject = (project) => {
  router.push(`/projects/${project.slug}`)
}

// Keep a stable image height so the project titles remain visible under each card.
const layoutRow = () => {
  const el = rowRef.value
  if (!el) return

  const height = Math.max(340, Math.min(window.innerHeight * 0.68, 760))
  rowHeight.value = height
  cardWidths.value = projects.map((p) => p.ratio * height)
}

const setActive = (index) => {
  activeIndex.value = index
  // Only warm the hovered project's video — the one most likely to be clicked —
  // so its (large) file gets the full connection instead of competing with all.
  const project = projects[index]
  const videos = project.videos ?? (project.video ? [project.video] : [])
  videos.forEach(preloadVideo)
}

const clearActive = () => {
  activeIndex.value = null
}

const updateReveal = (event, index) => {
  const bounds = event.currentTarget.getBoundingClientRect()
  revealPoints.value[index] = {
    x: Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width)),
    y: Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height))
  }
}

onMounted(() => {
  layoutRow()
  window.addEventListener('resize', layoutRow)

  gsap.fromTo(
    rootRef.value.querySelectorAll('.reveal'),
    { opacity: 0, y: 24 },
    { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out', stagger: 0.08, delay: 0.15 }
  )

  gsap.fromTo(
    rootRef.value.querySelectorAll('.project-card'),
    { opacity: 0, y: 40, clipPath: 'inset(100% 0 0 0)' },
    {
      opacity: 1,
      y: 0,
      clipPath: 'inset(0% 0 0 0)',
      duration: 1,
      ease: 'power3.out',
      stagger: 0.09,
      delay: 0.35
    }
  )
})

onUnmounted(() => {
  window.removeEventListener('resize', layoutRow)
})
</script>

<template>
  <div ref="rootRef" class="projects-page">
    <Navbar class="page-nav reveal" />

    <header class="projects-header">
      <h1 class="title reveal">
        A selection of <span class="accent-word">experiments</span> and <span class="accent-word">ideas</span>
      </h1>
    </header>

    <main
      ref="rowRef"
      class="projects-row"
      :style="{ '--row-height': rowHeight ? rowHeight + 'px' : 'auto' }"
      @mouseleave="clearActive"
    >
      <article
        v-for="(project, index) in projects"
        :key="project.title"
        class="project-card"
        :class="{
          'is-active': activeIndex === index,
          'is-dimmed': activeIndex !== null && activeIndex !== index
        }"
        :style="{ width: cardWidths[index] ? cardWidths[index] + 'px' : 'auto' }"
        @mouseenter="setActive(index)"
        @mousemove="updateReveal($event, index)"
        @click="openProject(project)"
      >
        <div class="card-media">
          <img class="card-base" :src="project.image" :alt="project.title" />
          <NoiseWipeImage
            class="card-reveal"
            :src="project.image"
            :reveal-x="revealPoints[index]?.x ?? 0.5"
            :reveal-y="revealPoints[index]?.y ?? 0.5"
            :active="activeIndex === index"
            grow
            :duration="1.8"
          />
        </div>

        <div class="card-caption">
          <span class="card-index">{{ String(index + 1).padStart(2, '0') }}</span>
          <div class="card-meta">
            <h2 class="card-title">{{ project.title }}</h2>
            <span class="card-tag">{{ project.tag }}</span>
          </div>
        </div>
      </article>
    </main>

  </div>
</template>

<style scoped>
.projects-page {
  position: fixed;
  inset: 0;
  background-color: #060606;
  color: #ffffff;
  padding: max(20px, 2vw);
  display: flex;
  flex-direction: column;
  gap: max(16px, 1.6vw);
}

.page-nav {
  flex: 0 0 auto;
}

.projects-header {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: -0.7rem;
}

.label {
  font-size: max(0.75rem, 0.85vw);
  letter-spacing: 0.1em;
  color: rgba(255, 255, 255, 0.6);
}

.title {
  font-size: max(1.9rem, 3vw);
  font-weight: 400;
  line-height: 1.02;
  margin: 0;
  text-transform: uppercase;
}

.accent-word {
  color: #ff0059;
}

/* Row scrolls sideways; wheel and touch input navigate the projects. */
.projects-row {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  gap: max(10px, 1vw);
  overflow-x: auto;
  overflow-y: visible;
  overscroll-behavior: contain;
  touch-action: pan-x;
  scrollbar-width: none;
  padding-top: 0.6rem;
  padding-bottom: 8px;
  margin-top: 1rem;
}

.projects-row::-webkit-scrollbar {
  display: none;
}

.project-card {
  position: relative;
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  gap: max(8px, 0.7vw);
  cursor: pointer;
  transition: transform 0.55s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.55s ease;
  will-change: transform, opacity;
  padding-bottom: 8px;
}

.card-media {
  position: relative;
  height: var(--row-height, clamp(420px, 68vh, 760px));
  overflow: hidden;
}

/* Grayscale base — full image, no crop (box aspect matches the image) */
.card-base {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  filter: grayscale(100%) brightness(0.82);
  transition: filter 0.55s ease;
}

/* NoiseWipe colour reveal sits exactly over the base image */
.card-reveal {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

/* Caption sits below the media, reveals fully on hover */
.card-caption {
  flex: 0 0 auto;
  display: flex;
  align-items: baseline;
  gap: max(8px, 0.7vw);
  opacity: 0.55;
  transform: translateY(0);
  transition: opacity 0.45s ease;
}

.card-index {
  font-size: max(0.7rem, 0.8vw);
  color: #5a5a5a;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.card-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.card-title {
  margin: 0;
  font-size: max(0.95rem, 1.05vw);
  font-weight: 500;
  line-height: 1.1;
  color: #ff0059;
}

.card-tag {
  font-size: max(0.7rem, 0.78vw);
  color: #8a8a8a;
  letter-spacing: 0.04em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Accent line grows from the left on hover */
.card-line {
  position: absolute;
  left: 0;
  bottom: 0;
  height: 2px;
  width: 100%;
  background: #ff0059;
  transform: scaleX(0);
  transform-origin: left center;
  transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
  z-index: 2;
}

/* Active card — caption emphasised */
.project-card.is-active .card-caption {
  opacity: 1;
}

/* Non-hovered cards recede — the row never reflows */
.project-card.is-dimmed {
  opacity: 0.45;
}

/* Tablet / mobile — stack into a scrollable column */
@media (max-width: 860px) {
  .projects-page {
    position: relative;
    min-height: 100vh;
    min-height: 100dvh;
    overflow: visible;
  }

  .projects-row {
    flex-direction: column;
    align-items: stretch;
    gap: clamp(20px, 5vw, 32px);
    overflow: visible;
    overscroll-behavior: auto;
    touch-action: pan-y;
  }

  .projects-header {
    margin-top: 3.7rem;
    
  }

  .title {
    font-size: clamp(1.6rem, 6.9vw, 2.4rem);
    max-width: 100%;
  }

  .project-card {
    width: 100% !important;
  }

  .card-media {
    height: auto;
    aspect-ratio: auto;
  }

  .card-base {
    height: auto;
    filter: none;
  }

  .card-caption {
    opacity: 1;
  }

  .project-card.is-dimmed {
    opacity: 1;
  }
}
</style>
