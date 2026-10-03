<template>
  <canvas ref="canvasRef" class="dance-canvas" />
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three'
import { RectAreaLight } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

const canvasRef = ref(null)

let renderer, scene, camera, controls, mixer, animationId, clock, audio, audioContext, analyser, freqData

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
  camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 1000)
  camera.position.set(-10, 13.2, 18.5)

  controls = new OrbitControls(camera, canvas)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.screenSpacePanning = false
  controls.minDistance = 5
  controls.maxDistance = 500
  controls.maxPolarAngle = Math.PI * 0.9
  controls.target.set(0, 0, 0)
  controls.update()

  // Lights
  const ambient = new THREE.AmbientLight(0xffffff, 0.2)
  scene.add(ambient)

  RectAreaLightUniformsLib.init()
  const roomMaterials = [
    new THREE.MeshStandardMaterial({ color: 0x111821, roughness: 0.72, metalness: 0.03, side: THREE.BackSide }),
    new THREE.MeshStandardMaterial({ color: 0x111821, roughness: 0.72, metalness: 0.03, side: THREE.BackSide }),
    new THREE.MeshStandardMaterial({ color: 0x111821, roughness: 0.72, metalness: 0.03, side: THREE.BackSide }),
    new THREE.MeshStandardMaterial({ color: 0x111821, roughness: 0.72, metalness: 0.03, side: THREE.BackSide }),
    new THREE.MeshStandardMaterial({ color: 0x111821, roughness: 0.72, metalness: 0.03, side: THREE.BackSide }),
    new THREE.MeshStandardMaterial({ color: 0x510038, emissive: 0x510038, emissiveIntensity: 4, roughness: 0.1, metalness: 0, side: THREE.BackSide })
  ]
  const roomCube = new THREE.Mesh(new RoundedBoxGeometry(70, 33.2, 400, 12, 8), roomMaterials)
  roomCube.position.set(0, 14, 0)
  roomCube.receiveShadow = true
  scene.add(roomCube)

  const lampWallLight = new RectAreaLight(0x701CFF, 208, 70, 34)
  lampWallLight.position.set(0, 14, -34.9)
  lampWallLight.lookAt(0, 14, 0)
  scene.add(lampWallLight)

  const wallSpot = new THREE.SpotLight(0x510038, 7, 200, Math.PI / 5, 0.75, 2)
  wallSpot.position.set(0, 18, -32)
  wallSpot.target.position.set(10, -0.5, -1)
  wallSpot.castShadow = true
  wallSpot.shadow.mapSize.set(2048, 2048)
  wallSpot.shadow.camera.near = 1
  wallSpot.shadow.camera.far = 220
  wallSpot.shadow.camera.fov = 55
  wallSpot.shadow.bias = -0.001
  wallSpot.shadow.radius = 1.5
  wallSpot.penumbra = 0.8
  scene.add(wallSpot)
  scene.add(wallSpot.target)

  const lampWall = new THREE.Mesh(
    new THREE.PlaneGeometry(74, 38),
    new THREE.MeshStandardMaterial({ color: 0xFF601C, emissive: 0x701CFF, emissiveIntensity: 23, roughness: 0.2, metalness: 0, side: THREE.DoubleSide })
  )
  lampWall.position.set(0, 14, -34.99)
  lampWall.lookAt(0, 14, 0)
  lampWall.receiveShadow = true
  scene.add(lampWall)

  // Static top-down spotlight on the models (does not react to music).
  const topLight = new THREE.SpotLight(0x63BE32, 0, 80, Math.PI / 4, 1, 1.2)
  topLight.position.set(12, 11, -41)
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

  const carLights = new THREE.Group()

  const spotLight = new THREE.SpotLight(0xFF209E, 0, 50, Math.PI / 6, 0.22, 1)
  spotLight.position.set(7.22, -1.6, 0.2)
  spotLight.target.position.set(0, 0, 0)
  spotLight.castShadow = true
  spotLight.shadow.mapSize.set(1024, 1024)
  spotLight.shadow.camera.near = 0.5
  spotLight.shadow.camera.far = 50
  spotLight.shadow.focus = 1
  carLights.add(spotLight)
  carLights.add(spotLight.target)

  const lightBulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0xFFFF66, emissive: 0xFFFF66, emissiveIntensity: 0, metalness: 0, roughness: 0.5 })
  )
  lightBulb.position.copy(spotLight.position)
  carLights.add(lightBulb)

  const secondSpot = new THREE.SpotLight(0x3A20FF, 0, 50, Math.PI / 6, 0.22, 1)
  secondSpot.position.set(7.2, -1.6, -2)
  secondSpot.target.position.set(0, 0, -2)
  secondSpot.castShadow = false
  carLights.add(secondSpot)
  carLights.add(secondSpot.target)

  audio = new Audio('/musik/BNYX, Clara La San - TELEPATHY LOVE (Visualizer).mp3')
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

  const secondLightBulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0xFFFF66, emissive: 0xFFFF66, emissiveIntensity: 0, metalness: 0, roughness: 0.5 })
  )
  secondLightBulb.position.copy(secondSpot.position)
  carLights.add(secondLightBulb)

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(222, 222),
    new THREE.MeshStandardMaterial({ color: 0x2F2F2F, roughness: 0.8, metalness: 0.1 })
  )
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -3.59
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

  // Parent the lights to the car so they always follow it when moved.
  // Cancel the car's scale so the bulbs keep their original size, then
  // place each light at a fixed offset in the car's local frame (the
  // offset is derived from where the lights were originally authored
  // relative to the car's reference position 10,-2,-1).
  carHolder.add(carLights)
  carLights.scale.setScalar(1 / carHolder.scale.x)
  const carRefPos = new THREE.Vector3(10, -2, -1)
  const invCarRot = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(0, -carHolder.rotation.y, 0)
  )
  const placeCarLight = (obj, wx, wy, wz) => {
    obj.position.set(wx, wy, wz).sub(carRefPos).applyQuaternion(invCarRot)
  }
  placeCarLight(spotLight, 7.22, -1.6, 0.2)
  placeCarLight(spotLight.target, 0, 0, 0)
  placeCarLight(lightBulb, 7.22, -1.6, 0.2)
  placeCarLight(secondSpot, 7.2, -1.6, -2)
  placeCarLight(secondSpot.target, 0, 0, -2)
  placeCarLight(secondLightBulb, 7.2, -1.6, -2)

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
    carHolder.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true
      }
    })
  })

  // Render loop
  let bassEnv = 0
  function animate() {
    animationId = requestAnimationFrame(animate)
    const delta = clock.getDelta()
    if (mixer) mixer.update(delta)

    controls.update()

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
    controls.dispose()
    window.removeEventListener('resize', resize)
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
