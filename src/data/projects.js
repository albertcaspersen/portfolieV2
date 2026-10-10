// Shared project data — consumed by ProjectsView (the grid) and
// ProjectDetailView (the reusable read-more page).
// ratio = natural width / height, used to build an equal-height row.
export const projects = [
  {
    slug: 'tekstilo',
    title: 'TEKSTILO',
    tag: 'Brand & web',
    year: '2024',
    image: '/projectPics/TekstiloFront.png',
    ratio: 1151 / 1367,
    description:
      'Tekstilo is a digital tool designed to make better use of leftover fabric. By photographing a fabric piece, the tool analyses its shape and identifies sewing patterns that can fit within the available material, helping reduce waste while making sewing more accessible and intuitive.',
    video: '/projektvideo/tekstiloFilm.mp4',
    tech: ['Branding', 'Vue.js', 'GSAP', 'UX/UI', 'Computer Vision', 'JavaScript', 'Vector processing'],
    gallery: [
      '/projektvideo/tekstilopics/image%2056.png',
      '/projektvideo/tekstilopics/image%2057.png',
      '/projektvideo/tekstilopics/image%2058.png',
      '/projektvideo/tekstilopics/image%2059.png',
    ],
  },
  {
    slug: 'our-landscape-designs',
    title: 'OUR LANDSCAPE DESIGNS',
    tag: 'CONCEPT SITE',
    year: '2023',
    image: '/projectPics/oldFront.png',
    ratio: 1894 / 1365,
    description:
      'Our Landscape Designs is a concept website created for a landscape architecture studio during my internship at Checkmate. The project focused on translating their hand-drawn sketches, watercolours and finished gardens into a digital experience that reflects the journey from initial idea to realised landscape.',
    video: '/projektvideo/ourlandscape.mp4',
    tech: ['Three.js', 'GSAP', 'webGL', 'Vue.js', 'UX/UI'],
    gallery: [
      '/projektvideo/ourlandscapephotos/oldphoto1.webp',
      '/projektvideo/ourlandscapephotos/oldphoto2.webp',
      '/projektvideo/ourlandscapephotos/oldphoto3.webp',
    ],
  },
  {
    slug: 'flowmate',
    title: 'Flowmate',
    tag: 'Realtime editor concept site',
    year: '2025',
    image: '/projectPics/flowmateProject.png',
    ratio: 1316 / 877,
    description:
      'Flowmate is a headless CMS platform built to give teams more freedom when creating and managing websites. During my internship at Checkmate, I created a concept website for Flowmate, exploring how the brand and product could be presented through a more engaging and visually distinct digital experience.',
    video: '/projektvideo/flowmateVideo.mp4',
    tech: ['Vue.js', 'GSAP', 'OpenGL', 'UX/UI'],
    gallery: [
      '/projektvideo/flowmatepics/image%2060.png',
      '/projektvideo/flowmatepics/image%2061.png',
    ],
  },
  {
    slug: 'havet',
    title: 'Havet under pres',
    tag: 'Interactive site',
    year: '2024',
    image: '/projectPics/havetFront.png',
    ratio: 2048 / 1365,
    description:
      'Havet under pres is an interactive educational game designed for school children, with Videnskab.dk as a fictional client. Through a digital experience connected to a physical arcade station with a joystick and button, the project makes learning about the ocean and its challenges engaging and hands-on.',
    video: '/projektvideo/HavetUnderPres.mp4',
    tech: ['Three.js', 'webGL', 'GSAP', 'UX/UI'],
    gallery: [
      '/projektvideo/HavetUnderPrespics/havetpic1.png',
      '/projektvideo/HavetUnderPrespics/havetpic2.png',
    ],
  },
]

export const getProject = (slug) => projects.find((p) => p.slug === slug)
