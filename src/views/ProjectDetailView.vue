<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import gsap from 'gsap'
import Navbar from '../components/Navbar.vue'
import { getProject } from '../data/projects.js'

const route = useRoute()
const router = useRouter()
const rootRef = ref(null)

const project = computed(() => getProject(route.params.slug))

const goBack = () => router.push('/projects')

const playIn = () => {
  if (!rootRef.value) return
  gsap.fromTo(
    rootRef.value.querySelectorAll('.reveal'),
    { opacity: 0, y: 24 },
    { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out', stagger: 0.08, delay: 0.1 }
  )
}

onMounted(() => {
  // Unknown slug — send the visitor back to the grid.
  if (!project.value) {
    router.replace('/projects')
    return
  }
  playIn()
})

// Support navigating between projects without a full remount.
watch(
  () => route.params.slug,
  () => {
    if (!project.value) router.replace('/projects')
    else playIn()
  }
)

const onKey = (event) => {
  if (event.key === 'Escape') goBack()
}
onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div ref="rootRef" v-if="project" class="project-detail">
    <Navbar class="page-nav reveal" />

    <button class="close-btn reveal" type="button" aria-label="Luk projekt" @click="goBack">
      <span class="close-icon">←</span>
      <span>Back to projects</span>
    </button>

    <div class="detail-grid">
      <section class="detail-media reveal">
        <video
          v-if="project.video"
          class="detail-video"
          :src="project.video"
          autoplay
          muted
          loop
          playsinline
          preload="auto"
        ></video>
        <img v-else class="detail-image" :src="project.image" :alt="project.title" />
      </section>

      <section class="detail-info">
        <span class="detail-tag reveal">{{ project.tag }} • {{ project.year }}</span>
        <h1 class="detail-title reveal">{{ project.title }}</h1>
        <p class="detail-description reveal">{{ project.description }}</p>
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
  padding: max(20px, 2vw);
  display: flex;
  flex-direction: column;
  gap: max(16px, 1.6vw);
  overflow-y: auto;
}

.page-nav {
  flex: 0 0 auto;
}

.close-btn {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: max(8px, 0.5vw) max(14px, 0.9vw);
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 999px;
  color: #ffffff;
  font-family: inherit;
  font-size: max(0.72rem, 0.8vw);
  letter-spacing: 0.08em;
  cursor: pointer;
  transition: border-color 0.3s ease, color 0.3s ease;
}

.close-btn:hover {
  border-color: #ff0059;
  color: #ff0059;
}

.close-icon {
  transition: transform 0.3s ease;
}

.close-btn:hover .close-icon {
  transform: translateX(-3px);
}

.detail-grid {
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  gap: max(20px, 2.4vw);
  align-items: center;
}

.detail-media {
  position: relative;
  height: 100%;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.detail-image {
  width: 100%;
  height: 100%;
  max-height: min(78vh, 760px);
  object-fit: cover;
  display: block;
}

.detail-video {
  width: 100%;
  height: 100%;
  max-height: min(78vh, 760px);
  object-fit: contain;
  display: block;
}

.detail-info {
  display: flex;
  flex-direction: column;
  gap: max(12px, 1vw);
  padding-right: max(0px, 2vw);
}

.detail-tag {
  font-size: max(0.72rem, 0.8vw);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.6);
}

.detail-title {
  margin: 0;
  font-size: max(2rem, 3.4vw);
  font-weight: 400;
  line-height: 1.02;
  text-transform: uppercase;
  color: #ff0059;
}

.detail-description {
  margin: 0;
  font-size: max(0.95rem, 1.05vw);
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.82);
  max-width: 46ch;
}

@media (max-width: 860px) {
  .project-detail {
    position: relative;
    min-height: 100vh;
  }

  .detail-grid {
    grid-template-columns: 1fr;
    align-items: stretch;
    gap: clamp(20px, 5vw, 32px);
  }

  .detail-video,
  .detail-image {
    max-height: 60vh;
  }
}
</style>
