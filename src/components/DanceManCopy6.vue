<template>
  <canvas ref="canvasRef" class="dance-canvas" :class="{ interacted: hasInteracted }" />
  <div ref="cursorRef" class="cursor-circle" :class="{ holding: isHolding, interacted: hasInteracted, muted: isMuted }">
    <svg class="cursor-progress" viewBox="0 0 36 36" aria-hidden="true">
      <circle cx="18" cy="18" r="16" />
    </svg>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import gsap from 'gsap'
import * as THREE from 'three'

import { RectAreaLight } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'

const canvasRef = ref(null)
const cursorRef = ref(null)
const hasInteracted = ref(false)
const isMuted = ref(false)
const isHolding = ref(false)

const emit = defineEmits(['progress', 'loaded'])

let renderer, scene, camera, mixer, animationId, clock, audio, audioContext, analyser, freqData
let loadingManager
let cursorAnimationId
let holdTimer
let isDisposed = false
let onKeyDown = () => {}
let onKeyUp = () => {}
let startHold = () => {}
let cancelHold = () => {}
let toggleMute = () => {}
let onCursorMove = () => {}
let lightDim = { value: 1 }
let interiorDim = { value: 1 }
// Assigned inside onMounted once the scene exists.
let triggerContact = () => {}
let triggerProjects = () => {}
let setScreenImage = () => {}
let startIntro = () => {}

defineExpose({
  triggerContact: (...args) => triggerContact(...args),
  triggerProjects: (...args) => triggerProjects(...args),
  setScreenImage: (...args) => setScreenImage(...args),
  startIntro: (...args) => startIntro(...args)
})

onBeforeUnmount(() => {
  isDisposed = true
  cancelAnimationFrame(animationId)
  cancelAnimationFrame(cursorAnimationId)

  window.removeEventListener('resize', resize)
  window.removeEventListener('pointermove', onCursorMove)
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
  window.removeEventListener('pointerdown', startHold)
  window.removeEventListener('pointerup', cancelHold)
  window.removeEventListener('pointercancel', cancelHold)
  window.removeEventListener('pointerdown', toggleMute)
  clearTimeout(holdTimer)

  gsap.killTweensOf(scene)
  gsap.killTweensOf(lightDim)
  gsap.killTweensOf(interiorDim)

  if (mixer) mixer.stopAllAction()
  if (audio) {
    audio.pause()
    audio.removeAttribute('src')
    audio.load()
  }
  if (audioContext && audioContext.state !== 'closed') audioContext.close()

  scene?.traverse((object) => {
    if (!object.isMesh) return
    object.geometry?.dispose()
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    materials.forEach((material) => {
      if (!material) return
      Object.values(material).forEach((value) => {
        if (value?.isTexture) value.dispose()
      })
      material.dispose()
    })
  })

  renderer?.renderLists.dispose()
  renderer?.forceContextLoss()
  renderer?.dispose()
  renderer = null
  scene = null
})

onMounted(() => {
  isDisposed = false
  const canvas = canvasRef.value

  // Tracker for reelle assets (models + lyd), så preloaderen viser reel fremgang.
  loadingManager = new THREE.LoadingManager()
  loadingManager.onProgress = (url, loaded, total) => {
    if (isDisposed) return
    emit('progress', total > 0 ? Math.round((loaded / total) * 100) : 0)
  }
  loadingManager.onLoad = () => {
    if (isDisposed) return
    emit('progress', 100)
    emit('loaded')
  }
  loadingManager.onError = (url) => {
    // three.js kalder selv itemEnd ved fejl, s\u00e5 preloaderen l\u00e5ser ikke fast.
    console.warn('Kunne ikke indl\u00e6se asset:', url)
  }

  // Renderer
  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  resize()

  // Scene
  scene = new THREE.Scene()
  const fogColor = 0xFF0059
  const fogTargetDensity = 0.0135
  scene.background = new THREE.Color(fogColor)
  scene.fog = new THREE.FogExp2(fogColor, 0)

  // Camera
  camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 1000)
  const cameraStartPosition = new THREE.Vector3(10, 1, 105)
  const cameraTarget = new THREE.Vector3(-5.5, 0, 88)

  // Start kameraet lidt til venstre (roteret om target); glid ind når introen trigges.
  const introOffset = cameraStartPosition.clone().sub(cameraTarget)
  introOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(18))
  camera.position.copy(cameraTarget).add(introOffset)
  camera.lookAt(cameraTarget)

  // Introen holdes tilbage til preloaderen er væk, så den ikke spiller bag loaderen.
  let introStarted = false
  startIntro = () => {
    if (introStarted || isDisposed) return
    introStarted = true
    gsap.to(camera.position, {
      x: cameraStartPosition.x,
      y: cameraStartPosition.y,
      z: cameraStartPosition.z,
      duration: 2.6,
      delay: 0.3,
      ease: 'power2.out',
      onUpdate: () => camera.lookAt(cameraTarget)
    })
  }

  // Lights
  RectAreaLightUniformsLib.init()
  const wallGlowMaterial = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x000000, emissiveIntensity: 0, roughness: 0.1, metalness: 0, side: THREE.BackSide })
  const roomMaterials = [
    new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.72, metalness: 0.03, side: THREE.BackSide }),
    new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.72, metalness: 0.03, side: THREE.BackSide }),
    new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.72, metalness: 0.03, side: THREE.BackSide }),
    new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.72, metalness: 0.03, side: THREE.BackSide }),
    new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.72, metalness: 0.03, side: THREE.BackSide }),
    wallGlowMaterial
  ]

  // roomCube må ikke belyses af interiorLight; view-space positionen opdateres hver frame,
  // så room-shaderen kan nulstille netop det ene punktlys (forward-rendereren kan ikke
  // ekskludere lys pr. objekt via layers).
  const roomExcludeLightPos = new THREE.Vector3(1e6, 1e6, 1e6)
  const excludeInteriorFromRoom = (material) => {
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uExcludeLightPos = { value: roomExcludeLightPos }
      shader.fragmentShader = 'uniform vec3 uExcludeLightPos;\n' + shader.fragmentShader
      // #include er endnu ikke udfoldet her, så vi inliner chunken med skip-betingelsen.
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <lights_fragment_begin>',
        THREE.ShaderChunk.lights_fragment_begin.replace(
          'getPointLightInfo( pointLight, geometryPosition, directLight );',
          'getPointLightInfo( pointLight, geometryPosition, directLight );\n\t\tif ( distance( pointLight.position, uExcludeLightPos ) < 0.001 ) directLight.color = vec3( 0.0 );'
        )
      )
    }
  }
  roomMaterials.forEach(excludeInteriorFromRoom)
  const roomHeight = 14.2
  const roomDepth = 270
  // Mange segmenter langs z + højden, så bølgen bliver blød i stedet for kantet.
  const roomGeometry = new THREE.BoxGeometry(45, roomHeight, roomDepth, 2, 12, 100)
  // Gem de u-deformerede positioner, så bølgen kan genberegnes ud fra musikken.
  const roomBasePositions = roomGeometry.attributes.position.array.slice()
  const roomPos = roomGeometry.attributes.position
  const roomHalfH = roomHeight / 2
  // phase = fremdrift (flyder når musik spiller), pulse = bas-niveau (0 = statisk grundform).
  function updateRoomWaves(phase, pulse) {
    const base = roomBasePositions
    const amp = 1 + pulse * 1.2
    for (let i = 0; i < roomPos.count; i++) {
      const ix = i * 3
      const bx = base[ix]
      const by = base[ix + 1]
      const bz = base[ix + 2]
      const t = THREE.MathUtils.clamp((by + roomHalfH) / roomHeight, 0, 1)
      const ease = t * t // 0 ved gulvet, vokser op mod loftet
      const wave = Math.sin(bz * 0.09 + phase) * 3.2 + Math.sin(bz * 0.031 + 1.3 + phase * 0.5) * 4.5
      // Ekstra bølge kun til væggene, varierer også med højden for et mere organisk look.
      const wallWave = Math.sin(bz * 0.15 + by * 0.45 + phase * 1.2) * 3.0 + Math.sin(bz * 0.052 + 2.1) * 3.4
      // Begræns hvor langt loftet må dykke ned, så bølger ikke hænger for lavt.
      let dy = wave * ease * 0.7 * amp
      if (dy < 0) dy = Math.max(dy * 0.45, -1.6)
      roomPos.setXYZ(
        i,
        bx + Math.sign(bx || 1) * (wave * 0.6 + wallWave) * ease * amp,
        by + dy,
        bz
      )
    }
    roomPos.needsUpdate = true
    roomGeometry.computeVertexNormals()
  }
  // Statisk grundform indtil musikken starter.
  updateRoomWaves(0, 0)
  const roomCube = new THREE.Mesh(roomGeometry, roomMaterials)
  roomCube.position.set(0, 4.5, 0)
  roomCube.receiveShadow = true
  scene.add(roomCube)

  const lampWallLight = new RectAreaLight(0x000000, 0, 370, 34)
  lampWallLight.position.set(0, 14, -44.9)
  lampWallLight.lookAt(0, 14, 0)
  scene.add(lampWallLight)

  const lampWall = new THREE.Mesh(
    new THREE.PlaneGeometry(374, 38),
    new THREE.MeshStandardMaterial({ color: 0x120000, emissive: 0x000000, emissiveIntensity: 0, roughness: 0.2, metalness: 0, side: THREE.DoubleSide })
  )
  lampWall.position.set(0, 14, -34.99)
  lampWall.lookAt(0, 14, 0)
  lampWall.castShadow = true
  lampWall.receiveShadow = true
  scene.add(lampWall)

  const carLights = new THREE.Group()

  const spotLight = new THREE.SpotLight(0xFF7EAB, 0, 250, Math.PI / 3.5, 0.22, 2)
  spotLight.position.set(70.22, 4, 152.5)
  spotLight.target.position.set(0, 0, 0)
  spotLight.castShadow = true
  spotLight.shadow.mapSize.set(1024, 1024)
  spotLight.shadow.camera.near = 0.5
  spotLight.shadow.camera.far = 50
  spotLight.shadow.focus = 1
  carLights.add(spotLight)
  carLights.add(spotLight.target)

  const secondSpot = new THREE.SpotLight(0xFF7EAB, 0, 250, Math.PI / 3.5, 0.22, 2)
  secondSpot.position.set(0.2, 4, -64)
  secondSpot.target.position.set(0, 0, 23)
  secondSpot.castShadow = true
  secondSpot.shadow.mapSize.set(1024, 1024)
  secondSpot.shadow.camera.near = 0.5
  secondSpot.shadow.camera.far = 50
  secondSpot.shadow.focus = 1
  carLights.add(secondSpot)
  carLights.add(secondSpot.target)

  const frontPulseLight = new THREE.PointLight(0xFFFFFF, 0, 45, 2)
  frontPulseLight.castShadow = true
  frontPulseLight.shadow.mapSize.set(1024, 1024)
  frontPulseLight.shadow.camera.near = 0.5
  frontPulseLight.shadow.camera.far = 45
  frontPulseLight.shadow.bias = -0.002
  carLights.add(frontPulseLight)

  // Statisk lyskilde inde i bilen; lyser i alle retninger og pulserer ikke til musikken.
  const interiorLightIntensity = 120
  const interiorLight = new THREE.PointLight(0xFF0059, 0, 30, 2)
  interiorLight.castShadow = true
  interiorLight.shadow.mapSize.set(512, 512)
  interiorLight.shadow.camera.near = 0.1
  interiorLight.shadow.camera.far = 30
  interiorLight.shadow.bias = -0.002
  carLights.add(interiorLight)

  audio = new Audio()
  audio.crossOrigin = 'anonymous'
  audio.loop = true
  audio.volume = 0.65
  audio.muted = false
  audio.preload = 'none'

  const audioUrl = '/musik/KAYTRANADA - Scared To Death (Audio) (1).mp3'
  let audioRequested = false
  const requestAudio = () => {
    if (audioRequested) return
    audioRequested = true
    audio.src = audioUrl
    audio.load()
  }

  audioContext = new (window.AudioContext || window.webkitAudioContext)()
  const source = audioContext.createMediaElementSource(audio)
  analyser = audioContext.createAnalyser()
  analyser.fftSize = 1024
  analyser.smoothingTimeConstant = 0
  source.connect(analyser)
  analyser.connect(audioContext.destination)
  freqData = new Uint8Array(analyser.frequencyBinCount)

  const completeHold = async () => {
    if (!isHolding.value) return
    isHolding.value = false
    if (audioContext.state === 'suspended') {
      await audioContext.resume()
    }
    audio.pause()
    audio.currentTime = 0
    audio.muted = false
    requestAudio()
    try {
      await audio.play()
    } catch (err) {
      // fallback: user interaction may still be required
    }
    hasInteracted.value = true
  }

  const isMenuInteraction = (event) =>
    event.target instanceof Element && Boolean(event.target.closest('.site-nav'))

  startHold = (event) => {
    if (hasInteracted.value || isHolding.value) return
    if (event.type === 'pointerdown' && event.button !== 0) return
    if (event.type === 'pointerdown' && isMenuInteraction(event)) return

    isHolding.value = true
    audio.muted = true
    requestAudio()
    if (audioContext.state === 'suspended') audioContext.resume()
    audio.play().catch(() => {})
    holdTimer = window.setTimeout(completeHold, 1500)
  }

  cancelHold = () => {
    if (!isHolding.value || hasInteracted.value) return
    clearTimeout(holdTimer)
    isHolding.value = false
    audio.pause()
    audio.currentTime = 0
    audio.muted = false
  }

  onKeyDown = (e) => {
    if ((e.key === 'e' || e.key === 'E') && !e.repeat) startHold(e)
  }

  onKeyUp = (e) => {
    if (e.key === 'e' || e.key === 'E') cancelHold()
  }

  // Once playback has started, further clicks toggle pause/resume instead.
  toggleMute = (event) => {
    if (!hasInteracted.value) return
    if (isMenuInteraction(event)) return
    if (audio.paused) {
      requestAudio()
      audio.play()
      isMuted.value = false
    } else {
      audio.pause()
      isMuted.value = true
    }
  }

  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('pointerdown', startHold)
  window.addEventListener('pointerup', cancelHold)
  window.addEventListener('pointercancel', cancelHold)
  window.addEventListener('pointerdown', toggleMute)

  // Smooth (lerp) circular cursor follower.
  const cursor = { x: window.innerWidth / 1.5, y: window.innerHeight / 1.5 }
  const cursorTarget = { x: cursor.x, y: cursor.y }
  onCursorMove = (e) => {
    cursorTarget.x = e.clientX
    cursorTarget.y = e.clientY
  }
  window.addEventListener('pointermove', onCursorMove)

  const lightTargets = {
    spotLight: 0,
    secondSpot: 0,
    lampWallLight: 8,
    lampWallEmissive: 2.1,
    wallGlowEmissive: 4
  }
  let lightFadeProgress = 0
  let lightFadeElapsed = 0
  const lightFadeDelay = 1.6
  const lightFadeDuration = 2.5
  const fogFadeDelay = 0.8
  const interiorFadeDelay = 0.8
  const interiorFadeDuration = 3.0
  /*const grid = new THREE.GridHelper(12, 12, 0x999999, 0x999999)
  grid.position.y = -2.589
  grid.material.opacity = 0.45
  grid.material.transparent = true
  scene.add(grid)*/

  // Load model
  clock = new THREE.Clock()
  const loader = new GLTFLoader(loadingManager)
  loader.setMeshoptDecoder(MeshoptDecoder)
  const modelHolder = new THREE.Group()
  modelHolder.position.set(-10, -2.6, 43)
  scene.add(modelHolder)

  loader.load('/model/denrigtigedans.opt.glb', (gltf) => {
    if (isDisposed) {
      disposeLoadedAsset(gltf.scene)
      return
    }
    const model = gltf.scene
    model.scale.setScalar(1.5)
    model.position.set(0, 0, 40)
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

  // Bilen med forlygter (samme opsætning som DanceManCopy); lysene sidder fast på bilen.
  const carLoader = new GLTFLoader(loadingManager)
  carLoader.setMeshoptDecoder(MeshoptDecoder)
  const carHolder = new THREE.Group()
  carHolder.position.set(2, -2.6, 82)
  carHolder.rotation.y = Math.PI / 0.125
  carHolder.scale.setScalar(1.4)

  // Fastgør lysene til bilen; ophæv bilens skala så pærerne beholder størrelse.
  carHolder.add(carLights)
  carLights.scale.setScalar(1 / carHolder.scale.x)
  const carRefPos = new THREE.Vector3(10, -2, -1)
  const invCarRot = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(0, -carHolder.rotation.y, 0)
  )
  const placeCarLight = (obj, wx, wy, wz) => {
    obj.position.set(wx, wy, wz).sub(carRefPos).applyQuaternion(invCarRot)
  }
  placeCarLight(spotLight, 6.22, -1.6, 0.2)
  placeCarLight(spotLight.target, 0, 0, 0)
  placeCarLight(secondSpot, 6.2, -1.6, -2)
  placeCarLight(secondSpot.target, 0, 0, -2)
  placeCarLight(frontPulseLight, 1.2, 6.6, -0.9)
  placeCarLight(interiorLight, 10, -0.1, -1.0)


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
  carContact.position.set(0, -1.588, 0)
  carHolder.add(carContact)

  scene.add(carHolder)

  // Baglygte-mesh'ene bliver selvlysende røde; genkendes på navn eller rød materialefarve.
  const taillightMaterials = []
  const isRedTaillight = (mat) => {
    if (!mat) return false
    const name = (mat.name || '').toLowerCase()
    if (name.includes('red') || name.includes('tail') || name.includes('rear') || name.includes('brake')) return true
    if (!mat.color) return false
    const hsl = mat.color.getHSL({ h: 0, s: 0, l: 0 })
    return hsl.s > 0.5 && hsl.l > 0.1 && hsl.l < 0.6 && (hsl.h < 0.04 || hsl.h > 0.96)
  }

  carLoader.load('/model/delo1.web.glb', (gltf) => {
    if (isDisposed) {
      disposeLoadedAsset(gltf.scene)
      return
    }
    const car = gltf.scene
    car.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
        const mats = Array.isArray(child.material) ? child.material : [child.material]
        mats.forEach((mat) => {
          if (isRedTaillight(mat)) {
            mat.emissive = new THREE.Color(0xFF1A1A)
            mat.emissiveIntensity = 0
            mat.needsUpdate = true
            taillightMaterials.push(mat)
          }
        })
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
  let wavePhase = 0
  let wallsAnimating = false
  let contactMode = false
  lightDim = { value: 1 }
  interiorDim = { value: 1 }

  // Load an image onto the emissive wall (the "screen").
  const screenTextureLoader = new THREE.TextureLoader()
  setScreenImage = (url) => {
    screenTextureLoader.load(url, (tex) => {
      if (isDisposed) {
        tex.dispose()
        return
      }
      tex.colorSpace = THREE.SRGBColorSpace
      tex.center.set(0.5, 0.5)
      tex.rotation = Math.PI
      lampWall.material.emissiveMap = tex
      lampWall.material.ee = true
    })
  }

  // Ramp fog to full and lock the canvas, then run onComplete.
  triggerContact = ({ onComplete } = {}) => {
    if (contactMode) return
    contactMode = true
    canvas.style.pointerEvents = 'none'
    gsap.to(interiorDim, { value: 0, duration: 1.2, ease: 'power2.inOut' })
    gsap.to(scene.fog, {
      density: 1.0145,
      duration: 1.2,
      ease: 'power2.inOut',
      onComplete
    })
  }

  // Ramp fog down to zero and lock the canvas, then run onComplete.
  triggerProjects = ({ onComplete } = {}) => {
    if (contactMode) return
    contactMode = true
    canvas.style.pointerEvents = 'none'
    // Fade the bass-reactive lights out alongside the fog.
    gsap.to(lightDim, { value: 0, duration: 1.2, ease: 'power2.inOut' })
    gsap.to(interiorDim, { value: 0, duration: 1.2, ease: 'power2.inOut' })
    gsap.to(scene.fog, {
      density: 0,
      duration: 1.2,
      ease: 'power2.inOut',
      onComplete
    })
  }

  clock.start()
  function animate() {
    animationId = requestAnimationFrame(animate)
    const delta = Math.min(clock.getDelta(), 0.05)
    if (mixer) mixer.update(delta)

    camera.lookAt(cameraTarget)

    // Fade-timerne kører først når introen er trigget (efter preloaderen er væk).
    if (introStarted && lightFadeElapsed < interiorFadeDelay + interiorFadeDuration) {
      lightFadeElapsed += delta
      const startFade = Math.max(0, lightFadeElapsed - lightFadeDelay)
      lightFadeProgress = Math.min(1, startFade / lightFadeDuration)
    }
    const fade = lightFadeProgress < 1 ? 1 - Math.pow(1 - lightFadeProgress, 2) : 1

    const fogStartFade = Math.max(0, lightFadeElapsed - fogFadeDelay)
    const fogProgress = Math.min(1, fogStartFade / lightFadeDuration)
    const fogFade = fogProgress < 1 ? 1 - Math.pow(1 - fogProgress, 2) : 1

    // Interiørlyset bruger samme delay som tågen, men en ease-in (langsom start) så det bygger blødt op.
    const interiorStartFade = Math.max(0, lightFadeElapsed - interiorFadeDelay)
    const interiorProgress = Math.min(1, interiorStartFade / interiorFadeDuration)
    const interiorFade = interiorProgress * interiorProgress * interiorProgress

    if (!contactMode) {
      scene.fog.density = fogTargetDensity * fogFade
    }

    // Interiørlyset fader ind som tågen, men med lidt mere delay.
    interiorLight.intensity = interiorLightIntensity * interiorFade * interiorDim.value

    const litFade = fade * lightDim.value

    spotLight.intensity = lightTargets.spotLight * litFade
    secondSpot.intensity = lightTargets.secondSpot * litFade
    lampWallLight.intensity = lightTargets.lampWallLight * litFade
    lampWall.material.emissiveIntensity = lightTargets.lampWallEmissive * litFade
    wallGlowMaterial.emissiveIntensity = lightTargets.wallGlowEmissive * litFade
    for (const mat of taillightMaterials) mat.emissiveIntensity = 2.5 * litFade

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

      const bassFloor = 0.90
      const gated = bassNorm < bassFloor ? 0 : (bassNorm - bassFloor) / (1 - bassFloor)

      // Envelope follower: fast attack, slow release for a punchy pulse.
      if (gated > bassEnv) {
        bassEnv = gated // instant attack on a hit
      } else {
        bassEnv += (gated - bassEnv) * 0.07 // smooth release
      }

      // Emphasise peaks so quiet parts stay dark and hits pop.
      const level = Math.pow(bassEnv, 1.6)

      // Forlygterne pulserer til bassen (samme logik som DanceManCopy), men fader ind med scenen.
      spotLight.intensity = level * 920 * litFade
      secondSpot.intensity = level * 920 * litFade
      frontPulseLight.intensity = level * 20 * litFade
      // Baglygterne starter slukket og pulserer til bassen ligesom forlygterne.
      const tailGlow = level * 6.5 * litFade
      for (const mat of taillightMaterials) mat.emissiveIntensity = tailGlow

      // Væggene bølger kun når musikken spiller (flyder + pulser med bassen); ellers står de statisk.
      const musicPlaying = audio && !audio.paused && audioContext.state === 'running'
      if (musicPlaying) {
        wavePhase += delta * 0.01 + level * 0.03
        updateRoomWaves(wavePhase, level)
        wallsAnimating = true
      } else if (wallsAnimating) {
        updateRoomWaves(wavePhase, 0)
        wallsAnimating = false
      }
    }

    // Opdater interiorLightens view-space position, så room-shaderen kan udelade netop det lys.
    camera.updateMatrixWorld()
    camera.matrixWorldInverse.copy(camera.matrixWorld).invert()
    interiorLight.updateWorldMatrix(true, false)
    roomExcludeLightPos.setFromMatrixPosition(interiorLight.matrixWorld).applyMatrix4(camera.matrixWorldInverse)

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

function disposeLoadedAsset(root) {
  root.traverse((object) => {
    if (!object.isMesh) return
    object.geometry?.dispose()
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    materials.forEach((material) => {
      if (!material) return
      Object.values(material).forEach((value) => {
        if (value?.isTexture) value.dispose()
      })
      material.dispose()
    })
  })
}
</script>

<style scoped>
.dance-canvas {
  display: block;
  width: 100%;
  height: 100%;
  cursor: pointer;
}

.dance-canvas.interacted {
  cursor: default;
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

.cursor-progress {
  position: absolute;
  inset: -6px;
  width: 36px;
  height: 36px;
  overflow: visible;
  transform: rotate(-90deg);
}

.cursor-progress circle {
  fill: none;
  stroke: #FF0059;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-dasharray: 100.53;
  stroke-dashoffset: 100.53;
}

.cursor-circle.holding .cursor-progress circle {
  animation: hold-progress 1.5s linear forwards;
}

.cursor-circle::before {
  content: 'DANCE?';
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: 6px;
  white-space: nowrap;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: #ffffff;
}

.cursor-circle.holding::before {
  content: 'HOLD';
}

.cursor-circle.interacted::before {
  content: 'MUTE';
}

.cursor-circle.interacted.muted::before {
  content: 'DANCE?';
}

@keyframes hold-progress {
  to {
    stroke-dashoffset: 0;
  }
}
</style>
