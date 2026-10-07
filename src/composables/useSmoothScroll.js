import { onBeforeUnmount, watch } from 'vue'

// Lerp-based smooth scroll for an overflow container. Hijacks wheel events only,
// so touch devices keep their native momentum scrolling untouched.
export function useSmoothScroll(targetRef, options = {}) {
  const lerp = options.lerp ?? 0.1
  const wheelMultiplier = options.wheelMultiplier ?? 1
  const horizontal = options.axis === 'x'
  const scrollProperty = horizontal ? 'scrollLeft' : 'scrollTop'

  let el = null
  let eventEl = null
  let current = 0
  let target = 0
  let rafId = null
  let running = false

  const maxScroll = () => Math.max(0, horizontal ? el.scrollWidth - el.clientWidth : el.scrollHeight - el.clientHeight)
  const clamp = (v) => Math.max(0, Math.min(v, maxScroll()))

  const tick = () => {
    target = clamp(target)
    current += (target - current) * lerp
    if (Math.abs(target - current) < 0.5) {
      current = target
      el[scrollProperty] = current
      running = false
      rafId = null
      return
    }
    el[scrollProperty] = current
    rafId = requestAnimationFrame(tick)
  }

  const scrollTo = (position) => {
    if (!el) return
    if (!running) current = el[scrollProperty]
    target = clamp(position)
    if (!running) {
      running = true
      rafId = requestAnimationFrame(tick)
    }
  }

  const onWheel = (event) => {
    // Nothing to scroll — let the event pass through (e.g. mobile/native areas).
    const overflow = getComputedStyle(el)[horizontal ? 'overflowX' : 'overflowY']
    if (event.ctrlKey || maxScroll() <= 0 || !['auto', 'scroll'].includes(overflow)) return
    event.preventDefault()
    if (!running) current = target = el[scrollProperty]
    const wheelDelta = horizontal && Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
    // Firefox reports deltas in lines (deltaMode 1); normalise to pixels.
    const delta = event.deltaMode === 1 ? wheelDelta * 16 : wheelDelta
    scrollTo(target + delta * wheelMultiplier)
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
    current = target = el[scrollProperty]
    eventEl.addEventListener('wheel', onWheel, { passive: false })
  }

  // Re-sync internal position after the container is scrolled imperatively.
  const reset = () => {
    if (!el) return
    current = target = el[scrollProperty]
  }

  watch(
    [targetRef, options.eventTargetRef ?? targetRef],
    ([node, eventNode]) => attach(node, eventNode),
    { immediate: true, flush: 'post' }
  )
  onBeforeUnmount(detach)

  return { reset, scrollTo }
}
