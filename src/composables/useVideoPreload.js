// Warms the browser cache for project videos while the user is still on the
// grid, so the detail page can start playing without a visible loading delay.
// Detached <video preload="auto"> elements are kept at module scope so the
// browser keeps buffering them and they survive route changes.
const preloaded = new Map()

export const preloadVideo = (src) => {
  if (!src || preloaded.has(src)) return
  const video = document.createElement('video')
  video.preload = 'auto'
  video.muted = true
  video.src = src
  video.load()
  preloaded.set(src, video)
}
