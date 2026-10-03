<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import StaggeredMenu from './StaggeredMenu.vue'

const emit = defineEmits(['navigate'])
const router = useRouter()
const menuRef = ref(null)

const items = [
  { label: 'Home', ariaLabel: 'Gå til forsiden', link: '/' },
  { label: 'Projects', ariaLabel: 'Se projekter', link: '/projects' },
  { label: 'About', ariaLabel: 'Læs om mig', link: '/about' },
  { label: 'Contact', ariaLabel: 'Kom i kontakt', link: '/contact' },
]

const socialItems = [
  { label: 'Instagram', link: 'https://www.instagram.com/albert_caspersen/' },
  { label: 'LinkedIn', link: '#' },
  { label: 'GitHub', link: '#' },
]

const handleClick = (event) => {
  const anchor = event.target.closest('a.sm-panel-item')
  if (!anchor) return

  const to = anchor.getAttribute('href')
  if (!to || !to.startsWith('/')) return

  // Let a parent view intercept for custom transitions (e.g. HomeView).
  emit('navigate', event, to)
  menuRef.value?.closeMenu()

  if (event.defaultPrevented) return

  event.preventDefault()
  if (to !== router.currentRoute.value.path) router.push(to)
}
</script>

<template>
  <div class="site-nav" @click="handleClick">
    <StaggeredMenu
      ref="menuRef"
      :items="items"
      :social-items="socialItems"
      :display-socials="true"
      :display-item-numbering="true"
      position="right"
      :colors="['#FF0059', '#111111']"
      accent-color="#FF0059"
      menu-button-color="#FF0059"
      open-menu-button-color="#f1f1f1"
    />
  </div>
</template>

<style scoped>
.site-nav {
  position: fixed;
  inset: 0;
  z-index: 30;
  pointer-events: none;
}
</style>
