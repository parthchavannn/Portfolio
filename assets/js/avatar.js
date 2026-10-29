(() => {
  'use strict';
  const holder = document.getElementById('avatar3d');
  const canvas = holder && holder.querySelector('canvas');
  if (!holder || !canvas || typeof THREE === 'undefined') return;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch (e) { return; }
  renderer.setClearColor(0x000000, 0);

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, -0.2, 9.2);
  camera.lookAt(0, -0.2, 0);

  scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x4a2a40, 0.85));
  const key = new THREE.DirectionalLight(0xffeedd, 1.15); key.position.set(-3, 3, 5); scene.add(key);
  const rimA = new THREE.DirectionalLight(0xff3d8b, 1.0); rimA.position.set(4, 1.5, -2); scene.add(rimA);
  const rimB = new THREE.DirectionalLight(0x3cd2ff, 0.9); rimB.position.set(-4, 2, -3); scene.add(rimB);

  const std = (color, rough, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.02, ...extra });
  const SKIN = new THREE.Color(0xd9a47f), STUBBLE = new THREE.Color(0xa77b5c);
  const skinShade = std(0xc78f6b, 0.7, { emissive: 0x1a0c06 });
  const hoodie = std(0x3b2a8f, 0.8), hoodieDark = std(0x2b1f6b, 0.8), cord = std(0xe9e6f5, 0.6);
  const frame = std(0xff3d8b, 0.35);
  const white = std(0xf8f4f0, 0.3), irisM = std(0x5a3622, 0.25), pupilM = std(0x07060a, 0.2), browM = std(0x2b1a12, 0.5), mouthM = std(0x7a3a3c, 0.5);
  const dark = std(0x14161f, 0.5), metal = std(0x2a2d3d, 0.4, { metalness: 0.3 });

  const avatar = new THREE.Group();
  scene.add(avatar);

  /* hoodie, neck, hood, drawstrings */
  const body = new THREE.Group(); avatar.add(body);
  const torso = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 36), hoodie);
  torso.position.set(0, -2.7, 0); torso.scale.set(2.3, 1.3, 1.05); body.add(torso);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.4, 0.8, 32), skinShade);
  neck.position.set(0, -1.3, -0.02); body.add(neck);
  const hood = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.24, 20, 48), hoodieDark);
  hood.position.set(0, -1.62, -0.05); hood.rotation.x = Math.PI / 2 - 0.35; hood.scale.set(1.15, 1, 1); body.add(hood);
  [-1, 1].forEach(s => {
    const string = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.62, 8), cord);
    string.position.set(s * 0.2, -1.95, 0.62); string.rotation.z = s * 0.06; body.add(string);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), cord);
    tip.position.set(s * 0.2 + s * 0.04, -2.26, 0.63); body.add(tip);
  });

  /* headphones resting around the neck */
  const hp = new THREE.Group(); body.add(hp);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.05, 12, 48, Math.PI * 1.15), dark);
  band.position.set(0, -1.52, 0.1); band.rotation.set(Math.PI / 2 - 0.2, 0, Math.PI * 0.92); hp.add(band);
  [-1, 1].forEach(s => {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.16, 28), frame);
    cup.rotation.z = Math.PI / 2; cup.position.set(s * 0.82, -1.62, 0.5); hp.add(cup);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.19, 28), dark);
    pad.rotation.z = Math.PI / 2; pad.position.set(s * 0.82, -1.62, 0.5); hp.add(pad);
  });

  /* head */
  const head = new THREE.Group(); head.position.y = 0.1; avatar.add(head);
  const hg = new THREE.SphereGeometry(1, 96, 72);
  const pos = hg.attributes.position, cols = [];
  const ss = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i) * 0.84, y = pos.getY(i) * 1.0, z = pos.getZ(i) * 0.9;
    const low = ss(0, -1, y);
    x *= 1 - 0.18 * low; z *= 1 - 0.06 * low;
    pos.setXYZ(i, x, y, z);
    c.copy(SKIN).lerp(STUBBLE, ss(-0.55, -0.95, y) * ss(-0.2, 0.3, z) * 0.35);
    cols.push(c.r, c.g, c.b);
  }
  hg.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  hg.computeVertexNormals();
  const headMesh = new THREE.Mesh(hg, std(0xffffff, 0.6, { vertexColors: true, emissive: 0x1a0c06 }));
  head.add(headMesh);
  [-1, 1].forEach(s => {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.17, 24, 20), skinShade);
    ear.position.set(s * 0.83, -0.05, -0.03); ear.scale.set(0.45, 1.05, 0.75); head.add(ear);
  });
  scene.updateMatrixWorld(true);

  const rc = new THREE.Raycaster();
  const Z = new THREE.Vector3(0, 0, 1);
  function surf(x, y) {
    rc.set(head.localToWorld(new THREE.Vector3(x, y, 5)), new THREE.Vector3(0, 0, -1));
    const h = rc.intersectObject(headMesh, false)[0];
    if (!h) return { p: new THREE.Vector3(x, y, 0.5), n: Z.clone() };
    return { p: head.worldToLocal(h.point.clone()), n: h.face.normal.clone().normalize() };
  }
  const lift = (s, d) => s.p.clone().addScaledVector(s.n, d);
  const tube = (pts, r, m, seg = 32) => new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg, r, 8), m);

  /* eyes, glasses */
  const eyes = [];
  const EY = 0.12, EX = 0.32;
  [-1, 1].forEach(s => {
    const f = surf(s * EX, EY);
    const g = new THREE.Group();
    g.position.copy(lift(f, -0.05)); g.quaternion.setFromUnitVectors(Z, f.n);
    const w = new THREE.Mesh(new THREE.SphereGeometry(0.115, 32, 24), white); w.scale.set(1.08, 1.0, 0.5);
    const ir = new THREE.Mesh(new THREE.SphereGeometry(0.078, 28, 20), irisM); ir.position.set(0, -0.005, 0.03); ir.scale.set(1, 1, 0.42);
    const pu = new THREE.Mesh(new THREE.SphereGeometry(0.04, 20, 16), pupilM); pu.position.set(0, -0.005, 0.047); pu.scale.set(1, 1, 0.4);
    const h1 = new THREE.Mesh(new THREE.SphereGeometry(0.02, 12, 10), white); h1.position.set(0.028, 0.032, 0.058);
    const h2 = new THREE.Mesh(new THREE.SphereGeometry(0.01, 10, 8), white); h2.position.set(-0.022, -0.03, 0.055);
    g.add(w, ir, pu, h1, h2); head.add(g); eyes.push(g);

    const lid = [];
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      lid.push(lift(surf(s * EX + (t - 0.5) * 0.28, EY + 0.075 + 0.045 * Math.sin(t * Math.PI)), 0.014));
    }
    head.add(tube(lid, 0.015, browM, 24));
  });

  /* brows, nose, smile */
  [-1, 1].forEach(s => {
    const pts = [];
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      pts.push(lift(surf(s * (0.14 + t * 0.36), 0.38 + 0.05 * Math.sin(t * Math.PI) + t * 0.02), 0.012));
    }
    head.add(tube(pts, 0.032, browM, 28));
  });
  const tip = surf(0, -0.22);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 18), skinShade);
  nose.position.copy(lift(tip, 0.02)); nose.scale.set(1.05, 1.0, 0.95); head.add(nose);
  const smile = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    smile.push(lift(surf(-0.24 + t * 0.48, -0.5 - 0.08 * Math.sin(t * Math.PI)), 0.01));
  }
  head.add(tube(smile, 0.02, mouthM, 36));
  [-1, 1].forEach(s => {
    const dimple = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), mouthM);
    dimple.position.copy(lift(surf(s * 0.26, -0.47), 0.008)); head.add(dimple);
  });

  /* hoodie hood worn up: a dome tilted back so the face sits in the opening */
  const hoodUp = new THREE.Group();
  hoodUp.position.set(0, 0.08, -0.12); hoodUp.rotation.x = -0.57; hoodUp.scale.set(1.0, 1.28, 1.2);
  hoodUp.add(new THREE.Mesh(new THREE.SphereGeometry(1, 64, 40, 0, Math.PI * 2, 0, Math.PI * 0.5), hoodie));
  const hoodRim = new THREE.Mesh(new THREE.TorusGeometry(1, 0.09, 16, 72), std(0x4a38b0, 0.8));
  hoodRim.rotation.x = Math.PI / 2; hoodUp.add(hoodRim);
  head.add(hoodUp);

  /* laptop: lid back with a glowing emblem */
  const laptop = new THREE.Group(); laptop.position.set(0, -2.0, 1.05); laptop.rotation.x = -0.12; body.add(laptop);
  laptop.add(new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.3, 0.07), metal));
  const emblem = new THREE.Mesh(new THREE.CircleGeometry(0.22, 40), new THREE.MeshBasicMaterial({ color: 0xff7a45 }));
  emblem.position.z = 0.045; laptop.add(emblem);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.26, 0.3, 40), new THREE.MeshBasicMaterial({ color: 0x3cd2ff, side: THREE.DoubleSide }));
  ring.position.z = 0.046; laptop.add(ring);

  /* floating code badges */
  function badge(text, color) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const x = cv.getContext('2d');
    x.fillStyle = 'rgba(7,7,13,0.88)'; x.strokeStyle = color; x.lineWidth = 6;
    const r = 26; x.beginPath(); x.moveTo(r + 8, 8); x.arcTo(120, 8, 120, 120, r); x.arcTo(120, 120, 8, 120, r); x.arcTo(8, 120, 8, 8, r); x.arcTo(8, 8, 120, 8, r); x.closePath(); x.fill(); x.stroke();
    x.fillStyle = color; x.font = 'bold 44px Consolas, "Courier New", monospace'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, 64, 66);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true }));
    sp.scale.set(0.75, 0.75, 1); return sp;
  }
  const badges = [[badge('</>', '#3cd2ff'), -1.55, 1.0, 0.4], [badge('{ }', '#ff7a45'), 1.6, 0.4, 0.5], [badge('AI', '#ff3d8b'), -1.5, -0.4, 0.6]];
  badges.forEach(([b, x, y, z]) => { b.position.set(x, y, z); b.userData = { x, y, ph: x * 3 }; avatar.add(b); });

  function resize() {
    const w = Math.max(1, holder.clientWidth), h = Math.max(1, holder.clientHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  resize();
  addEventListener('resize', resize);

  const m = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener('pointermove', e => { m.tx = e.clientX / innerWidth * 2 - 1; m.ty = e.clientY / innerHeight * 2 - 1; }, { passive: true });

  holder.classList.add('ready');
  let visible = true;
  if ('IntersectionObserver' in window) new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { threshold: 0 }).observe(holder);

  let nextBlink = 2.5;
  function tick(now) {
    requestAnimationFrame(tick);
    if (!visible || document.hidden) return;
    const t = now / 1000;
    m.x += (m.tx - m.x) * 0.06; m.y += (m.ty - m.y) * 0.06;
    head.rotation.y = m.x * 0.5; head.rotation.x = m.y * 0.22; head.rotation.z = -m.x * 0.03;
    body.rotation.y = m.x * 0.1;
    avatar.position.y = Math.sin(t * 1.2) * 0.035;
    badges.forEach(([b]) => { b.position.y = b.userData.y + Math.sin(t * 1.4 + b.userData.ph) * 0.08; });
    let k = 1;
    if (t > nextBlink) { const u = (t - nextBlink) / 0.14; k = u < 1 ? 1 - Math.sin(u * Math.PI) * 0.9 : 1; if (u >= 1) nextBlink = t + 2.5 + Math.random() * 3; }
    eyes.forEach(e => { e.scale.y = k; });
    renderer.render(scene, camera);
  }
  if (reduce) { head.rotation.y = -0.18; renderer.render(scene, camera); }
  else requestAnimationFrame(tick);
})();
