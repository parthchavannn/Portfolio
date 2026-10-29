# Parth Chavan | Portfolio

A scroll-driven portfolio that tells my career as a story: from Ratnagiri and MIT-WPU, through computer vision and a startup, to identity automation at Deloitte.

Live site: https://parthchavannn.github.io/Portfolio/

Vercel: `https://your-project.vercel.app` (placeholder until deployed)

## Highlights

- A single WebGL "identity core" (Three.js) that moves, morphs and changes colour from chapter to chapter, with a particle field, orbiting rings and a detection-box scan.
- Scroll storytelling with GSAP ScrollTrigger: word-by-word text reveals, a pinned four-step impact sequence, a horizontal skills gallery and drifting chapter numerals.
- Gradients, glass cards with tilt and cursor spotlight, a progress bar and a chapter rail.
- Responsive layout, a swipeable skills row on phones, and a reduced-motion mode that turns off pinning and animation.

## Structure

```
index.html            page content
assets/css/site.css   styles
assets/js/main.js     3D scene and scroll animations
assets/img/favicon/   icons
```

No build step. Three.js (r128) and GSAP 3.12.5 load from cdnjs.

## Run locally

Open `index.html` in a browser, or serve the folder for a closer match to production:

```
npx serve .
```

## Editing the content

- Copy, numbers and links are in `index.html`.
- Colours and fonts are CSS variables at the top of `assets/css/site.css`.
- The core's position, size and colours per chapter are the `KEYS` array in `assets/js/main.js`, one entry per `data-ch` section in the same order.

## Contact

chavanparth1@gmail.com · [LinkedIn](https://www.linkedin.com/in/parthchavannn/) · [GitHub](https://github.com/parthchavannn)
