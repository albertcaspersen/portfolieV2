// Shared project data — consumed by ProjectsView (the grid) and
// ProjectDetailView (the reusable read-more page).
// ratio = natural width / height, used to build an equal-height row.
export const projects = [
  {
    slug: 'tekstilo',
    title: 'Tekstilo',
    tag: 'Brand & web',
    year: '2024',
    image: '/projectPics/TekstiloFront.png',
    ratio: 1151 / 1367,
    description:
      'A brand and website exploration for a textile studio. The identity leans on tactile type and a restrained palette to keep the material in focus.',
    video: null,
  },
  {
    slug: 'our-landscape-designs',
    title: 'Our Landscape Designs',
    tag: 'Concept site',
    year: '2023',
    image: '/projectPics/oldFront.png',
    ratio: 1894 / 1365,
    description:
      'A concept site for a landscape design practice. The layout gives their outdoor work room to breathe, pairing full-bleed imagery with calm, editorial typography.',
    video: '/projektvideo/our-landscape-designs.mp4',
  },
  {
    slug: 'flowmate',
    title: 'Flowmate',
    tag: 'Realtime editor concept site',
    year: '2025',
    image: '/projectPics/flowmateProject.png',
    ratio: 1316 / 877,
    description:
      'A concept marketing site for a realtime editing tool, built around motion and a bright, energetic accent to sell the idea of instant collaboration.',
    video: null,
  },
  {
    slug: 'havet',
    title: 'Havet',
    tag: 'Interactive site',
    year: '2024',
    image: '/projectPics/havetFront.png',
    ratio: 2048 / 1365,
    description:
      'An interactive site inspired by the sea. Scroll-driven visuals and subtle depth cues invite the visitor to drift through the content.',
    video: null,
  },
  {
    slug: 'projection',
    title: 'Projection',
    tag: 'Installation',
    year: '2023',
    image: '/projectPics/projectionproject.png',
    ratio: 810 / 1455,
    description:
      'A projection installation exploring light as a spatial material, mapping moving imagery onto physical surfaces.',
    video: null,
  },
]

export const getProject = (slug) => projects.find((p) => p.slug === slug)
