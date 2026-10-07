<template>
  <canvas ref="canvasRef" class="contact-canvas" />
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import gsap from 'gsap'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'

const canvasRef = ref(null)

let renderer, scene, camera, mixer, animationId, clock
let isDisposed = false

onMounted(() => {
  isDisposed = false
  const canvas = canvasRef.value

  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  resize()

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x010101)

  camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 100)
  camera.position.set(0, 5.2, 2)
  camera.lookAt(0, 0.0, 0)



  // Soft point light on the model, starts off and fades in on load.
  const pointLightTargetIntensity = 12
  const pointLight = new THREE.PointLight(0xff0059, 0, 20, 2)
  pointLight.position.set(-2, 3, -3)
  pointLight.castShadow = true
  pointLight.shadow.mapSize.set(1024, 1024)
  pointLight.shadow.radius = 6
  pointLight.shadow.camera.near = 0.5
  pointLight.shadow.camera.far = 20
  scene.add(pointLight)
  gsap.to(pointLight, { intensity: pointLightTargetIntensity, duration: 3, ease: 'power2.out', delay: 1.0 })

  clock = new THREE.Clock()
  const loader = new GLTFLoader()
  loader.setMeshoptDecoder(MeshoptDecoder)
  const modelHolder = new THREE.Group()
  scene.add(modelHolder)

  loader.load('/model/contactDance.opt.glb', (gltf) => {
    if (isDisposed) {
      disposeLoadedAsset(gltf.scene)
      return
    }
    const model = gltf.scene
    model.scale.setScalar(1.5)
    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })
    modelHolder.add(model)

    if (gltf.animations.length > 0) {
      mixer = new THREE.AnimationMixer(model)
      mixer.timeScale = 0.5
      gltf.animations.forEach((clip) => {
        mixer.clipAction(clip).play()
      })
    }
  })

  clock.start()
  function animate() {
    animationId = requestAnimationFrame(animate)
    const delta = Math.min(clock.getDelta(), 0.05)
    if (mixer) mixer.update(delta)
    renderer.render(scene, camera)
  }
  animate()

  window.addEventListener('resize', resize)
})

onBeforeUnmount(() => {
  isDisposed = true
  cancelAnimationFrame(animationId)
  window.removeEventListener('resize', resize)

  if (mixer) mixer.stopAllAction()

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

function resize() {
  const canvas = canvasRef.value
  if (!canvas) return
  const w = window.innerWidth
  const h = window.innerHeight
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
.contact-canvas {
  display: block;
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
}
</style>
