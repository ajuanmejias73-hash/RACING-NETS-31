/* =====================================================================
   CONFIGURADOR 3D — RACING NETS
   - Variantes de cuadrícula (2x2, 3x2, 4x3, 4x4) recalculadas al vuelo
   - Cuadrícula llena: una tira interna entre cada par de tiras de la variante
   - Tiras salidas largas con rabito doblado; con refuerzo al motor también
     se alargan las internas (Competition y Elite Pro)
   - Refuerzo sándwich: dos capas del mismo ancho, cada una con su color
   - Textura de nylon (webbing), costura industrial "caja con X"
   - Tejido real: cada tira sube y baja en los cruces, con oclusión
   - Parche opcional: machote de brochazos con colores libres y textos con contorno
   ===================================================================== */
(function(){
  const mount = document.getElementById('cfgCanvas');
  if (!mount || typeof THREE === 'undefined') return;

  /* ---------------- utilidades ---------------- */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const cosEase = t => 0.5 - 0.5 * Math.cos(Math.PI * clamp(t, 0, 1));
  const hexStr = h => '#' + h.toString(16).padStart(6, '0');
  function rng(seed){
    return function(){
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  const linColor = hex => new THREE.Color(hex).convertSRGBToLinear();

  /* ---------------- catálogos ---------------- */
  // Primero los básicos (en este orden), después los colores fantasía
  const PALETTE = [
    { name:'Negro', hex:0x1a1a1a }, { name:'Rojo', hex:0xE60000 }, { name:'Azul', hex:0x1E3AF2 },
    { name:'Amarillo', hex:0xFFE100 }, { name:'Naranja', hex:0xFF4500 }, { name:'Verde', hex:0x0FA03C },
    { name:'Blanco', hex:0xF2F2F2 }, { name:'Gris claro', hex:0xB8C2CC }, { name:'Gris', hex:0x8A8A8A },
    { name:'Gris oscuro', hex:0x3A3A3A }, { name:'Cian', hex:0x00B7EB }, { name:'Azul marino', hex:0x14234B },
    { name:'Turquesa', hex:0x00BFA5 }, { name:'Verde neón', hex:0x39FF14 }, { name:'Amarillo neón', hex:0xDFFF00 },
    { name:'Rosa', hex:0xFF1493 }, { name:'Morado', hex:0x8A2BE2 }, { name:'Lila', hex:0xB98CFF },
    { name:'Vino', hex:0x7A0A1E }, { name:'Café', hex:0x6B4226 }
  ];
  const BASICS = 6;
  const colorName = hex => (PALETTE.find(c => c.hex === hex) || {}).name || hexStr(hex);

  const VARIANTS = { '2x2':[2,2], '3x2':[3,2], '4x3':[4,3], '4x4':[4,4] };
  const MODELS = {
    elite:       { name:'Elite Pro',   sandwich:true,  motor:true  },
    competition: { name:'Competition', sandwich:false, motor:true  },
    sport:       { name:'Sport',       sandwich:false, motor:false }
  };
  const STYLES = { piloto:'Piloto', custom:'100% Custom' };

  const state = {
    variant:'4x4', model:'elite', sandwich:true, motor:true,
    // main/accent = capa de arriba; mainBot/accentBot = capa de abajo (solo con sándwich)
    main:0xE60000, mainBot:0xE60000, accent:0x1a1a1a, accentBot:0x1a1a1a, thread:0xF2F2F2,
    patch:true, pBase:0x1a1a1a, pBrush:0xE60000, pDrip:0x3A3A3A, style:'piloto',
    nombre:'NOMBRE', numero:'31', marca:'MARCA', modelo:'450R'
  };

  /* ---------------- escena ---------------- */
  let W = mount.clientWidth || 600, H = mount.clientHeight || 480;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, W / H, 0.1, 100);
  const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true, preserveDrawingBuffer:true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(W, H);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  mount.appendChild(renderer.domElement);
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  scene.add(new THREE.HemisphereLight(0xffffff, 0x3a3530, 0.65));
  const key = new THREE.DirectionalLight(0xffffff, 1.25);
  key.position.set(2.5, 3.5, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left:-5, right:5, top:5, bottom:-5, near:0.5, far:20 });
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.012;
  key.shadow.radius = 3;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xff6a4d, 0.45); rim.position.set(-5, -2, -3); scene.add(rim);
  const fill = new THREE.DirectionalLight(0xc8d8ff, 0.4); fill.position.set(-4, 3, 3); scene.add(fill);
  const backL = new THREE.DirectionalLight(0xffffff, 0.5); backL.position.set(0, 1, -6); scene.add(backL);

  const netGroup = new THREE.Group();
  scene.add(netGroup);

  /* ---------------- textura de nylon (webbing) ---------------- */
  function makeWebbingCanvas(){
    const c = document.createElement('canvas'); c.width = 128; c.height = 256;
    const g = c.getContext('2d'); const r = rng(9);
    g.fillStyle = '#f0f0f0'; g.fillRect(0, 0, 128, 256);
    // hilos longitudinales
    for (let x = 0; x < 128; x += 2){
      const v = 215 + Math.floor(r() * 40);
      g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, 0, 1, 256);
    }
    // sarga: costillas diagonales (periodo 8 px, repite en vertical)
    g.lineWidth = 2.2;
    for (let y = -128; y < 400; y += 8){
      g.strokeStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.moveTo(0, y); g.lineTo(128, y + 48); g.stroke();
      g.strokeStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.moveTo(0, y + 3.5); g.lineTo(128, y + 51.5); g.stroke();
    }
    // orillos más densos
    [0, 118].forEach(x0 => {
      g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(x0, 0, 10, 256);
      for (let y = 0; y < 256; y += 4){ g.fillStyle = 'rgba(255,255,255,0.45)'; g.fillRect(x0, y, 10, 1.5); }
    });
    // ruido de fibra
    const id = g.getImageData(0, 0, 128, 256);
    for (let i = 0; i < id.data.length; i += 4){
      const n = (r() - 0.5) * 22;
      id.data[i] += n; id.data[i+1] += n; id.data[i+2] += n;
    }
    g.putImageData(id, 0, 0);
    return c;
  }
  const webCanvas = makeWebbingCanvas();
  function webTex(srgb){
    const t = new THREE.CanvasTexture(webCanvas);
    t.wrapS = THREE.ClampToEdgeWrapping; t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = maxAniso;
    if (srgb) t.encoding = THREE.sRGBEncoding;
    return t;
  }
  const webMap = webTex(true), webBump = webTex(false);

  function strapMaterial(hex){
    return new THREE.MeshStandardMaterial({
      color: linColor(hex), map: webMap, bumpMap: webBump, bumpScale: 0.015,
      roughness: 0.82, metalness: 0.0, vertexColors: true
    });
  }
  const mainMat = strapMaterial(state.main);
  const accentMat = strapMaterial(state.accent);
  const mainBotMat = strapMaterial(state.mainBot);
  const accentBotMat = strapMaterial(state.accentBot);
  const threadMat = new THREE.MeshStandardMaterial({ color: linColor(state.thread), roughness: 0.55 });

  /* ---------------- costura industrial (caja con X) ---------------- */
  function stitchLine(g, x1, y1, x2, y2, len, gap, w, color){
    const L = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / L, uy = (y2 - y1) / L;
    const px = -uy, py = ux;
    g.lineCap = 'round';
    for (let d = gap * 0.5; d < L - 2; d += len + gap){
      const e = Math.min(L, d + len);
      const ax = x1 + ux * d, ay = y1 + uy * d, bx = x1 + ux * e, by = y1 + uy * e;
      const seg = (dx, dy, col, lw) => { g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); g.moveTo(ax + dx, ay + dy); g.lineTo(bx + dx, by + dy); g.stroke(); };
      seg(1.2, 1.8, 'rgba(0,0,0,0.55)', w + 2.5);          // sombra
      seg(0, 0, color, w);                                   // hilo
      seg(0, 0, 'rgba(0,0,0,0.18)', w * 0.25);                // torsión
      seg(-px * w * 0.22, -py * w * 0.22, 'rgba(255,255,255,0.55)', w * 0.3); // brillo
      g.fillStyle = 'rgba(0,0,0,0.65)';                      // agujeros de aguja
      [[ax, ay], [bx, by]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, w * 0.32, 0, Math.PI * 2); g.fill(); });
    }
  }
  function boxX(g, x0, y0, x1, y1, color, len, gap, w){
    stitchLine(g, x0, y0, x1, y0, len, gap, w, color);
    stitchLine(g, x1, y0, x1, y1, len, gap, w, color);
    stitchLine(g, x1, y1, x0, y1, len, gap, w, color);
    stitchLine(g, x0, y1, x0, y0, len, gap, w, color);
    stitchLine(g, x0, y0, x1, y1, len, gap, w, color);
    stitchLine(g, x1, y0, x0, y1, len, gap, w, color);
  }
  function zigzag(g, x0, x1, y, amp, color, w){
    const n = 9; let px = x0, py = y - amp;
    for (let i = 1; i <= n; i++){
      const nx = x0 + (x1 - x0) * i / n, ny = y + (i % 2 ? amp : -amp);
      stitchLine(g, px, py, nx, ny, 100, 1, w, color);
      px = nx; py = ny;
    }
  }
  const crossCanvas = document.createElement('canvas'); crossCanvas.width = crossCanvas.height = 256;
  const denseCanvas = document.createElement('canvas'); denseCanvas.width = 256; denseCanvas.height = 512;
  function paintStitches(){
    const col = hexStr(state.thread);
    let g = crossCanvas.getContext('2d');
    g.clearRect(0, 0, 256, 256);
    boxX(g, 26, 26, 230, 230, col, 17, 6, 6.5);

    g = denseCanvas.getContext('2d');
    g.clearRect(0, 0, 256, 512);
    // doble caja perimetral
    const rect = (m, len) => {
      stitchLine(g, m, m, 256 - m, m, len, 5, 6, col);
      stitchLine(g, 256 - m, m, 256 - m, 512 - m, len, 5, 6, col);
      stitchLine(g, 256 - m, 512 - m, m, 512 - m, len, 5, 6, col);
      stitchLine(g, m, 512 - m, m, m, len, 5, 6, col);
    };
    rect(14, 13); rect(34, 13);
    // dos cajas con X
    boxX(g, 54, 110, 202, 250, col, 13, 5, 5.5);
    boxX(g, 54, 262, 202, 402, col, 13, 5, 5.5);
    // barras de refuerzo (bartack) en los extremos
    zigzag(g, 50, 206, 62, 12, col, 5);
    zigzag(g, 50, 206, 84, 12, col, 5);
    zigzag(g, 50, 206, 428, 12, col, 5);
    zigzag(g, 50, 206, 450, 12, col, 5);
  }
  paintStitches();
  function decalMaterial(canvas){
    const t = new THREE.CanvasTexture(canvas);
    t.encoding = THREE.sRGBEncoding; t.anisotropy = maxAniso;
    return new THREE.MeshStandardMaterial({
      map: t, transparent: true, alphaTest: 0.08, depthWrite: false, roughness: 0.6,
      polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4
    });
  }
  const crossMat = decalMaterial(crossCanvas);
  const denseMat = decalMaterial(denseCanvas);

  /* ---------------- geometría de una tira (con grosor real) ---------------- */
  // o = { axis:'v'|'h', fixed, from, to, width, thick, zf(p), offset, ao(p) }
  // Sección transversal con cantos redondeados (webbing real)
  const PROF = [[1,0.58],[0.8,1],[-0.8,1],[-1,0.58],[-1,-0.58],[-0.8,-1],[0.8,-1],[1,-0.58]];
  function buildRibbon(o){
    const step = 0.016;
    const n = o.curve ? (o.samples || 90) : Math.max(2, Math.ceil((o.to - o.from) / step));
    const S = o.axis === 'v' ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    const rings = [];
    let arc = 0, prev = null;
    for (let k = 0; k <= n; k++){
      let pp, zz, dp, dz;
      if (o.curve){
        const u = k / n, e = 0.0015;
        const c0 = o.curve(u), c1 = o.curve(Math.min(1, u + e)), c2 = o.curve(Math.max(0, u - e));
        pp = c0[0]; zz = c0[1];
        dp = c1[0] - c2[0]; dz = c1[1] - c2[1];
      } else {
        pp = o.from + (o.to - o.from) * k / n;
        zz = o.zf(pp);
        dp = 0.008; dz = o.zf(pp + 0.004) - o.zf(pp - 0.004);
      }
      const c = o.axis === 'v' ? new THREE.Vector3(o.fixed, pp, zz) : new THREE.Vector3(pp, o.fixed, zz);
      const tl = Math.hypot(dp, dz) || 1;
      const ty = dp / tl, tz = dz / tl;
      const N = (o.axis === 'v' ? new THREE.Vector3(0, -tz, ty) : new THREE.Vector3(-tz, 0, ty)).normalize();
      if (o.offset) c.addScaledVector(N, -o.offset);
      if (prev) arc += c.distanceTo(prev);
      prev = c.clone();
      rings.push({ c, N, p: o.curve ? arc + o.from : pp, ao: o.ao ? o.ao(o.curve ? pp : pp) : 1 });
    }
    const hw = o.width / 2, ht = o.thick / 2, M = PROF.length;
    const corner = (r, q) => r.c.clone().addScaledVector(S, q[0] * hw).addScaledVector(r.N, q[1] * ht);
    const pos = [], uv = [], col = [], idx = [];
    const uRep = o.width * 2.4;
    for (let i = 0; i < M; i++){
      const a1 = PROF[i], b1 = PROF[(i + 1) % M];
      const ex = (b1[0] - a1[0]) * hw, ey = (b1[1] - a1[1]) * ht;
      const el = Math.hypot(ex, ey) || 1;
      const nx = ey / el, ny = -ex / el;
      const face = 0.7 + 0.3 * Math.abs(ny);
      const base = pos.length / 3;
      rings.forEach(r => {
        const A = corner(r, a1), B = corner(r, b1);
        pos.push(A.x, A.y, A.z, B.x, B.y, B.z);
        const v = (r.p - o.from) / uRep;
        uv.push((a1[0] + 1) / 2, v, (b1[0] + 1) / 2, v);
        const sh = face * r.ao;
        col.push(sh, sh, sh, sh, sh, sh);
      });
      const out = S.clone().multiplyScalar(nx).addScaledVector(rings[0].N, ny);
      const A0 = corner(rings[0], a1), B0 = corner(rings[0], b1), A1 = corner(rings[1], a1);
      const nrm = new THREE.Vector3().subVectors(B0, A0).cross(new THREE.Vector3().subVectors(A1, A0));
      const flip = nrm.dot(out) < 0;
      for (let k = 0; k < n; k++){
        const A = base + 2 * k, B = A + 1, C = A + 2, D = A + 3;
        if (!flip) idx.push(A, B, C, B, D, C); else idx.push(A, C, B, B, C, D);
      }
    }
    [[rings[0], -1], [rings[n], 1]].forEach(([r, sgn]) => {
      const base = pos.length / 3;
      PROF.forEach(q => { const c = corner(r, q); pos.push(c.x, c.y, c.z); uv.push((q[0] + 1) / 2, 0); const sh = 0.85 * r.ao; col.push(sh, sh, sh); });
      const T = new THREE.Vector3().subVectors(rings[1].c, rings[0].c).multiplyScalar(sgn);
      const c0 = corner(r, PROF[0]), c1 = corner(r, PROF[1]), c2 = corner(r, PROF[2]);
      const nrm = new THREE.Vector3().subVectors(c1, c0).cross(new THREE.Vector3().subVectors(c2, c0));
      const fwd = nrm.dot(T) >= 0;
      for (let i = 1; i < M - 1; i++){
        if (fwd) idx.push(base, base + i, base + i + 1); else idx.push(base, base + i + 1, base + i);
      }
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
  }

  // Doblez del rabito (media caña) y gasa plástica
  function whiteColors(geo, v){
    const n = geo.attributes.position.count, arr = new Float32Array(n * 3).fill(v === undefined ? 1 : v);
    geo.setAttribute('color', new THREE.Float32BufferAttribute(arr, 3));
    return geo;
  }
  function orientGeo(geo, axis, dir, px, py, pz){
    const U = axis === 'v' ? new THREE.Vector3(0, dir, 0) : new THREE.Vector3(dir, 0, 0);
    const V = new THREE.Vector3(0, 0, 1);
    const Wv = new THREE.Vector3().crossVectors(U, V);
    const m = new THREE.Matrix4().makeBasis(U, V, Wv);
    m.setPosition(px, py, pz);
    geo.applyMatrix4(m);
    return geo;
  }
  function makeFold(R, r, width){
    const sh = new THREE.Shape();
    sh.moveTo(0, -R);
    sh.absarc(0, 0, R, -Math.PI / 2, Math.PI / 2, false);
    sh.lineTo(0, r);
    sh.absarc(0, 0, r, Math.PI / 2, -Math.PI / 2, true);
    sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: width, bevelEnabled: false, curveSegments: 18 });
    g.translate(0, 0, -width / 2);
    return g;
  }
  function roundRectPath(path, w, h, r){
    const x = w / 2, y = h / 2;
    path.moveTo(-x + r, -y);
    path.lineTo(x - r, -y); path.quadraticCurveTo(x, -y, x, -y + r);
    path.lineTo(x, y - r);  path.quadraticCurveTo(x, y, x - r, y);
    path.lineTo(-x + r, y); path.quadraticCurveTo(-x, y, -x, y - r);
    path.lineTo(-x, -y + r);path.quadraticCurveTo(-x, -y, -x + r, -y);
    return path;
  }
  function makeKeeper(w, hgt, wall, depth){
    const sh = new THREE.Shape();
    roundRectPath(sh, w + wall * 2, hgt + wall * 2, wall * 1.6);
    const hole = new THREE.Path();
    roundRectPath(hole, w, hgt, wall * 0.8);
    sh.holes.push(hole);
    const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 2, curveSegments: 8 });
    g.translate(0, 0, -depth / 2);
    return g;
  }
  const plasticMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.42, metalness: 0.05 });

  // Perfil de altura: la tira sube (+) o baja (−) en cada cruce, plana sobre el cruce
  function makeProfile(knots, amp, h, decay, slopeA, slopeB){
    const n = knots.length;
    const ease = d => d < decay ? (d * d) / (2 * decay) : d - decay / 2;
    return function(p){
      if (p <= knots[0].q - h) return knots[0].s * amp - (slopeA || 0) * ease((knots[0].q - h) - p);
      if (p >= knots[n - 1].q + h) return knots[n - 1].s * amp - (slopeB || 0) * ease(p - (knots[n - 1].q + h));
      for (let j = 0; j < n; j++) if (Math.abs(p - knots[j].q) <= h) return knots[j].s * amp;
      for (let j = 0; j < n - 1; j++){
        const a = knots[j].q + h, b = knots[j + 1].q - h;
        if (p > a && p < b) return amp * (knots[j].s + (knots[j + 1].s - knots[j].s) * cosEase((p - a) / (b - a)));
      }
      return 0;
    };
  }
  // Oclusión: la tira se oscurece donde pasa por debajo de otra
  function makeAO(knots, sw){
    return function(p){
      let f = 1;
      knots.forEach(k => {
        if (k.s > 0) return;
        const d = Math.abs(p - k.q) / (sw * 0.85);
        if (d < 1) f = Math.min(f, 1 - 0.34 * Math.pow(1 - d, 1.3));
      });
      return f;
    };
  }

  /* ---------------- parche ---------------- */
  const patchCanvas = document.createElement('canvas');
  patchCanvas.width = patchCanvas.height = 1024;
  const patchTex = new THREE.CanvasTexture(patchCanvas);
  patchTex.encoding = THREE.sRGBEncoding; patchTex.anisotropy = maxAniso;
  const patchFront = new THREE.MeshStandardMaterial({ map: patchTex, roughness: 0.62, emissive: 0xffffff, emissiveMap: patchTex, emissiveIntensity: 0.32 });
  const patchEdge = new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.9 });
  const patchBack = new THREE.MeshStandardMaterial({ color: 0x1b1b1b, roughness: 0.95, map: webMap });

  function brush(g, cx, cy, len, w, ang, color, r, hole, taperEnd){
    const ux = Math.cos(ang), uy = Math.sin(ang), nx = -uy, ny = ux;
    const seg = 34, L = [], R = [];
    let jl = 0, jr = 0;
    for (let i = 0; i <= seg; i++){
      const t = i / seg, d = (t - 0.5) * len;
      const tp = taperEnd ? Math.max(0.04, Math.min(1, t * 1.4, (1 - t) * 9)) : Math.max(0.04, Math.min(1, t * 5, (1 - t) * 2.6));
      jl = clamp(jl + (r() - 0.5) * 0.34, -0.42, 0.42);
      jr = clamp(jr + (r() - 0.5) * 0.34, -0.42, 0.42);
      const hw = w * 0.5 * tp, px = cx + ux * d, py = cy + uy * d;
      L.push([px + nx * hw * (1 + jl), py + ny * hw * (1 + jl)]);
      R.push([px - nx * hw * (1 + jr), py - ny * hw * (1 + jr)]);
    }
    g.fillStyle = color;
    g.beginPath();
    L.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y));
    R.reverse().forEach(([x, y]) => g.lineTo(x, y));
    g.closePath(); g.fill();
    // cerdas: trazos finos que se escapan de la punta
    g.strokeStyle = color; g.lineCap = 'round';
    const bristles = 2 + Math.floor(r() * 6);
    for (let b = 0; b < bristles; b++){
      const off = (r() - 0.5) * w * 0.9, st = 0.3 + r() * 0.2, bl = len * (0.15 + r() * 0.45);
      g.lineWidth = 1.5 + r() * Math.max(2, w * 0.08);
      const sx = cx + ux * len * st + nx * off, sy = cy + uy * len * st + ny * off;
      g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + ux * bl, sy + uy * bl); g.stroke();
    }
    // salpicaduras
    g.fillStyle = color;
    const dots = Math.floor(r() * 16);
    for (let k = 0; k < dots; k++){
      const d = (r() - 0.5) * len, o = (r() < 0.5 ? -1 : 1) * (w * 0.5 + r() * 46);
      const rad = 1 + r() * 6;
      g.beginPath(); g.ellipse(cx + ux * d + nx * o, cy + uy * d + ny * o, rad * 1.6, rad, ang, 0, Math.PI * 2); g.fill();
    }
    // huecos grunge dentro del trazo
    g.fillStyle = hole;
    const holes = Math.floor(r() * 7 * (w / 60));
    for (let k = 0; k < holes; k++){
      const d = (r() - 0.5) * len * 0.8, o = (r() - 0.5) * w * 0.6, rad = 1 + r() * 4;
      g.beginPath(); g.ellipse(cx + ux * d + nx * o, cy + uy * d + ny * o, rad * 2.2, rad, ang, 0, Math.PI * 2); g.fill();
    }
  }

  function paintBackground(g, T){
    const S = 1024, r = rng(T.seed);
    if (T.grad){
      const gr = g.createLinearGradient(0, S * 0.75, S, S * 0.25);
      T.grad.forEach((c, i) => gr.addColorStop(i / (T.grad.length - 1), c));
      g.fillStyle = gr;
    } else g.fillStyle = T.base;
    g.fillRect(0, 0, S, S);
    const ang = -Math.PI * 0.31;
    for (let k = 0; k < 30; k++){
      const color = T.strokes[Math.floor(r() * T.strokes.length)];
      brush(g, -150 + r() * (S + 300), -80 + r() * (S + 160), 450 + r() * 950, 16 + r() * 120,
            ang + (r() - 0.5) * 0.12, color, r, T.hole, false);
    }
    // goteos oscuros desde abajo
    for (let x = -30; x < S + 30;){
      const w = 16 + r() * 50, len = 140 + r() * 300;
      const a = -Math.PI / 2 + (r() - 0.5) * 0.22;
      brush(g, x + Math.cos(a) * len * 0.5, S + 20 + Math.sin(a) * len * 0.5, len, w, a, T.drip, r, T.hole, true);
      x += w * (0.5 + r() * 1.1);
    }
    // manchas oscuras desde arriba (lado izquierdo)
    for (let x = 60; x < S * 0.6;){
      const w = 18 + r() * 40, len = 80 + r() * 200;
      const a = -Math.PI * 0.35 + (r() - 0.5) * 0.2;
      brush(g, x, 40 + r() * 60, len, w, a, T.drip, r, T.hole, false);
      x += w * (1 + r() * 2.5);
    }
    // viñeta suave
    const vg = g.createRadialGradient(S / 2, S / 2, S * 0.35, S / 2, S / 2, S * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.35)');
    g.fillStyle = vg; g.fillRect(0, 0, S, S);
  }

  function fitSize(g, text, fontFn, maxW, maxSize){
    let size = maxSize;
    g.font = fontFn(size);
    const w = g.measureText(text).width;
    if (w > maxW) size = Math.floor(size * maxW / w);
    g.font = fontFn(size);
    return { size, width: g.measureText(text).width };
  }
  function outlined(g, text, x, y, o){
    if (!text) return;
    g.save();
    g.font = o.font; g.textAlign = o.align || 'left'; g.textBaseline = 'alphabetic';
    g.lineJoin = 'round'; g.miterLimit = 2;
    if (o.shadow){
      g.fillStyle = g.strokeStyle = o.shadow.color;
      g.lineWidth = o.strokes[0].w;
      g.strokeText(text, x + o.shadow.dx, y + o.shadow.dy);
      g.fillText(text, x + o.shadow.dx, y + o.shadow.dy);
    }
    o.strokes.forEach(s => { g.strokeStyle = s.c; g.lineWidth = s.w; g.strokeText(text, x, y); });
    g.fillStyle = o.fill; g.fillText(text, x, y);
    g.restore();
  }
  const F = {
    marker: s => `400 ${s}px "Permanent Marker", "Arial Black", sans-serif`,
    rye:    s => `400 ${s}px Rye, "Arial Black", serif`,
    slab:   s => `400 ${s}px "Alfa Slab One", "Arial Black", serif`,
    ultra:  s => `400 ${s}px Ultra, "Alfa Slab One", "Arial Black", serif`,
    logo:   s => `italic 400 ${s}px BPImperial, "Arial Black", sans-serif`
  };
  function logoSize(g, scale){
    g.font = F.logo(88 * scale); const rw = g.measureText('RACING').width;
    g.font = F.logo(150 * scale); const nw = g.measureText('NETS').width;
    return { rw, nw, w: rw + 6 * scale + nw };
  }
  function drawLogo(g, x, y, scale){
    const m = logoSize(g, scale);
    const st = [{ c:'#000', w:26 * scale }, { c:'#000', w:14 * scale }];
    outlined(g, 'RACING', x, y - 30 * scale, { font: F.logo(88 * scale), fill:'#fff', strokes: st });
    outlined(g, 'NETS', x + m.rw + 6 * scale, y + 26 * scale, { font: F.logo(150 * scale), fill:'#fff', strokes: st });
    return m;
  }

  // Machote del parche (brochazos + goteos) con los tres colores que elige el cliente
  function patchTheme(){
    const b = hexStr(state.pBase), s = hexStr(state.pBrush), d = hexStr(state.pDrip);
    return { seed:31, base:b, strokes:[s, s, s, d], drip:d, hole:b };
  }

  function paintPatch(){
    const g = patchCanvas.getContext('2d'), S = 1024;
    g.clearRect(0, 0, S, S);
    paintBackground(g, patchTheme());

    if (state.style === 'custom'){
      const a = fitSize(g, '100%', F.slab, 520, 210);
      outlined(g, '100%', S / 2 - 10, 440, { font: F.slab(a.size), fill:'#fff', align:'center',
        strokes:[{ c:'#000', w:44 }], shadow:{ dx:-14, dy:16, color:'#000' } });
      const b = fitSize(g, 'CUSTOM', F.slab, 720, 220);
      outlined(g, 'CUSTOM', S / 2 - 20, 630, { font: F.slab(b.size), fill:'#fff', align:'center',
        strokes:[{ c:'#000', w:44 }], shadow:{ dx:-14, dy:16, color:'#000' } });
      const lm = logoSize(g, 0.95);
      drawLogo(g, S / 2 + 330 - lm.w, 760, 0.95);
    } else {
      const nombre = state.nombre.trim().toUpperCase();
      const numero = state.numero.trim().toUpperCase();
      const marca = state.marca.trim().toUpperCase();
      const modelo = state.modelo.trim().toUpperCase();

      // Fila 1: nombre + número
      const gap = nombre && numero ? 26 : 0;
      g.font = F.ultra(200); let numW = numero ? g.measureText(numero).width : 0;
      let numSize = 200;
      if (numW > 280){ numSize = Math.floor(200 * 280 / numW); g.font = F.ultra(numSize); numW = g.measureText(numero).width; }
      const nm = nombre ? fitSize(g, nombre, F.marker, 830 - numW - gap, 175) : { size:0, width:0 };
      const rowW = nm.width + gap + numW;
      let x = S / 2 - rowW / 2;
      const y1 = 345;
      outlined(g, nombre, x, y1, { font: F.marker(nm.size), fill:'#fff',
        strokes:[{ c:'#000', w:36 }], shadow:{ dx:-6, dy:8, color:'#000' } });
      x += nm.width + gap;
      if (numero){
        // bloque negro detrás del número
        g.fillStyle = '#000';
        g.fillRect(x - 16, y1 - numSize * 0.78, numW + 32, numSize * 0.9);
        outlined(g, numero, x, y1 + numSize * 0.02, { font: F.ultra(numSize), fill:'#fff', strokes:[{ c:'#000', w:20 }] });
      }

      // Fila 2: marca
      if (marca){
        const mk = fitSize(g, marca, F.rye, 820, 280);
        outlined(g, marca, S / 2, 580, { font: F.rye(mk.size), fill:'#fff', align:'center',
          strokes:[{ c:'#000', w:40 }], shadow:{ dx:-8, dy:10, color:'#000' } });
      }

      // Fila 3: modelo (450 + R) y logo
      const m = modelo.match(/^([0-9]*)(.*)$/) || ['', modelo, ''];
      let digits = m[1], suffix = m[2];
      if (!digits && suffix){ digits = suffix; suffix = ''; }
      const lm = logoSize(g, 1.05);
      const y3 = 790;
      if (digits){
        const dm = fitSize(g, digits, F.slab, 440 - (suffix ? 70 : 0), 215);
        g.font = F.slab(90); const sw = suffix ? g.measureText(suffix).width : 0;
        const total = dm.width + (suffix ? sw * 0.6 : 0) + 30 + lm.w;
        const k = Math.min(1, 830 / total);
        g.save();
        g.translate(S / 2, y3); g.scale(k, k);
        const x3 = -total / 2;
        outlined(g, digits, x3, 0, { font: F.slab(dm.size), fill:'#1c1c1c',
          strokes:[{ c:'#000', w:40 }, { c:'#bdbdbd', w:22 }] });
        if (suffix){
          outlined(g, suffix, x3 + dm.width - sw * 0.4, 44, { font: F.slab(90), fill:'#111',
            strokes:[{ c:'#fff', w:24 }, { c:'#e60000', w:12 }] });
        }
        drawLogo(g, x3 + dm.width + (suffix ? sw * 0.6 : 0) + 30, -40, 1.05);
        g.restore();
      } else {
        drawLogo(g, S / 2 - lm.w / 2, y3 - 40, 1.05);
      }
    }

    // textura de tela impresa + costura perimetral
    g.save();
    g.globalAlpha = 0.07; g.strokeStyle = '#fff'; g.lineWidth = 1;
    for (let i = -S; i < S * 2; i += 6){ g.beginPath(); g.moveTo(i, 0); g.lineTo(i + S * 0.5, S); g.stroke(); }
    g.restore();
    g.lineWidth = 14; g.strokeStyle = '#050505'; g.strokeRect(7, 7, S - 14, S - 14);
    const tc = hexStr(state.thread), m2 = 32;
    stitchLine(g, m2, m2, S - m2, m2, 20, 9, 6, tc);
    stitchLine(g, S - m2, m2, S - m2, S - m2, 20, 9, 6, tc);
    stitchLine(g, S - m2, S - m2, m2, S - m2, 20, 9, 6, tc);
    stitchLine(g, m2, S - m2, m2, m2, 20, 9, 6, tc);

    patchTex.needsUpdate = true;
    const pv = document.getElementById('cfgPatchPreview');
    if (pv){ const pg = pv.getContext('2d'); pg.clearRect(0, 0, pv.width, pv.height); pg.drawImage(patchCanvas, 0, 0, pv.width, pv.height); }
  }

  /* ---------------- construcción de la malla ---------------- */
  const SW = 0.46, TH = 0.045, EXT = 1.35, GAP = 0.006;
  let fitHalf = { w: 3, h: 3 };
  let patchMesh = null;

  function clearNet(){
    const olds = netGroup.children.slice();
    olds.forEach(o => { netGroup.remove(o); if (o.geometry) o.geometry.dispose(); });
  }
  function addMesh(geo, mat, shadow = true){
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = shadow; m.receiveShadow = true;
    netGroup.add(m);
    return m;
  }

  // Rabito: la punta sale, da la vuelta en U hacia atrás y regresa por detrás
  function addTail(st, dir, endP, zf, width, L1, L2, tack){
    const t = TH, zEnd = zf(endP), R = t * 1.25;
    const arcLen = Math.PI * R, total = L1 + arcLen + L2;
    const curve = u => {
      const d = u * total;
      if (d <= L1) return [endP + dir * d, zEnd];
      if (d <= L1 + arcLen){
        const ang = (d - L1) / R;
        return [endP + dir * (L1 + Math.sin(ang) * R), zEnd - (R - Math.cos(ang) * R)];
      }
      const d3 = d - L1 - arcLen;
      return [endP + dir * (L1 - d3), zEnd - 2 * R];
    };
    addMesh(buildRibbon({ axis: st.axis, fixed: st.fixed, from: 0, to: total, width,
      thick: t, curve, samples: 110, ao: () => 0.95 }), st.mat);

    // costura que fija la punta del rabito
    if (tack){
      const tipP = endP + dir * (L1 - L2);
      const sx = st.axis === 'v' ? st.fixed : tipP + dir * width * 0.5;
      const sy = st.axis === 'v' ? tipP + dir * width * 0.5 : st.fixed;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.8, width * 0.8), crossMat);
      m.position.set(sx, sy, zEnd - 2 * R - t * 0.5 - 0.002);
      m.rotation.y = Math.PI;
      m.renderOrder = 2;
      netGroup.add(m);
    }
    return { zEnd, R };
  }

  function buildNet(){
    clearNet();
    const [nV, nH] = VARIANTS[state.variant];
    const s = Math.min(1.7, 3.4 / Math.max(nV - 1, nH - 1));
    const bw = (nV - 1) * s, bh = (nH - 1) * s;
    const xs = Array.from({ length: nV }, (_, i) => -bw / 2 + i * s);
    const ys = Array.from({ length: nH }, (_, j) => -bh / 2 + j * s);
    const sand = state.sandwich, motor = state.motor;
    // Cuadrícula llena: entre cada par de tiras de la variante va una tira interna
    const mids = a => a.slice(1).map((v, i) => (v + a[i]) / 2);
    const allX = xs.concat(mids(xs)).sort((a, b) => a - b);
    const allY = ys.concat(mids(ys)).sort((a, b) => a - b);
    const mainX = new Set(xs), mainY = new Set(ys);
    const t = TH;
    const amp = sand ? t * 1.3 + GAP : t * 0.6 + 0.004;
    const h = SW * 0.51, decay = 0.32;
    const layer2 = t + GAP;
    const edgeStitches = [];

    // Tejido alterno: en cada cruce una tira va arriba y la otra abajo (como damero),
    // así con la cuadrícula llena se ven los colores de verticales y horizontales
    const over = (i, j) => (i + j) % 2 === 0 ? 1 : -1;
    const rnd = rng(31 + nV * 13 + nH * 7);
    const straps = [];
    allX.forEach((x, i) => straps.push({ axis:'v', fixed:x, mat: mainMat, bot: mainBotMat, main: mainX.has(x),
      knots: allY.map((q, j) => ({ q, s: over(i, j) })) }));
    allY.forEach((y, j) => straps.push({ axis:'h', fixed:y, mat: accentMat, bot: accentBotMat, main: mainY.has(y),
      knots: allX.map((q, i) => ({ q, s: -over(i, j) })) }));

    straps.forEach(st => {
      const kn = st.knots, first = kn[0].q, last = kn[kn.length - 1].q;
      const slopeA = Math.tan((4 + rnd() * 6) * Math.PI / 180);
      const slopeB = Math.tan((4 + rnd() * 6) * Math.PI / 180);
      const ao = makeAO(kn, SW);

      // Qué puntas salen largas: las tiras de la variante siempre; las internas solo con
      // refuerzo al motor (verticales por arriba, horizontales por los dos lados).
      // Las que no salen terminan justo en la orilla de la red.
      const longA = st.main || (motor && st.axis === 'h');
      const longB = st.main || motor;
      const from = longA ? first - EXT : first - h - 0.02;
      const to = longB ? last + EXT : last + h + 0.02;
      const zf = makeProfile(kn, amp, h, decay, longA ? slopeA : 0, longB ? slopeB : 0);
      addMesh(buildRibbon({ axis: st.axis, fixed: st.fixed, from, to, width: SW, thick: t, zf, ao }), st.mat);

      // Refuerzo sándwich: segunda tira del mismo ancho pegada por debajo, con su propio color
      // (capa de arriba = la del lado del parche, capa de abajo = la de atrás)
      if (sand){
        addMesh(buildRibbon({ axis: st.axis, fixed: st.fixed, from, to,
          width: SW, thick: t, zf, offset: layer2, ao }), st.bot);
        for (let p = first - h; p <= last + h; p += 0.075){
          const underHere = kn.some(k => k.s < 0 && Math.abs(p - k.q) < h * 1.15);
          if (underHere) continue;
          [-1, 1].forEach(side => edgeStitches.push({ st, p, side, zf }));
        }
      }

      // Tiras largas: refuerzo al motor y rabito doblado
      [[-1, longA], [1, longB]].forEach(([dir, isLong]) => {
        if (!isLong) return;
        const endP = dir > 0 ? to : from;
        const bodyEdge = dir > 0 ? last + h + decay : first - h - decay;

        if (motor){
          const p1 = bodyEdge + dir * 0.05, p2 = endP - dir * 0.16;
          const a0 = Math.min(p1, p2), b0 = Math.max(p1, p2);
          addMesh(buildRibbon({ axis: st.axis, fixed: st.fixed, from: a0, to: b0, width: SW * 0.98, thick: t * 0.52,
            zf: p2v => zf(p2v) + t * 0.72 }), st.mat);
        }

        addTail(st, dir, endP, zf, SW, SW * 1.0, SW * 1.55, true);
      });
    });

    // Costura caja-X en cada cruce (frente de la tira de arriba y reverso de la de abajo)
    const cGeo = new THREE.PlaneGeometry(SW * 0.88, SW * 0.88);
    const frontZ = amp + t * 0.5 + 0.0015;
    const backZ = -amp - t * 0.5 - (sand ? layer2 : 0) - 0.0015;
    allX.forEach(x => allY.forEach(y => {
      const f = new THREE.Mesh(cGeo, crossMat); f.position.set(x, y, frontZ);
      const b = new THREE.Mesh(cGeo, crossMat); b.position.set(x, y, backZ); b.rotation.y = Math.PI;
      f.renderOrder = b.renderOrder = 2;
      netGroup.add(f, b);
    }));

    // Costura de orilla del sándwich (instanciada)
    if (edgeStitches.length){
      const sg = new THREE.BoxGeometry(0.045, 0.011, 0.008);
      const inst = new THREE.InstancedMesh(sg, threadMat, edgeStitches.length);
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), X = new THREE.Vector3(1, 0, 0);
      const one = new THREE.Vector3(1, 1, 1);
      edgeStitches.forEach((e, k) => {
        const z = e.zf(e.p) + t * 0.5 + 0.003;
        const dz = (e.zf(e.p + 0.004) - e.zf(e.p - 0.004)) / 0.008;
        const off = e.side * (SW * 0.5 - 0.04);
        let P, T;
        if (e.st.axis === 'v'){ P = new THREE.Vector3(e.st.fixed + off, e.p, z); T = new THREE.Vector3(0, 1, dz); }
        else { P = new THREE.Vector3(e.p, e.st.fixed + off, z); T = new THREE.Vector3(1, 0, dz); }
        q.setFromUnitVectors(X, T.normalize());
        m4.compose(P, q, one);
        inst.setMatrixAt(k, m4);
      });
      inst.castShadow = false;
      netGroup.add(inst);
    }

    // Parche central
    const P = clamp(Math.min(bw, bh) * 0.92, 1.35, 2.2);
    const pd = 0.03;
    patchMesh = addMesh(new THREE.BoxGeometry(P, P, pd), [patchEdge, patchEdge, patchEdge, patchEdge, patchFront, patchBack]);
    patchMesh.position.set(0, 0, amp + t * 0.5 + 0.012 + pd / 2);
    patchMesh.visible = state.patch;

    const tailOut = SW * 1.55;
    fitHalf = { w: bw / 2 + EXT + tailOut, h: bh / 2 + EXT + tailOut };
    updateFit();
    updateBadge();
  }

  /* ---------------- cámara e interacción ---------------- */
  let targetDist = 10, dist = 10, zoom = 1;
  let rotY = 0.45, rotX = -0.22;
  let lastInteract = -1e9;
  function updateFit(){
    const fovV = THREE.MathUtils.degToRad(camera.fov);
    const tanV = Math.tan(fovV / 2), tanH = tanV * camera.aspect;
    const m = 1.16;
    targetDist = Math.max(fitHalf.h * m / tanV, fitHalf.w * m / tanH, 2.2 / tanV) + 0.4;
  }
  const dom = renderer.domElement;
  dom.style.touchAction = 'pan-y';
  const pointers = new Map();
  let pinchD = 0, pinchZ = 1;
  dom.addEventListener('pointerdown', e => {
    try { dom.setPointerCapture(e.pointerId); } catch(_) {}
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    lastInteract = performance.now();
    if (pointers.size === 2){ const [a, b] = [...pointers.values()]; pinchD = Math.hypot(a.x - b.x, a.y - b.y); pinchZ = zoom; }
  });
  dom.addEventListener('pointermove', e => {
    if (!pointers.has(e.pointerId)) return;
    const prev = pointers.get(e.pointerId), cur = { x: e.clientX, y: e.clientY };
    pointers.set(e.pointerId, cur);
    lastInteract = performance.now();
    if (pointers.size === 1){
      rotY += (cur.x - prev.x) * 0.009;
      rotX = clamp(rotX + (cur.y - prev.y) * 0.006, -1.2, 1.2);
    } else if (pointers.size === 2 && pinchD > 0){
      const [a, b] = [...pointers.values()];
      zoom = clamp(pinchZ * pinchD / Math.hypot(a.x - b.x, a.y - b.y), 0.4, 1.6);
    }
  });
  const release = e => { pointers.delete(e.pointerId); if (pointers.size < 2) pinchD = 0; };
  dom.addEventListener('pointerup', release);
  dom.addEventListener('pointercancel', release);
  dom.addEventListener('wheel', e => {
    e.preventDefault();
    zoom = clamp(zoom * (1 + e.deltaY * 0.0012), 0.4, 1.6);
    lastInteract = performance.now();
  }, { passive:false });

  function animate(){
    requestAnimationFrame(animate);
    const now = performance.now();
    if (now - lastInteract > 6000 && pointers.size === 0){
      rotY = ((rotY + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
      const tY = 0.5 * Math.sin(now * 0.00035);
      rotY += (tY - rotY) * 0.02;
      rotX += (-0.22 - rotX) * 0.02;
    }
    netGroup.rotation.set(rotX, rotY, 0);
    dist += (targetDist * zoom - dist) * 0.12;
    camera.position.set(0, dist * 0.06, dist);
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  }

  function resize(){
    W = mount.clientWidth || 600; H = mount.clientHeight || 480;
    camera.aspect = W / H; camera.updateProjectionMatrix();
    renderer.setSize(W, H);
    updateFit();
  }
  if (window.ResizeObserver) new ResizeObserver(resize).observe(mount);
  else window.addEventListener('resize', resize);

  /* ---------------- interfaz ---------------- */
  function updateBadge(){
    const b = document.getElementById('cfgBadge');
    if (b) b.textContent = state.variant.replace('x', '×') + ' · ' + currentModelName();
  }
  const sameAsModel = m => m.sandwich === state.sandwich && m.motor === state.motor;
  function currentModelName(){
    const m = MODELS[state.model];
    if (m && sameAsModel(m)) return m.name;
    return 'Personalizada';
  }
  function segment(containerId, options, current, onPick){
    const c = document.getElementById(containerId);
    if (!c) return;
    c.innerHTML = '';
    Object.entries(options).forEach(([k, label]) => {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = label; b.dataset.key = k;
      if (k === current) b.classList.add('active');
      b.addEventListener('click', () => {
        c.querySelectorAll('button').forEach(x => x.classList.toggle('active', x === b));
        onPick(k);
      });
      c.appendChild(b);
    });
  }
  function setSegActive(containerId, key){
    const c = document.getElementById(containerId);
    if (c) c.querySelectorAll('button').forEach(x => x.classList.toggle('active', x.dataset.key === key));
  }
  // Fila de colores: básicos arriba, fantasía abajo, y el nombre del elegido junto al título
  function swatches(containerId, current, onPick){
    const c = document.getElementById(containerId);
    if (!c) return;
    const label = c.parentElement.querySelector('.cfg-mini-label');
    const picked = document.createElement('b');
    picked.className = 'cfg-picked';
    if (label) label.appendChild(picked);
    const showName = hex => { picked.textContent = colorName(hex); };
    PALETTE.forEach((p, i) => {
      if (i === BASICS){
        const br = document.createElement('span');
        br.className = 'cfg-swatch-break'; br.setAttribute('aria-hidden', 'true');
        c.appendChild(br);
      }
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'cfg-swatch'; b.title = p.name; b.setAttribute('aria-label', p.name);
      b.style.background = hexStr(p.hex);
      if (p.hex === current) b.classList.add('active');
      b.addEventListener('click', () => {
        c.querySelectorAll('.cfg-swatch').forEach(x => x.classList.remove('active'));
        b.classList.add('active'); showName(p.hex); onPick(p.hex);
      });
      c.appendChild(b);
    });
    showName(current);
  }

  const variantLabels = {}; Object.keys(VARIANTS).forEach(k => variantLabels[k] = k.replace('x', ' × '));
  segment('cfgVariant', variantLabels, state.variant, k => { state.variant = k; buildNet(); });

  const modelLabels = {}; Object.entries(MODELS).forEach(([k, m]) => modelLabels[k] = m.name);
  const sandBox = document.getElementById('cfgSandwich');
  const motorBox = document.getElementById('cfgMotor');
  function syncToggles(){
    if (sandBox) sandBox.checked = state.sandwich;
    if (motorBox) motorBox.checked = state.motor;
    // con sándwich cada tira tiene capa de arriba y capa de abajo, cada una con su color
    document.querySelectorAll('[data-sand-only]').forEach(el => { el.hidden = !state.sandwich; });
  }
  segment('cfgModel', modelLabels, state.model, k => {
    const m = MODELS[k];
    state.model = k; state.sandwich = m.sandwich; state.motor = m.motor;
    syncToggles(); buildNet();
  });
  function onToggle(){
    state.sandwich = !!(sandBox && sandBox.checked);
    state.motor = !!(motorBox && motorBox.checked);
    const match = Object.entries(MODELS).find(([, m]) => sameAsModel(m));
    state.model = match ? match[0] : state.model;
    setSegActive('cfgModel', match ? match[0] : '');
    syncToggles(); buildNet();
  }
  [sandBox, motorBox].forEach(el => { if (el) el.addEventListener('change', onToggle); });

  swatches('cfgMainSwatches', state.main, hex => { state.main = hex; mainMat.color.copy(linColor(hex)); });
  swatches('cfgMainBotSwatches', state.mainBot, hex => { state.mainBot = hex; mainBotMat.color.copy(linColor(hex)); });
  swatches('cfgAccentSwatches', state.accent, hex => { state.accent = hex; accentMat.color.copy(linColor(hex)); });
  swatches('cfgAccentBotSwatches', state.accentBot, hex => { state.accentBot = hex; accentBotMat.color.copy(linColor(hex)); });
  syncToggles();
  swatches('cfgThreadSwatches', state.thread, hex => {
    state.thread = hex; threadMat.color.copy(linColor(hex));
    paintStitches(); crossMat.map.needsUpdate = true; denseMat.map.needsUpdate = true;
    paintPatch();
  });

  // Parche: se puede quitar (viene puesto) y sus tres colores se mezclan libremente
  const patchBox = document.getElementById('cfgPatchOn');
  const patchBody = document.getElementById('cfgPatchBody');
  if (patchBox){
    patchBox.checked = state.patch;
    patchBox.addEventListener('change', () => {
      state.patch = patchBox.checked;
      if (patchMesh) patchMesh.visible = state.patch;
      if (patchBody) patchBody.hidden = !state.patch;
    });
  }
  swatches('cfgPatchBaseSwatches', state.pBase, hex => { state.pBase = hex; paintPatch(); });
  swatches('cfgPatchBrushSwatches', state.pBrush, hex => { state.pBrush = hex; paintPatch(); });
  swatches('cfgPatchDripSwatches', state.pDrip, hex => { state.pDrip = hex; paintPatch(); });

  const fieldsBox = document.getElementById('cfgFields');
  segment('cfgStyle', STYLES, state.style, k => {
    state.style = k;
    if (fieldsBox) fieldsBox.classList.toggle('is-custom', k === 'custom');
    paintPatch();
  });

  let patchTimer = null;
  [['cfgNombre', 'nombre'], ['cfgNumero', 'numero'], ['cfgMarca', 'marca'], ['cfgModelo', 'modelo']].forEach(([id, prop]) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', () => {
      state[prop] = el.value;
      if (state.style === 'custom'){ state.style = 'piloto'; setSegActive('cfgStyle', 'piloto'); if (fieldsBox) fieldsBox.classList.remove('is-custom'); }
      clearTimeout(patchTimer); patchTimer = setTimeout(paintPatch, 120);
    });
  });

  /* ---------------- cotizar ---------------- */
  const quoteBtn = document.getElementById('cfgQuoteBtn');
  if (quoteBtn){
    /* Vistas fijas que salen en la imagen descargada.
       rotY = 0 es frontal. Para un lateral a 90 grados exactos (se ve el canto)
       pone rotY: -Math.PI/2. El valor -0.95 rad (~54 grados) muestra el perfil
       con algo de profundidad, que se lee mejor en la foto.
       SHOT = tamano en px de cada vista. */
    const SHOT = 900;
    const VIEWS = [
      { label: 'FRONTAL', rotX: 0,     rotY: 0    },
      { label: 'LATERAL', rotX: -0.08, rotY: -0.95 }
    ];

    quoteBtn.addEventListener('click', () => {
      /* --- imagen con vistas FIJAS: no depende de como el cliente giro el visor --- */
      const prevPR = renderer.getPixelRatio();
      const prevAspect = camera.aspect;
      renderer.setPixelRatio(1);
      renderer.setSize(SHOT, SHOT, false);
      camera.aspect = 1; camera.updateProjectionMatrix();
      updateFit();

      const out = document.createElement('canvas');
      out.width = SHOT * (VIEWS.length + (state.patch ? 1 : 0)); out.height = SHOT;
      const g = out.getContext('2d');
      g.fillStyle = '#151515'; g.fillRect(0, 0, out.width, out.height);

      VIEWS.forEach((v, i) => {
        netGroup.rotation.set(v.rotX, v.rotY, 0);
        const d = targetDist;
        camera.position.set(0, d * 0.06, d);
        camera.lookAt(0, 0, 0);
        renderer.render(scene, camera);
        g.drawImage(renderer.domElement, SHOT * i, 0, SHOT, SHOT);
        g.font = '600 ' + Math.round(SHOT * 0.05) + 'px system-ui, Arial, sans-serif';
        g.fillStyle = 'rgba(255,255,255,0.82)';
        g.textAlign = 'center';
        g.fillText(v.label, SHOT * i + SHOT / 2, SHOT - Math.round(SHOT * 0.045));
      });

      if (state.patch){
        const pad = Math.round(SHOT * 0.08);
        g.drawImage(patchCanvas, SHOT * VIEWS.length + pad, pad, SHOT - pad * 2, SHOT - pad * 2);
      }

      g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 2;
      for (let i = 1; i < out.width / SHOT; i++){
        g.beginPath(); g.moveTo(SHOT * i, 0); g.lineTo(SHOT * i, SHOT); g.stroke();
      }

      /* devolver el visor exactamente como lo tenia el cliente */
      renderer.setPixelRatio(prevPR);
      camera.aspect = prevAspect; camera.updateProjectionMatrix();
      resize();

      const a = document.createElement('a');
      a.href = out.toDataURL('image/png');
      a.download = 'mi-racing-net.png';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);

      const refuerzos = [state.sandwich && 'sándwich', state.motor && 'al motor'].filter(Boolean).join(' + ');
      const textos = state.style === 'custom' ? '100% Custom'
        : [state.nombre, state.numero, state.marca, state.modelo].map(v => v.trim().toUpperCase()).filter(Boolean).join(' / ');
      const capas = (top, bot) => state.sandwich
        ? 'arriba ' + colorName(top) + ' / abajo ' + colorName(bot) : colorName(top);
      const colores = ['verticales ' + capas(state.main, state.mainBot), 'horizontales ' + capas(state.accent, state.accentBot),
        'hilo ' + colorName(state.thread)];
      const parche = !state.patch ? 'sin parche'
        : 'fondo ' + colorName(state.pBase) + ', brochazos ' + colorName(state.pBrush) + ', manchas ' + colorName(state.pDrip) + ' — ' + textos;
      const msg = [
        'Hola, quiero cotizar esta Racing Net:',
        '• Variante: ' + state.variant.replace('x', '×'),
        '• Modelo: ' + currentModelName() + (refuerzos ? ' (refuerzo ' + refuerzos + ')' : ' (sin refuerzos)'),
        '• Colores: ' + colores.join(', '),
        '• Parche: ' + parche,
        'Adjunto la imagen de mi diseño.'
      ].join('\n');
      window.open('https://wa.me/50683196548?text=' + encodeURIComponent(msg), '_blank');
    });
  }

  /* ---------------- arranque ---------------- */
  buildNet();
  paintPatch();
  resize();
  animate();
  if (document.fonts){
    const faces = ['400 100px "Permanent Marker"', '400 100px Rye', '400 100px "Alfa Slab One"', '400 100px Ultra', 'italic 400 100px BPImperial'];
    Promise.all(faces.map(f => document.fonts.load(f).catch(() => null))).then(paintPatch);
    document.fonts.ready.then(paintPatch);
  }
})();
