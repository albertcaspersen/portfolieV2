// Warm the browser cache for images used across the portfolio.
const preloaded = new Map()

export const preloadImage = (src) => {
  if (!src || preloaded.has(src)) return

  const image = new Image()
  image.src = src
  preloaded.set(src, image)
}