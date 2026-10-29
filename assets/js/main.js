(() => {
  'use strict';

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;
  root.classList.add(reduce ? 'reduce' : 'motion');
  const hasGSAP = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';
  if (hasGSAP) gsap.registerPlugin(ScrollTrigger);

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const isNarrow = () => innerWidth < 860;

  /* ------------------------------------------------------------------
     Chapter geometry: where each [data-ch] section sits in the document
  ------------------------------------------------------------------- */
  const sections = $$('[data-ch]');
  let tops = [];
  function measure() {
    tops = sections.map(s => s.getBoundingClientRect().top + scrollY);
    tops.push(document.documentElement.scrollHeight);
  }
  function chapterAt(y) {
    const s = y + innerHeight * 0.5;
    let i = 0;
    for (let k = 0; k < sections.length; k++) if (tops[k] <= s) i = k;
    const span = Math.max(1, tops[i + 1] - tops[i]);
    return { i, t: clamp((s - tops[i]) / span, 0, 1) };
  }

  /* ------------------------------------------------------------------
     3D scene
  ------------------------------------------------------------------- */
  const hex = h => new THREE.Color(h);
  // x: + right / - left. Copy sits on the opposite side of the core.
  const KEYS = [
    { x: 2.3,  y: 0.0,  z: 0,    s: 1.15, noise: 0.35, wire: 0.25, bbox: 0,   cluster: 0, rings: 0.15, dim: 1,    spread: 1,   a: '#ff7a45', b: '#ff3d8b', c: '#8b5cff' }, // hello
    { x: -2.5, y: 0.2,  z: -0.5, s: 0.8,  noise: 0.22, wire: 0.1,  bbox: 0,   cluster: 0, rings: 0,    dim: 0.95, spread: 1.4, a: '#ffb347', b: '#ff6b6b', c: '#ff3d8b' }, // origin
    { x: 2.5,  y: 0.0,  z: 0,    s: 1.0,  noise: 0.16, wire: 0.7,  bbox: 1,   cluster: 0, rings: 0,    dim: 1,    spread: 0.9, a: '#3cd2ff', b: '#5b7cff', c: '#b68cff' }, // vision
    { x: -2.4, y: 0.0,  z: -0.5, s: 0.6,  noise: 0.26, wire: 0.2,  bbox: 0,   cluster: 1, rings: 0,    dim: 1,    spread: 1,   a: '#ffd36a', b: '#ff7a45', c: '#ff3d8b' }, // venture
    { x: 2.7,  y: 0.0,  z: 0,    s: 0.95, noise: 0.3,  wire: 0.3,  bbox: 0,   cluster: 0, rings: 1,    dim: 1,    spread: 0.8, a: '#3cd2ff', b: '#8b5cff', c: '#ff3d8b' }, // identity
    { x: 0,    y: 1.4,  z: -6,   s: 0.9,  noise: 0.2,  wire: 0.15, bbox: 0,   cluster: 0, rings: 0.3,  dim: 0.55, spread: 1.2, a: '#8b5cff', b: '#ff3d8b', c: '#ff7a45' }, // work
    { x: -2.8, y: 0.2,  z: -2.5, s: 0.8,  noise: 0.2,  wire: 0.8,  bbox: 0,   cluster: 0, rings: 0.5,  dim: 0.55, spread: 1,   a: '#3cd2ff', b: '#5b7cff', c: '#8b5cff' }, // toolkit
    { x: 0,    y: 1.1,  z: -1,   s: 1.15, noise: 0.5,  wire: 0.3,  bbox: 0,   cluster: 0, rings: 1,    dim: 0.9,  spread: 0.9, a: '#ff7a45', b: '#ff3d8b', c: '#8b5cff' }, // contact
  ].map(k => ({ ...k, a: hex(k.a), b: hex(k.b), c: hex(k.c) }));

  const NOISE = `
    vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
    vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
    vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
    vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
    float snoise(vec3 v){
      const vec2 C=vec2(1.0/6.0,1.0/3.0);
      const vec4 D=vec4(0.0,0.5,1.0,2.0);
      vec3 i=floor(v+dot(v,C.yyy));
      vec3 x0=v-i+dot(i,C.xxx);
      vec3 g=step(x0.yzx,x0.xyz);
      vec3 l=1.0-g;
      vec3 i1=min(g.xyz,l.zxy);
      vec3 i2=max(g.xyz,l.zxy);
      vec3 x1=x0-i1+C.xxx;
      vec3 x2=x0-i2+C.yyy;
      vec3 x3=x0-D.yyy;
      i=mod289(i);
      vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
      float n_=0.142857142857;
      vec3 ns=n_*D.wyz-D.xzx;
      vec4 j=p-49.0*floor(p*ns.z*ns.z);
      vec4 x_=floor(j*ns.z);
      vec4 y_=floor(j-7.0*x_);
      vec4 x=x_*ns.x+ns.yyyy;
      vec4 y=y_*ns.x+ns.yyyy;
      vec4 h=1.0-abs(x)-abs(y);
      vec4 b0=vec4(x.xy,y.xy);
      vec4 b1=vec4(x.zw,y.zw);
      vec4 s0=floor(b0)*2.0+1.0;
      vec4 s1=floor(b1)*2.0+1.0;
      vec4 sh=-step(h,vec4(0.0));
      vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
      vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
      vec3 p0=vec3(a0.xy,h.x);
      vec3 p1=vec3(a0.zw,h.y);
      vec3 p2=vec3(a1.xy,h.z);
      vec3 p3=vec3(a1.zw,h.w);
      vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
      p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
      vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
      m=m*m;
      return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
    }`;

  function initScene() {
    const canvas = $('#gl');
    if (typeof THREE === 'undefined' || !canvas) return null;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch (e) { return null; }
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 6);

    const WHITE = new THREE.Color(0xffffff);
    const world = new THREE.Group();
    scene.add(world);

    /* core: displaced sphere with a three-colour fresnel gradient */
    const coreMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }, uNoise: { value: 0.3 },
        uA: { value: new THREE.Color() }, uB: { value: new THREE.Color() }, uC: { value: new THREE.Color() },
      },
      vertexShader: `
        uniform float uTime; uniform float uNoise;
        varying vec3 vNormal; varying vec3 vPos; varying float vN;
        ${NOISE}
        void main(){
          float n = snoise(position*1.4 + vec3(0.0,0.0,uTime*0.35));
          vN = n;
          vec3 p = position + normal*n*uNoise;
          vec4 mv = modelViewMatrix*vec4(p,1.0);
          vPos = mv.xyz;
          vNormal = normalize(normalMatrix*normal);
          gl_Position = projectionMatrix*mv;
        }`,
      fragmentShader: `
        uniform vec3 uA; uniform vec3 uB; uniform vec3 uC;
        varying vec3 vNormal; varying vec3 vPos; varying float vN;
        void main(){
          vec3 V = normalize(-vPos);
          vec3 N = normalize(vNormal);
          float f = pow(1.0-max(dot(N,V),0.0), 2.2);
          float g = clamp(vN*0.5+0.5 + N.y*0.28, 0.0, 1.0);
          vec3 base = mix(uA, uB, smoothstep(0.15, 0.85, g));
          vec3 col = mix(base, uC, f);
          col += f*0.35;
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    const core = new THREE.Mesh(new THREE.SphereGeometry(1, isNarrow() ? 72 : 128, isNarrow() ? 72 : 128), coreMat);
    const coreGroup = new THREE.Group();
    coreGroup.add(core);
    world.add(coreGroup);

    /* glow billboard */
    const gc = document.createElement('canvas'); gc.width = gc.height = 256;
    const gx = gc.getContext('2d');
    const gr = gx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.28)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    gx.fillStyle = gr; gx.fillRect(0, 0, 256, 256);
    const glowMat = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(gc), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.55 });
    const glow = new THREE.Sprite(glowMat);
    glow.scale.set(5.5, 5.5, 1); glow.position.z = -0.8;
    coreGroup.add(glow);

    /* wire shell */
    const wireMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false });
    const wire = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(1.38, 2)), wireMat);
    coreGroup.add(wire);

    /* detection box + scan line (vision chapter) */
    const bboxMat = new THREE.LineBasicMaterial({ color: 0x3cd2ff, transparent: true, opacity: 0, depthWrite: false });
    const bbox = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(3, 3, 3)), bboxMat);
    coreGroup.add(bbox);
    const scanMat = new THREE.MeshBasicMaterial({ color: 0x3cd2ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const scan = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.03), scanMat);
    coreGroup.add(scan);

    /* identity rings with orbiting tokens */
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    const beadMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
    const rings = [];
    [[1.9, 0.5, 0.2], [2.35, -0.9, 0.7], [2.8, 0.2, -0.6]].forEach(([r, rx, ry], i) => {
      const pivot = new THREE.Group();
      pivot.rotation.set(rx + 1.2, ry, 0);
      const spin = new THREE.Group();
      spin.add(new THREE.Mesh(new THREE.TorusGeometry(r, 0.012, 8, 220), ringMat));
      const bead = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 16), beadMat);
      bead.position.set(r, 0, 0);
      spin.add(bead);
      pivot.add(spin);
      coreGroup.add(pivot);
      rings.push({ spin, speed: (i % 2 ? -1 : 1) * (0.35 + i * 0.18) });
    });

    /* venture cluster: 22 small solids on loose orbits */
    const clusterMat = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0, depthWrite: false });
    const cluster = new THREE.Group();
    const orbiters = [];
    for (let i = 0; i < 22; i++) {
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.1 + Math.random() * 0.1, 0), clusterMat);
      const r = 1.7 + Math.random() * 1.8;
      const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
      orbiters.push({ m, r, th, ph, sp: 0.15 + Math.random() * 0.35 });
      cluster.add(m);
    }
    coreGroup.add(cluster);

    /* particle field */
    const N = isNarrow() ? 1400 : 3200;
    const pos = new Float32Array(N * 3), seed = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const r = 3 + Math.pow(Math.random(), 0.7) * 13;
      const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      pos[i * 3 + 1] = r * Math.cos(ph) * 0.8;
      pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th) - 4;
      seed[i] = Math.random();
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    pGeo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    const pMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uPx: { value: 1 }, uSpread: { value: 1 }, uA: { value: new THREE.Color() }, uB: { value: new THREE.Color() } },
      vertexShader: `
        uniform float uTime; uniform float uPx; uniform float uSpread;
        attribute float aSeed; varying float vSeed;
        void main(){
          vec3 p = position*uSpread;
          float a = uTime*0.04*(0.4+aSeed);
          float c = cos(a), s = sin(a);
          p.xz = mat2(c,-s,s,c)*p.xz;
          p.y += sin(uTime*0.4+aSeed*40.0)*0.18;
          vec4 mv = modelViewMatrix*vec4(p,1.0);
          gl_PointSize = (1.6+aSeed*3.2)*uPx*(9.0/-mv.z);
          vSeed = aSeed;
          gl_Position = projectionMatrix*mv;
        }`,
      fragmentShader: `
        uniform vec3 uA; uniform vec3 uB; varying float vSeed;
        void main(){
          float d = length(gl_PointCoord-0.5);
          if(d>0.5) discard;
          float a = smoothstep(0.5,0.0,d);
          gl_FragColor = vec4(mix(uA,uB,vSeed), a*0.85);
        }`,
    });
    const points = new THREE.Points(pGeo, pMat);
    world.add(points);

    /* state */
    const P = { ...KEYS[0], a: KEYS[0].a.clone(), b: KEYS[0].b.clone(), c: KEYS[0].c.clone() };
    const T = { ...KEYS[0], a: KEYS[0].a.clone(), b: KEYS[0].b.clone(), c: KEYS[0].c.clone() };
    const NUM = ['x', 'y', 'z', 's', 'noise', 'wire', 'bbox', 'cluster', 'rings', 'dim', 'spread'];
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    let scrollS = scrollY, frame = 0, last = 0, running = true;

    function resize() {
      const w = innerWidth, h = innerHeight;
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, isNarrow() ? 1.5 : 2));
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      pMat.uniforms.uPx.value = renderer.getPixelRatio() * (h / 900);
    }
    resize();
    addEventListener('resize', resize);
    addEventListener('pointermove', e => { mouse.tx = e.clientX / innerWidth * 2 - 1; mouse.ty = e.clientY / innerHeight * 2 - 1; }, { passive: true });
    document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running) requestAnimationFrame(tick); });

    function setTarget() {
      const { i, t } = chapterAt(scrollS);
      const a = KEYS[i], b = KEYS[Math.min(i + 1, KEYS.length - 1)];
      const k = smooth(0.55, 1, t);
      NUM.forEach(n => { T[n] = a[n] + (b[n] - a[n]) * k; });
      ['a', 'b', 'c'].forEach(n => T[n].copy(a[n]).lerp(b[n], k));
      return i;
    }

    function tick(now) {
      if (!running) return;
      requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
      const time = now / 1000;
      scrollS += (scrollY - scrollS) * (reduce ? 1 : 0.09);
      setTarget();

      const ease = reduce ? 1 : 1 - Math.pow(0.0009, dt);
      NUM.forEach(n => { P[n] += (T[n] - P[n]) * ease; });
      ['a', 'b', 'c'].forEach(n => P[n].lerp(T[n], ease));

      mouse.x += (mouse.tx - mouse.x) * 0.05; mouse.y += (mouse.ty - mouse.y) * 0.05;

      const narrow = isNarrow();
      const aspect = camera.aspect;
      const xm = narrow ? 0.12 : clamp(aspect / 1.7, 0.55, 1.15);
      coreGroup.position.set(P.x * xm + mouse.x * 0.12, P.y - (narrow ? 0.6 : 0) - mouse.y * 0.08, P.z);
      coreGroup.scale.setScalar(P.s * (narrow ? 0.85 : 1));
      core.rotation.y = time * 0.12; core.rotation.x = Math.sin(time * 0.2) * 0.2;
      wire.rotation.y = -time * 0.08; wire.rotation.z = time * 0.05;
      coreMat.uniforms.uTime.value = reduce ? 0 : time;
      coreMat.uniforms.uNoise.value = P.noise;
      coreMat.uniforms.uA.value.copy(P.a); coreMat.uniforms.uB.value.copy(P.b); coreMat.uniforms.uC.value.copy(P.c);
      glowMat.color.copy(P.b); glowMat.opacity = 0.3 + P.noise * 0.5;

      wireMat.opacity = P.wire * 0.55; wireMat.color.copy(P.a).lerp(WHITE, 0.4);
      bboxMat.opacity = P.bbox * 0.9; bbox.visible = P.bbox > 0.01;
      bbox.rotation.y = Math.sin(time * 0.4) * 0.35; bbox.rotation.x = Math.cos(time * 0.3) * 0.2;
      scanMat.opacity = P.bbox * 0.8; scan.visible = P.bbox > 0.01; scan.position.y = Math.sin(time * 1.1) * 1.4;

      const ringOn = P.rings > 0.01;
      ringMat.opacity = P.rings * 0.55; beadMat.opacity = P.rings;
      ringMat.color.copy(P.a); beadMat.color.copy(P.c).lerp(WHITE, 0.5);
      rings.forEach(r => { r.spin.parent.visible = ringOn; r.spin.rotation.z = time * r.speed; });

      cluster.visible = P.cluster > 0.01; clusterMat.opacity = P.cluster * 0.85; clusterMat.color.copy(P.a).lerp(WHITE, 0.3);
      if (cluster.visible) {
        orbiters.forEach(o => {
          const th = o.th + time * o.sp;
          o.m.position.set(o.r * Math.sin(o.ph) * Math.cos(th), o.r * Math.cos(o.ph), o.r * Math.sin(o.ph) * Math.sin(th));
          o.m.rotation.x = time * o.sp; o.m.rotation.y = time * o.sp * 1.3;
        });
      }

      pMat.uniforms.uTime.value = time; pMat.uniforms.uSpread.value = P.spread;
      pMat.uniforms.uA.value.copy(P.a); pMat.uniforms.uB.value.copy(P.c);
      points.rotation.y = scrollS * 0.00035;
      points.position.y = scrollS * 0.0009;

      camera.position.x = mouse.x * 0.35; camera.position.y = -mouse.y * 0.22;
      camera.lookAt(0, 0, 0);

      canvas.style.opacity = (P.dim * (narrow ? 0.55 : 1)).toFixed(3);

      if (++frame % 5 === 0) {
        const to = c => `${Math.round(c.r * 255)} ${Math.round(c.g * 255)} ${Math.round(c.b * 255)}`;
        root.style.setProperty('--c1', to(P.a)); root.style.setProperty('--c2', to(P.b));
      }
      renderer.render(scene, camera);
    }
    requestAnimationFrame(tick);
    return true;
  }

  /* ------------------------------------------------------------------
     UI: progress, rail, nav state, cursor glow, copy button
  ------------------------------------------------------------------- */
  function initUI() {
    const bar = $('.progress i');
    const rail = $('.rail');
    sections.forEach((s, i) => {
      const a = document.createElement('a');
      a.href = '#' + s.id; a.setAttribute('aria-label', s.dataset.label);
      a.innerHTML = `<span>${s.dataset.label}</span><i></i>`;
      rail.appendChild(a);
    });
    const dots = $$('a', rail);
    let active = -1;
    function onScroll() {
      const max = document.documentElement.scrollHeight - innerHeight;
      bar.style.transform = `scaleX(${max > 0 ? clamp(scrollY / max, 0, 1) : 0})`;
      const { i } = chapterAt(scrollY);
      if (i !== active) { dots.forEach((d, k) => d.classList.toggle('on', k === i)); active = i; }
    }
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    const glow = $('.cursor-glow');
    if (glow && !reduce && matchMedia('(hover: hover)').matches) {
      let gx = 0, gy = 0, tx = -999, ty = -999;
      addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; }, { passive: true });
      (function loop() { gx += (tx - gx) * 0.12; gy += (ty - gy) * 0.12; glow.style.transform = `translate3d(${gx}px,${gy}px,0)`; requestAnimationFrame(loop); })();
    }

    const copy = $('#copy-mail');
    if (copy) copy.addEventListener('click', async () => {
      const text = 'chavanparth1@gmail.com';
      try { await navigator.clipboard.writeText(text); copy.textContent = 'Copied'; }
      catch (e) {
        const r = document.createRange(); const el = $('.contact-row .btn-grad span'); r.selectNodeContents(el);
        const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); copy.textContent = 'Press Ctrl+C';
      }
      setTimeout(() => { copy.textContent = 'Copy email'; }, 2000);
    });

    // card tilt + spotlight
    if (!reduce && matchMedia('(hover: hover)').matches) {
      $$('.tilt').forEach(card => {
        card.addEventListener('pointermove', e => {
          const r = card.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
          card.style.setProperty('--mx', (px * 100) + '%'); card.style.setProperty('--my', (py * 100) + '%');
          card.style.transform = `rotateY(${(px - 0.5) * 9}deg) rotateX(${(0.5 - py) * 9}deg) translateZ(6px)`;
        });
        card.addEventListener('pointerleave', () => { card.style.transform = ''; });
      });
    }
  }

  /* ------------------------------------------------------------------
     Scroll storytelling (GSAP ScrollTrigger)
  ------------------------------------------------------------------- */
  function countUp(el, to, dur = 1.6, fmt = v => Math.round(v).toString()) {
    const o = { v: 0 };
    gsap.to(o, { v: to, duration: dur, ease: 'power2.out', onUpdate: () => { el.textContent = fmt(o.v); } });
  }

  function initMotion() {
    if (!hasGSAP || reduce) return;

    // hero entrance
    const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
    tl.from('.hero-title .inner', { yPercent: 115, duration: 1.3, stagger: 0.12 }, 0.15)
      .from('.hero-in', { y: 30, opacity: 0, duration: 1, stagger: 0.12 }, 0.5);
    $$('.hero-stats [data-count]').forEach(el => countUp(el, +el.dataset.count, 2.2));

    // generic reveals
    $$('.rv').forEach(el => {
      gsap.from(el, { y: 44, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
    });
    $$('.stagger').forEach(group => {
      gsap.from(group.children, { y: 50, opacity: 0, duration: 0.9, stagger: 0.12, ease: 'power3.out', scrollTrigger: { trigger: group, start: 'top 88%', once: true } });
    });

    // word-by-word reading reveal
    $$('.scrub-text').forEach(el => {
      const words = el.textContent.trim().split(/\s+/);
      el.textContent = '';
      const spans = words.map(w => { const s = document.createElement('span'); s.className = 'w'; s.textContent = w + ' '; el.appendChild(s); return s; });
      gsap.to(spans, { opacity: 1, stagger: 0.1, ease: 'none', scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 48%', scrub: true } });
    });

    // ghost numerals drift
    $$('.ghost').forEach(g => {
      gsap.fromTo(g, { yPercent: -18 }, { yPercent: 28, ease: 'none', scrollTrigger: { trigger: g.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
    });

    // venture counter
    const vn = $('.venture-num [data-count]');
    if (vn) ScrollTrigger.create({ trigger: vn, start: 'top 85%', once: true, onEnter: () => countUp(vn, 20, 1.6) });

    // marquees
    $$('.track').forEach(tr => {
      const dir = +tr.dataset.dir;
      const w = () => tr.scrollWidth / 2;
      gsap.fromTo(tr, { x: () => (dir < 0 ? 0 : -w()) }, { x: () => (dir < 0 ? -w() * 0.8 : -w() * 0.2), ease: 'none', scrollTrigger: { trigger: '#toolkit', start: 'top bottom', end: 'bottom top', scrub: 0.6, invalidateOnRefresh: true } });
    });

    // identity: pinned four-beat story
    const beats = $$('.beat');
    const ticks = $$('.beat-ticks li');
    const donut = $('#donut-fg');
    const tickets = $('#c-tickets'), hours = $('#c-hours');
    gsap.set(beats.slice(1), { opacity: 0, y: 60 });
    gsap.set('.b-before', { scaleX: 0 });
    gsap.set('.b-after', { scaleX: 0 });
    ScrollTrigger.create({ trigger: '.pin-wrap', start: 'top 70%', once: true, onEnter: () => countUp(tickets, 2150, 1.8, v => Math.round(v).toLocaleString('en-US')) });

    const h = { v: 0 };
    const story = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: '.pin-wrap', start: 'top top', end: () => '+=' + innerHeight * 3.4, pin: true, scrub: 0.8, anticipatePin: 1,
        onUpdate: self => {
          const idx = Math.min(3, Math.floor(self.progress * 4));
          ticks.forEach((t, k) => t.classList.toggle('on', k === idx));
        },
      },
    });
    story
      .to(beats[0], { opacity: 0, y: -60, duration: 0.5 }, 0.75)
      .to(beats[1], { opacity: 1, y: 0, duration: 0.5 }, 1)
      .fromTo(donut, { strokeDashoffset: 339.29 }, { strokeDashoffset: 135.72, duration: 0.7 }, 1.05)
      .to(beats[1], { opacity: 0, y: -60, duration: 0.5 }, 1.75)
      .to(beats[2], { opacity: 1, y: 0, duration: 0.5 }, 2)
      .to('.b-before', { scaleX: 1, duration: 0.3 }, 2.1)
      .to('.b-after', { scaleX: 1, duration: 0.3 }, 2.35)
      .to(beats[2], { opacity: 0, y: -60, duration: 0.5 }, 2.75)
      .to(beats[3], { opacity: 1, y: 0, duration: 0.5 }, 3)
      .fromTo(h, { v: 0 }, { v: 680, duration: 0.75, onUpdate: () => { hours.textContent = Math.round(h.v); } }, 3.05)
      .to({}, { duration: 0.4 }, 3.6);

    // toolkit: vertical scroll drives a horizontal gallery on desktop
    const mm = gsap.matchMedia();
    mm.add('(min-width: 861px)', () => {
      const track = $('.htrack'), pin = $('.hpin');
      if (!track || !pin) return;
      const dist = () => Math.max(0, track.scrollWidth - innerWidth);
      gsap.to(track, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: pin, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 0.7, invalidateOnRefresh: true, anticipatePin: 1 } });
    });

    ScrollTrigger.sort();
    ScrollTrigger.addEventListener('refresh', measure);
    ScrollTrigger.refresh();
  }

  /* ------------------------------------------------------------------ */
  measure();
  addEventListener('resize', measure);
  addEventListener('load', () => { measure(); if (hasGSAP) ScrollTrigger.refresh(); });
  initUI();
  initMotion();
  initScene();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { measure(); if (hasGSAP) ScrollTrigger.refresh(); });
})();
