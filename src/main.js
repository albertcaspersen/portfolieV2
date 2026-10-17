import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { projects } from './data/projects.js'
import { preloadImage } from './composables/useImagePreload.js'

projects.forEach(({ image }) => preloadImage(image))
preloadImage('/aboutPic/aboutmigpic.png')
preloadImage('/aboutPic/aboutmigpicfarve.png')

const app = createApp(App)

app.use(router)

app.mount('#app')
