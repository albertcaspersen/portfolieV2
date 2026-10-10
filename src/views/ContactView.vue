<script setup>
import { ref, onMounted } from 'vue'
import gsap from 'gsap'
import Navbar from '../components/Navbar.vue'
import ContactDanceMan from '../components/ContactDanceMan.vue'

const rootRef = ref(null)

onMounted(() => {
  gsap.fromTo(
    rootRef.value.querySelectorAll('.reveal'),
    { opacity: 0, y: 24 },
    { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out', stagger: 0.08, delay: 0.15 }
  )
})
</script>

<template>
  <div ref="rootRef" class="contact-page">
    <ContactDanceMan class="contact-scene" />
    <Navbar class="page-nav reveal" />

    <div class="contact-content">
      <h1 class="reveal headline">LET'S MAKE SOMETHING WORTH <span class="accent">DANCING</span> TO</h1>

      <div class="contact-details">
        <a class="reveal email" href="mailto:albertcaspersen@hotmail.com">albertcaspersen<span class="accent">@</span>hotmail.com</a>
        <a class="reveal phone" href="tel:+4550557144"><span class="accent">+</span>45 50 55 71 44</a>
      </div>
    </div>
  </div>
</template>

<style scoped>
.contact-page {
  position: fixed;
  inset: 0;
  background-color: #060606;
  color: #ffffff;
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  grid-template-rows: auto 1fr;
  align-items: start;
  column-gap: max(8px, 1.4vw);
  padding: max(20px, 2vw);
}

.contact-scene {
  z-index: 0;
}

.page-nav {
  grid-column: 1 / -1;
  grid-row: 1;
}

.contact-content {
  grid-column: 1 / -1;
  grid-row: 2;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
  position: relative;
  z-index: 1;
}

.accent {
  color: #FF0059;
}

.headline {
  font-size: clamp(2.5rem, 6.5vw, 6rem);
  font-weight: 400;
  line-height: 0.95;
  text-transform: uppercase;
  margin: 0;
  max-width: 20ch;
  margin-top: -0.17em;
}

.contact-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.email,
.phone {
  font-size: clamp(1.2rem, 2.6vw, 2rem);
  color: #ffffff;
  text-decoration: none;
  align-self: flex-start;
}

@media (max-width: 640px) {
  .headline {
    font-size: clamp(1.5rem, 5vw, 2.5rem);
    margin-top: 0.8rem;
  }
}
</style>
