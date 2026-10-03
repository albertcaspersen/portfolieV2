<template>
  <canvas ref="canvasRef" class="dance-canvas" />
  <div ref="cursorRef" class="cursor-circle" />
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import gsap from 'gsap'
import * as THREE from 'three'
import { RectAreaLight } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

const canvasRef = ref(null)
const cursorRef = ref(null)

let renderer, scene, camera, controls, mixer, animationId, clock, audio, audioContext, analyser, freqData
let cursorAnimationId
// Assigned inside onMounted once the scene exists.
let triggerContact = () => {}
let triggerProjects = () => {}
let setScreenImage = () => {}

defineExpose({
  triggerContact: (...args) => triggerContact(...args),
  triggerProjects: (...args) => triggerProjects(...args),
  setScreenImage: (...args) => setScreenImage(...args)
})

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
  const fogColor = 0xFFFFFF
  const fogTargetDensity = 0.0295
  scene.background = new THREE.Color(fogColor)
  scene.fog = new THREE.FogExp2(fogColor, 0)

  // Camera
  camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 1000)
  camera.position.set(0, 0, 286)

  controls = new OrbitControls(camera, canvas)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.screenSpacePanning = false
  controls.minDistance = 5
  controls.maxDistance = 500
  controls.maxPolarAngle = Math.PI * 0.9
  controls.target.set(-180, 0, 60)
  controls.update()

  // Lights
  const ambient = new THREE.AmbientLight(0xffffff, 0.0)
  scene.add(ambient)

  RectAreaLightUniformsLib.init()
  const wallGlowMaterial = new THREE.MeshStandardMaterial({ color: 0x120000, emissive: 0xf0772f, emissiveIntensity: 0, roughness: 0.1, metalness: 0, side: THREE.BackSide })
  const roomMaterials = [
    new THREE.MeshStandardMaterial({ color: 0x2472fc, roughness: 0.72, metalness: 0.03, side: THREE.BackSide }),
    new THREE.MeshStandardMaterial({ color: 0x2472fc, roughness: 0.72, metalness: 0.03, side: THREE.BackSide }),
    new THREE.MeshStandardMaterial({ color: 0x2472fc, roughness: 0.72, metalness: 0.03, side: THREE.BackSide }),
    new THREE.MeshStandardMaterial({ color: 0x2472fc, roughness: 0.72, metalness: 0.03, side: THREE.BackSide }),
    new THREE.MeshStandardMaterial({ color: 0x2472fc, roughness: 0.72, metalness: 0.03, side: THREE.BackSide }),
    wallGlowMaterial
  ]
  const roomCube = new THREE.Mesh(new RoundedBoxGeometry(35, 10.2, 2700, 12, 0.5), roomMaterials)
  roomCube.position.set(0, 2.5, 0)
  roomCube.receiveShadow = true
  scene.add(roomCube)

  const lampWallLight = new RectAreaLight(0x8A0096, 0, 370, 34)
  lampWallLight.position.set(0, 14, -44.9)
  lampWallLight.lookAt(0, 14, 0)
  scene.add(lampWallLight)

  const wallSpot = new THREE.SpotLight(0x8A0096, 0, 200, Math.PI / 5, 0.75, 2)
  wallSpot.position.set(0, 18, -32)
  wallSpot.target.position.set(13, -2, 0)
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
    new THREE.PlaneGeometry(374, 38),
    new THREE.MeshStandardMaterial({ color: 0x120000, emissive: 0xBBD686, emissiveIntensity: 0, roughness: 0.2, metalness: 0, side: THREE.DoubleSide })
  )
  lampWall.position.set(0, 14, -34.99)
  lampWall.lookAt(0, 14, 0)
  lampWall.castShadow = true
  lampWall.receiveShadow = true
  scene.add(lampWall)

  const carLights = new THREE.Group()

  const spotLight = new THREE.SpotLight(0x8A0096, 0, 250, Math.PI / 3.5, 0.22, 2)
  spotLight.position.set(70.22, 4, 152.5)
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
  lightBulb.visible = false
  carLights.add(lightBulb)

  const secondSpot = new THREE.SpotLight(0x8A0096, 0, 250, Math.PI / 3, 0.22, 1)
  secondSpot.position.set(0.2, 4, -64)
  secondSpot.target.position.set(0, 0, 23)
  secondSpot.castShadow = true
  secondSpot.shadow.mapSize.set(1024, 1024)
  secondSpot.shadow.camera.near = 0.5
  secondSpot.shadow.camera.far = 50
  secondSpot.shadow.focus = 1
  carLights.add(secondSpot)
  carLights.add(secondSpot.target)

  audio = new Audio('/musik/KAYTRANADA - Scared To Death (Audio) (1).mp3')
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
    window.removeEventListener('keydown', onKeyDown)
  }

  const onKeyDown = (e) => {
    if (e.key === 'e' || e.key === 'E') {
      resumeAudio()
    }
  }

  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('pointerdown', resumeAudio, { once: true })

  // Smooth (lerp) circular cursor follower.
  const cursor = { x: window.innerWidth / 1.5, y: window.innerHeight / 1.5 }
  const cursorTarget = { x: cursor.x, y: cursor.y }
  const onCursorMove = (e) => {
    cursorTarget.x = e.clientX
    cursorTarget.y = e.clientY
  }
  window.addEventListener('pointermove', onCursorMove)

  const secondLightBulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0xFFFF66, emissive: 0xFFFF66, emissiveIntensity: 0, metalness: 0, roughness: 0.5 })
  )
  secondLightBulb.position.copy(secondSpot.position)
  secondLightBulb.visible = false
  carLights.add(secondLightBulb)

  const spotLightMarker = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 24, 16),
    new THREE.MeshBasicMaterial({ color: 0xFF209E, depthTest: false, depthWrite: false })
  )
  spotLightMarker.renderOrder = 999
  spotLightMarker.castShadow = false
  spotLightMarker.receiveShadow = false
  spotLightMarker.visible = false
  carLights.add(spotLightMarker)

  const secondSpotMarker = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 24, 16),
    new THREE.MeshBasicMaterial({ color: 0x3A20FF, depthTest: false, depthWrite: false })
  )
  secondSpotMarker.renderOrder = 999
  secondSpotMarker.castShadow = false
  secondSpotMarker.receiveShadow = false
  secondSpotMarker.visible = false
  carLights.add(secondSpotMarker)

  const lightTargets = {
    spotLight: 0,
    secondSpot: 0,
    wallSpot: 40,
    lampWallLight: 8,
    lightBulbEmissive: 10,
    secondLightBulbEmissive: 10,
    lampWallEmissive: 2.1,
    wallGlowEmissive: 4
  }
  let lightFadeProgress = 0
  let lightFadeElapsed = 0
  const lightFadeDelay = 1.6
  const lightFadeDuration = 2.5
  const fogFadeDelay = 0.8

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
  modelHolder.position.set(-10, -2.6, 43)
  scene.add(modelHolder)

  loader.load('/model/dansemandV2.glb', (gltf) => {
    const model = gltf.scene
    model.scale.setScalar(155)
    model.position.set(0, 0, 230)
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

  const lightHolder = new THREE.Group()
  lightHolder.position.set(0, -3.4, 30)
  scene.add(lightHolder)
  lightHolder.add(carLights)

  /*const boomboxLoader = new GLTFLoader()
  boomboxLoader.load('/model/boombox_4k.glb', (gltf) => {
    const boombox = gltf.scene
    boombox.scale.setScalar(3)
    boombox.position.set(4, -2.6, 110)
    boombox.rotation.y = Math.PI / -0.45
    boombox.castShadow = true
    boombox.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })
    scene.add(boombox)
  })*/
/*
  const lightLoader = new FBXLoader()
  lightLoader.load('/model/street-light.fbx', (fbx) => {
    const lightModel = fbx
    lightModel.scale.setScalar(0.02)
    lightModel.position.set(3, 0, 200)
    lightModel.rotation.y = Math.PI / 0.285
    lightModel.castShadow = true
    lightModel.receiveShadow = true
    lightModel.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })
    lightHolder.add(lightModel)
  })
*/
  // Render loop
  let bassEnv = 0
  let contactMode = false
  let projectsMode = false
  const lightDim = { value: 1 }
  const screen = { brightness: 0 }

  // Load an image onto the emissive wall (the "screen").
  const screenTextureLoader = new THREE.TextureLoader()
  setScreenImage = (url) => {
    screenTextureLoader.load(url, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace
      tex.center.set(0.5, 0.5)
      tex.rotation = Math.PI
      lampWall.material.emissiveMap = tex
      lampWall.material.emissive.set(0xffffff)
      lampWall.material.needsUpdate = true
    })
  }

  // Ramp fog to full and lock the canvas, then run onComplete.
  triggerContact = ({ onComplete } = {}) => {
    if (contactMode) return
    contactMode = true
    controls.enabled = false
    canvas.style.pointerEvents = 'none'
    gsap.to(scene.fog, {
      density: 1.0145,
      duration: 1.2,
      ease: 'power2.inOut',
      onComplete
    })
  }

  // Move the camera and orbit target to frame the projects view.
  triggerProjects = ({ onComplete } = {}) => {
    projectsMode = true
    gsap.to(camera.position, {
      x: 0,
      y: 0,
      z: 5,
      duration: 2.0,
      ease: 'power3.out'
    })
    gsap.to(lightDim, {
      value: 0,
      duration: 1.6,
      ease: 'power2.inOut'
    })
    gsap.to(scene.fog, {
      density: 0,
      duration: 1.6,
      ease: 'power2.inOut'
    })
    gsap.to(screen, {
      brightness: 3,
      duration: 1.6,
      ease: 'power2.inOut'
    })
    gsap.to(controls.target, {
      x: 0,
      y: 0,
      z: 0,
      duration: 1.7,
      ease: 'power3.out',
      onUpdate: () => controls.update(),
      onComplete
    })
  }

  clock.start()
  function animate() {
    animationId = requestAnimationFrame(animate)
    const delta = Math.min(clock.getDelta(), 0.05)
    if (mixer) mixer.update(delta)

    controls.update()

    if (lightFadeProgress < 1) {
      lightFadeElapsed += delta
      const startFade = Math.max(0, lightFadeElapsed - lightFadeDelay)
      lightFadeProgress = Math.min(1, startFade / lightFadeDuration)
    }
    const fade = lightFadeProgress < 1 ? 1 - Math.pow(1 - lightFadeProgress, 2) : 1

    if (!contactMode && !projectsMode) {
      const fogStartFade = Math.max(0, lightFadeElapsed - fogFadeDelay)
      const fogProgress = Math.min(1, fogStartFade / lightFadeDuration)
      const fogFade = fogProgress < 1 ? 1 - Math.pow(1 - fogProgress, 2) : 1
      scene.fog.density = fogTargetDensity * fogFade
    }

    const litFade = fade * lightDim.value

    spotLight.intensity = lightTargets.spotLight * litFade
    secondSpot.intensity = lightTargets.secondSpot * litFade
    wallSpot.intensity = lightTargets.wallSpot * litFade
    lampWallLight.intensity = lightTargets.lampWallLight * litFade
    lightBulb.material.emissiveIntensity = lightTargets.lightBulbEmissive * litFade
    secondLightBulb.material.emissiveIntensity = lightTargets.secondLightBulbEmissive * litFade
    lampWall.material.emissiveIntensity = projectsMode
      ? screen.brightness
      : lightTargets.lampWallEmissive * litFade
    wallGlowMaterial.emissiveIntensity = lightTargets.wallGlowEmissive * litFade
    spotLightMarker.position.copy(spotLight.position)
    secondSpotMarker.position.copy(secondSpot.position)

    if (analyser && freqData) {
      analyser.getByteFrequencyData(freqData)
      // With fftSize 1024 @ ~44.1kHz each bin ≈ 43 Hz.
      // Bins 1–4 cover ~43–215 Hz = the kick/bass body.
      let bass = 0
      const bassStart = 1
      const bassEnd = 4
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
        bassEnv += (gated - bassEnv) * 0.09 // smooth release
      }

      // Emphasise peaks so quiet parts stay dark and hits pop.
      const level = Math.pow(bassEnv, 1.6)
      const bulbsOn = level > 0.02

      // Wall light reacts only to the gated bass kick (same envelope as
      // the other beat-reactive lights) so it pulses on the bass hits.
      const wallLevel = Math.pow(bassEnv, 1.6)

      // Keep the wall light 100% off until the music is actually playing.
      const musicPlaying = audio && !audio.paused && audioContext.state === 'running'
      const wallBase = musicPlaying ? 1 : 0
    }

    renderer.render(scene, camera)
  }
  animate()

  // Lerp the cursor circle towards the pointer every frame for smooth motion.
  function updateCursor() {
    cursor.x += (cursorTarget.x - cursor.x) * 0.1
    cursor.y += (cursorTarget.y - cursor.y) * 0.1
    if (cursorRef.value) {
      cursorRef.value.style.transform = `translate3d(${cursor.x}px, ${cursor.y}px, 0) translate(-50%, -50%)`
    }
    cursorAnimationId = requestAnimationFrame(updateCursor)
  }
  updateCursor()

  window.addEventListener('resize', resize)

  onBeforeUnmount(() => {
    cancelAnimationFrame(animationId)
    cancelAnimationFrame(cursorAnimationId)
    renderer.dispose()
    controls.dispose()
    window.removeEventListener('resize', resize)
    window.removeEventListener('pointermove', onCursorMove)
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('pointerdown', resumeAudio)
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

.cursor-circle {
  position: fixed;
  top: 0;
  left: 0;
  width: 28px;
  height: 28px;
  border: 2px solid #ffffff;
  border-radius: 50%;
  pointer-events: none;
  z-index: 9999;
  will-change: transform;
}
</style>
