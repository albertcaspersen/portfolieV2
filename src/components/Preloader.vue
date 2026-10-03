<script setup>
import { ref, watch, onBeforeUnmount } from 'vue'
import gsap from 'gsap'

const props = defineProps({
  progress: { type: Number, default: 0 },
  done: { type: Boolean, default: false }
})
const emit = defineEmits(['complete'])

const rootRef = ref(null)
const visible = ref(true)
const displayProgress = ref(0)
// Tweenet proxy, så tallet glider i stedet for at hoppe mellem asset-milepæle.
const progressProxy = { value: 0 }

const tweenTo = (value, duration) => {
  gsap.to(progressProxy, {
    value,
    duration,
    ease: 'power1.out',
    onUpdate: () => {
      displayProgress.value = Math.round(progressProxy.value)
    }
  })
}

watch(() => props.progress, (value) => {
  tweenTo(Math.min(value, props.done ? 100 : 99), 0.6)
})

watch(() => props.done, (isDone) => {
  if (!isDone) return
  gsap.to(progressProxy, {
    value: 100,
    duration: 0.4,
    ease: 'power1.out',
    onUpdate: () => {
      displayProgress.value = Math.round(progressProxy.value)
    },
    onComplete: () => {
      gsap.to(rootRef.value, {
        opacity: 0,
        duration: 0.7,
        delay: 0.25,
        ease: 'power2.inOut',
        onComplete: () => {
          visible.value = false
          emit('complete')
        }
      })
    }
  })
})

onBeforeUnmount(() => {
  gsap.killTweensOf(progressProxy)
  if (rootRef.value) gsap.killTweensOf(rootRef.value)
})
</script>

<template>
  <div v-if="visible" ref="rootRef" class="preloader">
    <div class="preloader-percent">{{ displayProgress }}%</div>
    <div class="preloader-bar">
      <div class="preloader-bar-fill" :style="{ width: displayProgress + '%' }" />
    </div>
  </div>
</template>

<style scoped>
.preloader {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: #030303;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 16vh;
}

.preloader-percent {
  color: #FF0059;
  font-weight: 500;
  font-size: clamp(3rem, 8vw, 6rem);
  letter-spacing: -0.02em;
  line-height: 1;
}

.preloader-bar {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.08);
}

.preloader-bar-fill {
  height: 100%;
  background: #FF0059;
}
</style>
