<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps({
  src: { type: String, required: true },
  revealX: { type: Number, default: 0.5 },
  revealY: { type: Number, default: 0.5 },
  active: { type: Boolean, default: false },
  // grow: radius expands from the pointer to fill the whole image over `duration`
  grow: { type: Boolean, default: false },
  duration: { type: Number, default: 0.8 }
})

const canvasRef = ref(null)
let gl = null
let program = null
let texture = null
let image = null
let positionBuffer = null
let texCoordBuffer = null
let animationFrame = null
let resizeObserver = null
let currentRevealX = 0.5
let currentRevealY = 0.5
let targetRevealX = 0.5
let targetRevealY = 0.5
let currentActive = 0
let targetActive = 0
let currentProgress = 0
let targetProgress = 0
let wasActive = false
let lastTime = 0
const mobileQuery = window.matchMedia('(max-width: 860px)')
let initialized = false

const vertexShaderSource = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  varying vec2 vUv;

  void main() {
    vUv = a_texCoord;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`

const fragmentShaderSource = `
  precision mediump float;
  uniform sampler2D uTexture;
  uniform vec2 uRevealPoint;
  uniform vec2 uResolution;
  uniform vec2 uImageSize;
  uniform float uActive;
  uniform float uRadius;
  varying vec2 vUv;

  float random(vec2 st) {
    return fract(sin(dot(st, vec2(12.9898, 78.233))) * 43758.5453123);
  }

  float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(random(i), random(i + vec2(1.0, 0.0)), u.x),
      mix(random(i + vec2(0.0, 1.0)), random(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  float fbm(vec2 st) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 3; i++) {
      value += amplitude * noise(st);
      st *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }

  void main() {
    float canvasAspect = uResolution.x / uResolution.y;
    float imageAspect = uImageSize.x / uImageSize.y;
    vec2 imageUv = vUv;

    if (imageAspect > canvasAspect) {
      float visibleWidth = canvasAspect / imageAspect;
      imageUv.x = (vUv.x - 0.5) * visibleWidth + 0.5;
    } else {
      float visibleHeight = imageAspect / canvasAspect;
      imageUv.y = (vUv.y - 0.5) * visibleHeight + 0.5;
    }

    vec4 color = texture2D(uTexture, clamp(imageUv, 0.0, 1.0));
    vec2 point = uRevealPoint;
    vec2 distanceUv = (vUv - point) * vec2(canvasAspect, 1.0);
    float distanceFromPointer = length(distanceUv);
    float noiseValue = fbm(vUv * 7.0 + vec2(4.0, 7.0));
    float detailNoise = fbm(vUv * 19.0 + vec2(11.0, 3.0));
    float radius = uRadius;
    float edge = radius + (noiseValue - 0.5) * 0.16 + (detailNoise - 0.5) * 0.06;
    float reveal = 1.0 - smoothstep(edge - 0.025, edge + 0.025, distanceFromPointer);
    reveal *= uActive;

    gl_FragColor = vec4(color.rgb, color.a * reveal);
  }
`

function createShader(type, source) {
  const shader = gl.createShader(type)
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }
  return shader
}

function init() {
  const canvas = canvasRef.value
  if (!canvas) return
  gl = canvas.getContext('webgl', { alpha: true, antialias: true })
  if (!gl) return

  const vertexShader = createShader(gl.VERTEX_SHADER, vertexShaderSource)
  const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource)
  if (!vertexShader || !fragmentShader) return

  program = gl.createProgram()
  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return

  const positions = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1])
  const texCoords = new Float32Array([0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0])
  positionBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW)
  texCoordBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW)

  image = new Image()
  image.onload = () => {
    texture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
    startAnimation()
  }
  image.src = props.src
  resizeObserver = new ResizeObserver(render)
  resizeObserver.observe(canvas)
}

function render() {
  if (!gl || !program || !texture || !canvasRef.value || !image) return
  const canvas = canvasRef.value
  const bounds = canvas.getBoundingClientRect()
  const dpr = window.devicePixelRatio || 1
  canvas.width = Math.max(1, Math.round(bounds.width * dpr))
  canvas.height = Math.max(1, Math.round(bounds.height * dpr))
  gl.viewport(0, 0, canvas.width, canvas.height)
  gl.clearColor(0, 0, 0, 0)
  gl.clear(gl.COLOR_BUFFER_BIT)
  gl.enable(gl.BLEND)
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
  gl.useProgram(program)

  const positionLocation = gl.getAttribLocation(program, 'a_position')
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
  gl.enableVertexAttribArray(positionLocation)
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)
  const texCoordLocation = gl.getAttribLocation(program, 'a_texCoord')
  gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer)
  gl.enableVertexAttribArray(texCoordLocation)
  gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0)

  gl.activeTexture(gl.TEXTURE0)
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.uniform1i(gl.getUniformLocation(program, 'uTexture'), 0)
  gl.uniform2f(gl.getUniformLocation(program, 'uRevealPoint'), currentRevealX, currentRevealY)
  gl.uniform2f(gl.getUniformLocation(program, 'uResolution'), canvas.width, canvas.height)
  gl.uniform2f(gl.getUniformLocation(program, 'uImageSize'), image.width, image.height)

  let radiusUniform = 0.27
  let activeUniform = currentActive
  if (props.grow) {
    const aspect = canvas.width / canvas.height
    let maxDist = 0
    const corners = [[0, 0], [1, 0], [0, 1], [1, 1]]
    for (const [cx, cy] of corners) {
      const dx = (currentRevealX - cx) * aspect
      const dy = currentRevealY - cy
      maxDist = Math.max(maxDist, Math.hypot(dx, dy))
    }
    const eased = 1 - Math.pow(1 - currentProgress, 3)
    radiusUniform = eased * (maxDist + 0.14)
    activeUniform = currentProgress > 0.0005 ? 1 : 0
  }

  gl.uniform1f(gl.getUniformLocation(program, 'uRadius'), radiusUniform)
  gl.uniform1f(gl.getUniformLocation(program, 'uActive'), activeUniform)
  gl.drawArrays(gl.TRIANGLES, 0, 6)
}

function startAnimation() {
  if (animationFrame) return

  lastTime = performance.now()

  const animate = () => {
    const now = performance.now()
    const dt = Math.min(0.05, (now - lastTime) / 1000)
    lastTime = now

    currentRevealX += (targetRevealX - currentRevealX) * 0.1
    currentRevealY += (targetRevealY - currentRevealY) * 0.1

    let progressSettled
    if (props.grow) {
      const step = dt / Math.max(0.0001, props.duration)
      const dir = targetProgress > currentProgress ? 1 : -1
      currentProgress = Math.min(1, Math.max(0, currentProgress + dir * step))
      progressSettled = Math.abs(targetProgress - currentProgress) < 0.0005
    } else {
      currentActive += (targetActive - currentActive) * 0.09
      progressSettled = Math.abs(targetActive - currentActive) < 0.001
    }

    render()

    const positionSettled =
      Math.abs(targetRevealX - currentRevealX) < 0.001 &&
      Math.abs(targetRevealY - currentRevealY) < 0.001

    if (!positionSettled || !progressSettled) {
      animationFrame = requestAnimationFrame(animate)
    } else {
      animationFrame = null
    }
  }

  animationFrame = requestAnimationFrame(animate)
}

watch(
  () => [props.revealX, props.revealY, props.active],
  () => {
    // Snap the reveal origin to the pointer the moment grow activates
    if (props.grow && props.active && !wasActive) {
      currentRevealX = props.revealX
      currentRevealY = props.revealY
    }
    wasActive = props.active
    targetRevealX = props.revealX
    targetRevealY = props.revealY
    targetActive = props.active ? 1 : 0
    targetProgress = props.active ? 1 : 0
    startAnimation()
  }
)

const initOnDesktop = () => {
  if (mobileQuery.matches || initialized) return
  initialized = true
  init()
}

onMounted(() => {
  initOnDesktop()
  mobileQuery.addEventListener('change', initOnDesktop)
})
onUnmounted(() => {
  mobileQuery.removeEventListener('change', initOnDesktop)
  resizeObserver?.disconnect()
  cancelAnimationFrame(animationFrame)
  if (texture && gl) gl.deleteTexture(texture)
  if (positionBuffer && gl) gl.deleteBuffer(positionBuffer)
  if (texCoordBuffer && gl) gl.deleteBuffer(texCoordBuffer)
  if (program && gl) gl.deleteProgram(program)
})
</script>

<template>
  <canvas ref="canvasRef" class="noise-wipe-image" aria-hidden="true" />
</template>

<style scoped>
.noise-wipe-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  pointer-events: none;
}

@media (max-width: 860px) {
  .noise-wipe-image {
    display: none;
  }
}
</style>
