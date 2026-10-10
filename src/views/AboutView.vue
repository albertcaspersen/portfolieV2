<script setup>
import { ref, onMounted } from 'vue'
import gsap from 'gsap'
import Navbar from '../components/Navbar.vue'
import NoiseWipeImage from '../components/NoiseWipeImage.vue'

const rootRef = ref(null)
const revealPoint = ref({ x: 0.5, y: 0.5 })
const imageHovering = ref(false)

const updateImageReveal = (event) => {
  const image = event.currentTarget
  const bounds = image.getBoundingClientRect()
  const x = event.clientX - bounds.left
  const y = event.clientY - bounds.top

  revealPoint.value = {
    x: Math.min(1, Math.max(0, x / bounds.width)),
    y: Math.min(1, Math.max(0, y / bounds.height))
  }
  imageHovering.value = true
}

const hideImageReveal = () => {
  imageHovering.value = false
}

onMounted(() => {
  gsap.fromTo(
    rootRef.value.querySelectorAll('.reveal'),
    { opacity: 0, y: 24 },
    { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out', stagger: 0.08, delay: 0.15 }
  )
})
</script>

<template>
  <div ref="rootRef" class="about-page">
    <Navbar class="page-nav reveal" />

    <main class="about-main">
      <div
        class="about-image reveal"
        @mousemove="updateImageReveal"
        @mouseleave="hideImageReveal"
      >
        <img src="/aboutPic/aboutmigpic.png" alt="Portrait of Albert Caspersen" />
        <NoiseWipeImage
          src="/aboutPic/aboutmigpicfarve.png"
          :reveal-x="revealPoint.x"
          :reveal-y="revealPoint.y"
          :active="imageHovering"
        />
      </div>

      <div class="about-content">
        <h1 class="headline reveal">
          Always somewhere in between <span class="accent">what if</span> and
          <span class="accent">why not</span>
        </h1>

        <div class="about-bottom">
          <div class="about-info reveal">
            <h2 class="about-label">About me</h2>
            <p class="about-bio">
           I’m a creative developer with a background in visual communication and coded design. I work somewhere between creative coding, 3D, motion and interaction, turning ideas into digital experiences. I like experimenting, trying things that might not work and seeing where they take me. Whether it’s an interactive website, a digital tool or something that’s hard to put a label on, I’m always curious to see what’s possible. I’m also a music producer, with years of experience in hip-hop and trap. Different disciplines, same curiosity for creating.
            </p>
          </div>

          <div class="what-i-do reveal">
            <h2 class="about-label">What I do</h2>
            <ul class="what-i-do-list">
              <li class="what-i-do-item">
                <span class="what-i-do-number">01</span>
                <span class="what-i-do-text">
                  <span class="what-i-do-title">Creative Development</span>
                  <span class="what-i-do-desc">Web, visuals &amp; interactive experiences</span>
                </span>
              </li>
              <li class="what-i-do-item">
                <span class="what-i-do-number">02</span>
                <span class="what-i-do-text">
                  <span class="what-i-do-title">3D &amp; Motion</span>
                  <span class="what-i-do-desc">Real-time scenes, animation &amp; motion design</span>
                </span>
              </li>
              <li class="what-i-do-item">
                <span class="what-i-do-number">03</span>
                <span class="what-i-do-text">
                  <span class="what-i-do-title">Interactive Experiences</span>
                  <span class="what-i-do-desc">Playful, responsive digital interactions</span>
                </span>
              </li>
              <li class="what-i-do-item">
                <span class="what-i-do-number">04</span>
                <span class="what-i-do-text">
                  <span class="what-i-do-title">Music Production</span>
                  <span class="what-i-do-desc">Hip-hop &amp; trap</span>
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
/* 12-column grid — everything scales uniformly with viewport width so the
   layout looks identical on 14", 16" and larger screens */
.about-page {
  position: fixed;
  inset: 0;
  background-color: #060606;
  color: #ffffff;
  padding: max(20px, 2vw);
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  grid-template-rows: 1fr;
  column-gap: max(8px, 1.4vw);
  overflow: hidden;
}

/* Main content spans the full grid and fills the viewport height */
.about-main {
  grid-column: 1 / -1;
  grid-row: 1;
  display: grid;
  grid-template-columns: subgrid;
  align-items: stretch;
  height: 100%;
}

/* Portrait — left columns, full height */
.about-image {
  grid-column: 1 / 6;
  grid-row: 1;
  position: relative;
  overflow: hidden;
}

.about-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  display: block;
  filter: grayscale(100%);
}

/* Right column — headline pinned top, about block pinned bottom */
.about-content {
  display: contents;
}

.about-bottom {
  grid-column: 6 / -1;
  grid-row: 1;
  align-self: end;
  display: grid;
  grid-template-columns: subgrid;
  align-items: stretch;
}

.headline {
  grid-column: 6 / 10;
  grid-row: 1;
  margin: 0;
  font-size: max(1.9rem, 3.0vw);
  line-height: 1.02;
  font-weight: 400;
  text-transform: uppercase;
  margin-top: -0.2em;

}

.accent {
  color: #ff0059;
}

.about-info {
  grid-column: 1 / 5;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.what-i-do {
  grid-column: 5 / -1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.about-label {
  margin: 0 0 max(10px, 0.9vw);
  color: #ff0059;
  font-size: max(0.8rem, 0.95vw);
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.about-bio {
  margin: 0;
  font-size: max(0.85rem, 1.05vw);
  line-height: 1.45;
  text-align: justify;
  color: #ffffff;
}

.what-i-do-list {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}

.what-i-do-item {
  display: flex;
  align-items: center;
  gap: max(12px, 0.9vw);
  padding: max(10px, 0.7vw) 0;
}

.what-i-do-item + .what-i-do-item {
  border-top: 1px solid #5a5a5a;
}

.what-i-do-number {
  color: #5a5a5a;
  font-size: max(1.6rem, 2.1vw);
  font-weight: 400;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.what-i-do-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.what-i-do-title {
  color: #ffffff;
  font-size: max(0.85rem, 1.0vw);
  font-weight: 600;
  line-height: 1.2;
}

.what-i-do-desc {
  color: #8a8a8a;
  font-size: max(0.72rem, 0.82vw);
  line-height: 1.3;
}

/* Tablet — collapse the grid into a stacked layout */
@media (max-width: 860px) {
  .about-page {
    position: relative;
    grid-template-rows: auto;
    overflow-y: auto;
  }

  .about-main {
    display: flex;
    flex-direction: column;
    gap: clamp(24px, 5vw, 40px);
    height: auto;
  }

  .about-image {
    width: 100%;
    max-width: min(460px, 100%);
    aspect-ratio: 3 / 4;
  }

  .about-image img {
    filter: none;
  }

  .headline {
    order: -1;
    margin-top: clamp(2rem, 7vh, 3.5rem);
    font-size: clamp(1.6rem, 6.9vw, 2.4rem);
  }

  .about-bio {
    font-size: clamp(0.85rem, 3.4vw, 1rem);
  }

  .what-i-do-title {
    font-size: clamp(0.9rem, 3.6vw, 1rem);
  }

  .what-i-do-desc {
    font-size: clamp(0.75rem, 3vw, 0.85rem);
  }

  .about-bottom {
    display: flex;
    flex-direction: column;
    gap: clamp(24px, 5vw, 40px);
  }
}
</style>
