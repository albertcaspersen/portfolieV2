import { onBeforeUnmount, watch } from 'vue'

// Lerp-based smooth scroll for an overflow container. Hijacks wheel events only,
// so touch devices keep their native momentum scrolling untouched.
export function useSmoothScroll(targetRef, options = {}) {
  const lerp = options.lerp ?? 0.1
  const wheelMultiplier = options.wheelMultiplier ?? 1

  let el = null
  let eventEl = null
  let current = 0
  let target = 0
  let rafId = null
  let running = false

  const maxScroll = () => Math.max(0, el.scrollHeight - el.clientHeight)
  const clamp = (v) => Math.max(0, Math.min(v, maxScroll()))

  const tick = () => {
    current += (target - current) * lerp
    if (Math.abs(target - current) < 0.5) {
      current = target
      el.scrollTop = current
      running = false
      rafId = null
      return
    }
    el.scrollTop = current
    rafId = requestAnimationFrame(tick)
  }

  const onWheel = (event) => {
    // Nothing to scroll — let the event pass through (e.g. mobile/native areas).
    if (event.ctrlKey || maxScroll() <= 0 || !['auto', 'scroll'].includes(getComputedStyle(el).overflowY)) return
    event.preventDefault()
    // Firefox reports deltas in lines (deltaMode 1); normalise to pixels.
    const delta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY
    target = clamp(target + delta * wheelMultiplier)
    if (!running) {
      running = true
      rafId = requestAnimationFrame(tick)
    }
  }

  const detach = () => {
    if (rafId) cancelAnimationFrame(rafId)
    rafId = null
    running = false
    if (eventEl) eventEl.removeEventListener('wheel', onWheel)
    eventEl = null
    el = null
  }

  const attach = (node, eventNode) => {
    detach()
    el = node
    eventEl = eventNode
    if (!el || !eventEl) return
    current = target = el.scrollTop
    eventEl.addEventListener('wheel', onWheel, { passive: false })
  }

  // Re-sync internal position after the container is scrolled imperatively.
  const reset = () => {
    if (!el) return
    current = target = el.scrollTop
  }

  watch(
    [targetRef, options.eventTargetRef ?? targetRef],
    ([node, eventNode]) => attach(node, eventNode),
    { immediate: true, flush: 'post' }
  )
  onBeforeUnmount(detach)

  return { reset }
}
