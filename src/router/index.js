import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import { getProject } from '../data/projects.js'

const updateMeta = (key, value, content) => {
  let element = document.head.querySelector(`meta[${key}="${value}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(key, value)
    document.head.appendChild(element)
  }
  element.setAttribute('content', content)
}

const updateSeo = (route) => {
  const project = route.name === 'project-detail' ? getProject(route.params.slug) : null
  const title = project
    ? `${project.title} — Project by Albert Caspersen`
    : route.meta.title ?? 'Albert Caspersen — Creative Developer'
  const description = project
    ? `${project.description} A ${project.tag.toLowerCase()} project by Albert Caspersen.`
    : route.meta.description ?? 'Albert Caspersen is a creative developer working with creative coding, 3D, motion and interactive digital experiences.'
  const canonical = `https://www.albertcaspersen.dk${route.path}`
  const image = project
    ? `https://www.albertcaspersen.dk${project.image}`
    : 'https://www.albertcaspersen.dk/aboutPic/aboutmigpicfarve.png'

  document.title = title
  updateMeta('name', 'description', description)
  updateMeta('property', 'og:title', title)
  updateMeta('property', 'og:description', description)
  updateMeta('property', 'og:url', canonical)
  updateMeta('property', 'og:type', project ? 'article' : 'website')
  updateMeta('property', 'og:image', image)
  updateMeta('name', 'twitter:title', title)
  updateMeta('name', 'twitter:description', description)
  updateMeta('name', 'twitter:image', image)

  let canonicalLink = document.head.querySelector('link[rel="canonical"]')
  if (!canonicalLink) {
    canonicalLink = document.createElement('link')
    canonicalLink.rel = 'canonical'
    document.head.appendChild(canonicalLink)
  }
  canonicalLink.href = canonical
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(to) {
    if (to.name === 'project-detail') return { top: 0 }
  },
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
      meta: {
        title: 'Albert Caspersen — Creative Developer',
        description: 'Albert Caspersen is a creative developer working with creative coding, 3D, motion and interactive digital experiences. Explore selected projects and get in touch.',
      },
    },
    {
      path: '/contact',
      name: 'contact',
      component: () => import('../views/ContactView.vue'),
      meta: {
        title: 'Contact Albert Caspersen — Creative Developer',
        description: 'Get in touch with Albert Caspersen about creative development, interactive websites, 3D, motion and digital projects.',
      },
    },
    {
      path: '/projects',
      name: 'projects',
      component: () => import('../views/ProjectsView.vue'),
      meta: {
        title: 'Selected Projects — Albert Caspersen',
        description: 'Explore selected creative development, web design, 3D and interactive projects by Albert Caspersen.',
      },
    },
    {
      path: '/projects/projection',
      redirect: '/projects',
    },
    {
      path: '/projects/processing',
      redirect: '/projects',
    },
    {
      path: '/projects/:slug',
      name: 'project-detail',
      component: () => import('../views/ProjectDetailView.vue'),
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('../views/AboutView.vue'),
      meta: {
        title: 'About Albert Caspersen — Creative Developer',
        description: 'Learn about Albert Caspersen, a creative developer working across creative coding, visual communication, 3D, motion, interaction and music production.',
      },
    },
  ],
})

router.afterEach((to) => updateSeo(to))

export default router
