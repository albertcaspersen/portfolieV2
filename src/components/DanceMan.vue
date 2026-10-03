<template>
  <canvas ref="canvasRef" class="dance-canvas" />
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const canvasRef = ref(null)

let renderer, scene, camera, mixer, animationId, clock, audio, audioContext, analyser, freqData
let mouseTargetX = 0
let mouseTargetY = 0
let mouseCurrentX = 0
let mouseCurrentY = 0

onMounted(() => {
  const canvas = canvasRef.value
  const parent = canvas.parentElement

  // Renderer
  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  resize()

  // Scene
  scene = new THREE.Scene()

  // Camera
  camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 100)
  camera.position.set(-10, 13.2, 18.5)
  camera.lookAt(0, 0, 0)

  // Lights
  const ambient = new THREE.AmbientLight(0xffffff, 0.9)
  scene.add(ambient)

  // Static top-down spotlight on the models (does not react to music).
  const topLight = new THREE.SpotLight(0x888888, 0, 80, Math.PI / 4, 1, 1.2)
  topLight.position.set(12, 11, 21)
  topLight.target.position.set(3, 2, -0.5)
  topLight.castShadow = true
  topLight.shadow.mapSize.set(1024, 1024)
  topLight.shadow.camera.near = 1
  topLight.shadow.camera.far = 50
  topLight.shadow.bias = -0.0005
  topLight.shadow.radius = 18
  topLight.penumbra = 1
  scene.add(topLight)
  scene.add(topLight.target)

  const spotLight = new THREE.SpotLight(0xFF209E, 0, 50, Math.PI / 6, 0.22, 1)
  spotLight.position.set(7.22, -1.6, 0.2)
  spotLight.target.position.set(0, 0, 0)
  spotLight.castShadow = true
  spotLight.shadow.mapSize.set(1024, 1024)
  spotLight.shadow.camera.near = 0.5
  spotLight.shadow.camera.far = 50
  spotLight.shadow.focus = 1
  scene.add(spotLight)
  scene.add(spotLight.target)

  const lightBulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0xFFFF66, emissive: 0xFFFF66, emissiveIntensity: 0, metalness: 0, roughness: 0.5 })
  )
  lightBulb.position.copy(spotLight.position)
  scene.add(lightBulb)

  const secondSpot = new THREE.SpotLight(0x3A20FF, 0, 50, Math.PI / 6, 0.22, 1)
  secondSpot.position.set(7.2, -1.6, -2)
  secondSpot.target.position.set(0, 0, -2)
  secondSpot.castShadow = false
  scene.add(secondSpot)
  scene.add(secondSpot.target)

  audio = new Audio('/musik/Viuta - Never Die.mp3')
  audio.crossOrigin = 'anonymous'
  audio.loop = true
  audio.volume = 0.65
  audio.muted = false

  audioContext = new (window.AudioContext || window.webkitAudioContext)()
  const source = audioContext.createMediaElementSource(audio)
  analyser = audioContext.createAnalyser()
  analyser.fftSize = 1024
  analyser.smoothingTimeConstant = 0
  source.connect(analyser)
  analyser.connect(audioContext.destination)
  freqData = new Uint8Array(analyser.frequencyBinCount)

  const resumeAudio = async () => {
    if (audioContext.state === 'suspended') {
      await audioContext.resume()
    }
    try {
      await audio.play()
    } catch (err) {
      // fallback: user interaction may still be required
    }
    window.removeEventListener('pointerdown', resumeAudio)
  }

  window.addEventListener('pointerdown', resumeAudio, { once: true })

  const onPointerMove = (event) => {
    const rect = canvas.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width - 0.5
    const y = (event.clientY - rect.top) / rect.height - 0.5
    const maxX = 1.8
    const maxY = 1.2
    mouseTargetX = x * maxX
    mouseTargetY = -y * maxY
  }

  window.addEventListener('pointermove', onPointerMove)

  const secondLightBulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0xFFFF66, emissive: 0xFFFF66, emissiveIntensity: 0, metalness: 0, roughness: 0.5 })
  )
  secondLightBulb.position.copy(secondSpot.position)
  scene.add(secondLightBulb)

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(222, 222),
    new THREE.MeshStandardMaterial({ color: 0x2F2F2F, roughness: 0.8, metalness: 0.1 })
  )
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -2.59
  ground.receiveShadow = true
  scene.add(ground)

  /*const grid = new THREE.GridHelper(12, 12, 0x999999, 0x999999)
  grid.position.y = -2.589
  grid.material.opacity = 0.45
  grid.material.transparent = true
  scene.add(grid)*/

  // Load model
  clock = new THREE.Clock()
  const loader = new GLTFLoader()
  const modelHolder = new THREE.Group()
  modelHolder.position.set(0, -2.6, 0)
  scene.add(modelHolder)

  loader.load('/model/dansemandV2.glb', (gltf) => {
    const model = gltf.scene
    model.scale.setScalar(155)
    model.position.set(0, 0, 0)
    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })
    modelHolder.add(model)

    // Play all animations if available
    if (gltf.animations.length > 0) {
      mixer = new THREE.AnimationMixer(model)
      mixer.timeScale = 0.5
      gltf.animations.forEach((clip) => {
        mixer.clipAction(clip).play()
      })
    }
  })

  const carLoader = new GLTFLoader()
  const carHolder = new THREE.Group()
  carHolder.position.set(10, -2, -1)
  carHolder.rotation.y = Math.PI / 0.285
  carHolder.scale.setScalar(2.4)

  const carShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10),
    new THREE.ShadowMaterial({ opacity: 0.28 })
  )
  carShadow.rotation.x = -Math.PI / 2
  carShadow.position.set(0, -0.59, 0)
  carShadow.receiveShadow = true
  carHolder.add(carShadow)

  const carContact = new THREE.Mesh(
    new THREE.CircleGeometry(3.8, 32),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.06 })
  )
  carContact.rotation.x = -Math.PI / 2
  carContact.position.set(0, -0.588, 0)
  carHolder.add(carContact)

  scene.add(carHolder)

  carLoader.load('/model/130.glb', (gltf) => {
    const car = gltf.scene
    car.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })
    carHolder.add(car)
  })

  // Render loop
  let bassEnv = 0
  function animate() {
    animationId = requestAnimationFrame(animate)
    const delta = clock.getDelta()
    if (mixer) mixer.update(delta)

    // Smooth mouse-driven camera pan.
    mouseCurrentX += (mouseTargetX - mouseCurrentX) * 0.02
    mouseCurrentY += (mouseTargetY - mouseCurrentY) * 0.02
    camera.position.x = -10 + mouseCurrentX
    camera.position.y = 13.2 + mouseCurrentY
    camera.lookAt(0, 0, 0)

    if (analyser && freqData) {
      analyser.getByteFrequencyData(freqData)
      // With fftSize 1024 @ ~44.1kHz each bin ≈ 43 Hz.
      // Bins 1–2 cover ~43–129 Hz = only the kick fundamental.
      let bass = 0
      const bassStart = 1
      const bassEnd = 2
      for (let i = bassStart; i <= bassEnd; i += 1) {
        bass += freqData[i]
      }
      bass /= (bassEnd - bassStart + 1)
      const bassNorm = bass / 255 // 0..1

      // Loudness gate: ignore anything below this level so only strong
      // kicks trigger the lights. Raise to require an even louder hit.
      const bassFloor = 0.65
      const gated = bassNorm < bassFloor ? 0 : (bassNorm - bassFloor) / (1 - bassFloor)

      // Envelope follower: fast attack, slow release for a punchy pulse.
      if (gated > bassEnv) {
        bassEnv = gated // instant attack on a hit
      } else {
        bassEnv += (gated - bassEnv) * 0.07 // smooth release
      }

      // Emphasise peaks so quiet parts stay dark and hits pop.
      const level = Math.pow(bassEnv, 1.6)
      const bulbsOn = level > 0.02

      spotLight.intensity = level * 420
      secondSpot.intensity = level * 420
      lightBulb.material.emissiveIntensity = bulbsOn ? 10 : 0
      secondLightBulb.material.emissiveIntensity = bulbsOn ? 10 : 0
    }

    renderer.render(scene, camera)
  }
  animate()

  window.addEventListener('resize', resize)

  onBeforeUnmount(() => {
    cancelAnimationFrame(animationId)
    renderer.dispose()
    window.removeEventListener('resize', resize)
    window.removeEventListener('pointermove', onPointerMove)
  })
})

function resize() {
  const canvas = canvasRef.value
  if (!canvas) return
  const w = canvas.parentElement.clientWidth
  const h = canvas.parentElement.clientHeight
  renderer.setSize(w, h, false)
  if (camera) {
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
}
</script>

<style scoped>
.dance-canvas {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
