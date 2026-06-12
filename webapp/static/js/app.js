// ===== GLA Digital Twin - Frontend Application =====
// 2D Telemetry + 3D Wing Deformation + Flight Simulator

let ws = null;
let state = { gla_active: true, gust_amp: 10, gust_len: 8, gain: 1.0 };
let historyData = { t: [], moment_open: [], moment_closed: [], disp: [], control: [], gust: [] };
let fps = 0, frameCount = 0, lastFpsTime = performance.now();

// ---- Chart.js Setup ----
const ctx = document.getElementById('chart-main').getContext('2d');
const chart = new Chart(ctx, {
  type: 'line',
  data: {
    labels: [],
    datasets: [
      { label: 'Root Moment (Open)', data: [], borderColor: '#ef5350', backgroundColor: 'transparent', pointRadius: 0, borderWidth: 1.5, borderDash: [4, 2] },
      { label: 'Root Moment (Closed)', data: [], borderColor: '#66bb6a', backgroundColor: 'transparent', pointRadius: 0, borderWidth: 2 },
      { label: 'Tip Displacement', data: [], borderColor: '#42a5f5', backgroundColor: 'transparent', pointRadius: 0, borderWidth: 1.5, yAxisID: 'y1' },
      { label: 'Control Deflection', data: [], borderColor: '#ab47bc', backgroundColor: 'transparent', pointRadius: 0, borderWidth: 1.5, borderDash: [3, 3], yAxisID: 'y2' },
      { label: 'Gust Input', data: [], borderColor: '#ffa726', backgroundColor: 'transparent', pointRadius: 0, borderWidth: 1, borderDash: [2, 4] }
    ]
  },
  options: {
    responsive: true, maintainAspectRatio: false,
    animation: false,
    interaction: { mode: 'nearest', intersect: false },
    scales: {
      x: { display: true, grid: { color: '#1a2a3a' }, ticks: { color: '#78909c', maxTicksLimit: 8, font: { size: 9 } } },
      y: { position: 'left', grid: { color: '#1a2a3a' }, ticks: { color: '#78909c', font: { size: 9 } }, title: { display: true, text: 'Moment (Nm)', color: '#90a4ae', font: { size: 10 } } },
      y1: { position: 'right', grid: { display: false }, ticks: { color: '#42a5f5', font: { size: 9 } }, title: { display: true, text: 'Disp (m)', color: '#42a5f5', font: { size: 10 } } },
      y2: { position: 'right', grid: { display: false }, ticks: { color: '#ab47bc', font: { size: 9 } }, title: { display: true, text: 'Control (°)', color: '#ab47bc', font: { size: 10 } } }
    },
    plugins: { legend: { labels: { color: '#b0bec5', boxWidth: 12, padding: 8, font: { size: 9 } } } }
  }
});

// ---- Three.js Wing Setup ----
const wingCanvas = document.getElementById('wing-canvas');
const wingRenderer = new THREE.WebGLRenderer({ canvas: wingCanvas, antialias: true, alpha: true });
wingRenderer.setSize(wingCanvas.clientWidth || 400, wingCanvas.clientHeight || 300);
wingRenderer.setClearColor(0x0a0e17);

const wingScene = new THREE.Scene();
const wingCamera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
wingCamera.position.set(3, 1.5, 3);
wingCamera.lookAt(0.75, 0, 0);

const wingControls = new THREE.OrbitControls(wingCamera, wingCanvas);
wingControls.enableDamping = true;
wingControls.dampingFactor = 0.05;

// Lighting
const ambientLight = new THREE.AmbientLight(0x404060, 0.5);
wingScene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(2, 5, 3);
wingScene.add(dirLight);
const backLight = new THREE.DirectionalLight(0x4fc3f7, 0.3);
backLight.position.set(-2, 0, -3);
wingScene.add(backLight);

// Wing geometry
const wingSegments = 20;
const wingSpan = 1.5;
const wingChord = 0.25;
const wingGeometry = new THREE.BufferGeometry();
const vertices = [];
const indices = [];
const uvs = [];
const cols = [];
const nStrip = 10;

for (let i = 0; i <= nStrip; i++) {
  const x = (i / nStrip) * wingSpan;
  const halfChord = wingChord / 2;
  vertices.push(x, 0, -halfChord);
  vertices.push(x, 0, halfChord);
  uvs.push(i / nStrip, 0, i / nStrip, 1);
  cols.push(0.3, 0.5, 0.8, 0.3, 0.5, 0.8);
  if (i < nStrip) {
    const a = i * 2, b = i * 2 + 1, c = (i + 1) * 2, d = (i + 1) * 2 + 1;
    indices.push(a, c, b, b, c, d);
  }
}

wingGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
wingGeometry.setIndex(indices);
wingGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
wingGeometry.computeVertexNormals();

const wingMat = new THREE.MeshPhongMaterial({
  color: 0x4a7db4, side: THREE.DoubleSide,
  specular: 0x224466, shininess: 30,
  transparent: true, opacity: 0.85,
  wireframe: false
});
const wingMesh = new THREE.Mesh(wingGeometry, wingMat);
wingScene.add(wingMesh);

const wireMat = new THREE.MeshBasicMaterial({ color: 0x88bbdd, wireframe: true, transparent: true, opacity: 0.15 });
const wireMesh = new THREE.Mesh(wingGeometry.clone(), wireMat);
wingScene.add(wireMesh);

// Root indicator
const rootGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.4, 8);
const rootMat = new THREE.MeshBasicMaterial({ color: 0xef5350 });
for (let i = 0; i < 3; i++) {
  const r = new THREE.Mesh(rootGeo, rootMat);
  r.position.set(0, -0.05 + i * 0.1, 0);
  r.rotation.x = Math.PI / 2;
  wingScene.add(r);
}

// Ground grid
const gridHelper = new THREE.GridHelper(2, 10, 0x2a4a6a, 0x1a2a3a);
gridHelper.position.y = -0.15;
wingScene.add(gridHelper);

// Axes
const axesHelper = new THREE.AxesHelper(0.5);
axesHelper.position.x = -0.2;
wingScene.add(axesHelper);

// ---- Three.js Flight Simulator Setup ----
const flightCanvas = document.getElementById('flight-canvas');
const flightRenderer = new THREE.WebGLRenderer({ canvas: flightCanvas, antialias: true, alpha: true });
flightRenderer.setSize(flightCanvas.clientWidth || 400, flightCanvas.clientHeight || 300);
flightRenderer.setClearColor(0x0a0e17);

const flightScene = new THREE.Scene();
const flightCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
flightCamera.position.set(5, 3, 8);
flightCamera.lookAt(0, 0, 0);

// Sky
const skyGeo = new THREE.SphereGeometry(50, 32, 16);
const skyMat = new THREE.MeshBasicMaterial({ color: 0x0f1a3e, side: THREE.BackSide });
const sky = new THREE.Mesh(skyGeo, skyMat);
flightScene.add(sky);

// Stars
for (let i = 0; i < 200; i++) {
  const star = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 4, 4),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  star.position.set(
    (Math.random() - 0.5) * 100,
    Math.random() * 40 + 5,
    (Math.random() - 0.5) * 100
  );
  flightScene.add(star);
}

// Ground
const groundGeo = new THREE.PlaneGeometry(30, 30);
const groundMat = new THREE.MeshBasicMaterial({ color: 0x1a2a3a, side: THREE.DoubleSide });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.5;
flightScene.add(ground);

// Aircraft group
const aircraft = new THREE.Group();

// Fuselage
const fuseGeo = new THREE.CylinderGeometry(0.08, 0.12, 0.8, 8);
const fuseMat = new THREE.MeshPhongMaterial({ color: 0x4a7db4 });
const fuse = new THREE.Mesh(fuseGeo, fuseMat);
fuse.rotation.z = Math.PI / 2;
aircraft.add(fuse);

// Wing
const awGeo = new THREE.BoxGeometry(0.6, 0.02, 0.1);
const awMat = new THREE.MeshPhongMaterial({ color: 0x5a8dc4 });
const aw = new THREE.Mesh(awGeo, awMat);
aw.position.set(0, 0, 0);
aircraft.add(aw);

// Tail
const tailGeo = new THREE.BoxGeometry(0.08, 0.15, 0.06);
const tailMat = new THREE.MeshPhongMaterial({ color: 0x5a8dc4 });
const tail = new THREE.Mesh(tailGeo, tailMat);
tail.position.set(-0.4, 0, 0);
aircraft.add(tail);

// Vertical tail
const vtailGeo = new THREE.BoxGeometry(0.02, 0.12, 0.1);
const vtailMat = new THREE.MeshPhongMaterial({ color: 0x5a8dc4 });
const vtail = new THREE.Mesh(vtailGeo, vtailMat);
vtail.position.set(-0.4, 0.08, 0);
aircraft.add(vtail);

flightScene.add(aircraft);
aircraft.position.y = 0.5;

// Turbulence particles
const particleCount = 100;
const particleGeo = new THREE.BufferGeometry();
const pPos = new Float32Array(particleCount * 3);
for (let i = 0; i < particleCount * 3; i++) {
  pPos[i] = (Math.random() - 0.5) * 20;
}
particleGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
const particleMat = new THREE.PointsMaterial({ color: 0x4fc3f7, size: 0.05, transparent: true, opacity: 0.4 });
const particles = new THREE.Points(particleGeo, particleMat);
flightScene.add(particles);

// ---- WebSocket Connection ----
function connectWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

  ws.onopen = () => { console.log('WebSocket connected'); };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    updateUI(data);
    frameCount++;
  };

  ws.onclose = () => {
    console.log('WebSocket disconnected, reconnecting...');
    setTimeout(connectWebSocket, 1000);
  };

  ws.onerror = (e) => { console.error('WS error:', e); };
}

function sendCommand(cmd) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(cmd));
  }
}

// ---- UI Updates ----
function updateUI(data) {
  // Update time
  document.getElementById('time-display').textContent = `t: ${data.t.toFixed(2)} s`;

  // KPI values
  const moment = data.moment_closed || 0;
  const momentOpen = data.moment_open || 0;
  document.getElementById('kpi-moment').textContent = moment.toFixed(2);
  document.getElementById('kpi-disp').textContent = data.tip_disp.toFixed(4);
  const reduction = momentOpen > 0 ? ((momentOpen - moment) / momentOpen * 100) : 0;
  document.getElementById('kpi-reduction').textContent = `${Math.max(0, reduction).toFixed(1)}%`;
  document.getElementById('kpi-control').textContent = data.control_deg.toFixed(1);

  // GLA status
  const statusEl = document.getElementById('gla-status-2d');
  if (data.gla_active) {
    statusEl.textContent = 'GLA ACTIVE';
    statusEl.className = 'status status-active';
  } else {
    statusEl.textContent = 'GLA INACTIVE';
    statusEl.className = 'status status-inactive';
  }

  // History
  if (data.history) {
    historyData = data.history;
    updateChart();
  }

  // 3D wing deformation
  if (data.disp_profile) {
    updateWingDeformation(data.disp_profile);
  }

  // Flight simulator
  updateFlight(data);

  // FPS
  const now = performance.now();
  if (now - lastFpsTime > 1000) {
    fps = frameCount;
    frameCount = 0;
    lastFpsTime = now;
    document.getElementById('fps-display').textContent = `FPS: ${fps}`;
  }
}

// ---- Chart Update ----
function updateChart() {
  const len = historyData.t ? historyData.t.length : 0;
  if (len === 0) return;
  chart.data.labels = historyData.t.map(t => t.toFixed(2));
  chart.data.datasets[0].data = historyData.moment_open || [];
  chart.data.datasets[1].data = historyData.moment_closed || [];
  chart.data.datasets[2].data = historyData.disp || [];
  chart.data.datasets[3].data = historyData.control || [];
  chart.data.datasets[4].data = historyData.gust || [];
  chart.update('none');
}

// ---- 3D Wing Deformation ----
function updateWingDeformation(profile) {
  const pos = wingMesh.geometry.attributes.position;
  const arr = pos.array;
  const scale = 3.0;
  for (let i = 0; i <= 10; i++) {
    const zi = i <= profile.length - 1 ? profile[i].z * scale : 0;
    const idx = i * 6;
    arr[idx + 1] = zi;
    arr[idx + 4] = zi;
  }
  pos.needsUpdate = true;
  wingMesh.geometry.computeVertexNormals();
  wireMesh.geometry.attributes.position.array.set(arr);
  wireMesh.geometry.attributes.position.needsUpdate = true;
}

// ---- Flight Simulator ----
function updateFlight(data) {
  const gustVal = data.gust || 0;
  const controlVal = data.control_deg || 0;

  // Aircraft roll from gust + control
  const rollAngle = (gustVal * 0.03 - controlVal * 0.02);
  aircraft.rotation.z = rollAngle * 0.05;
  aircraft.rotation.x = Math.sin(data.t * 0.5) * 0.02;

  // Slight vertical motion from gust
  aircraft.position.y = 0.5 + gustVal * 0.02;

  // Camera follow
  flightCamera.position.x = aircraft.position.x + 5;
  flightCamera.position.y = aircraft.position.y + 2;
  flightCamera.position.z = aircraft.position.z + 6;
  flightCamera.lookAt(aircraft.position);

  // Turbulence particles
  const pPos = particles.geometry.attributes.position.array;
  for (let i = 0; i < particleCount; i++) {
    pPos[i * 3] -= 0.05 + gustVal * 0.02;
    pPos[i * 3 + 1] += Math.sin(data.t + i) * 0.01;
    pPos[i * 3 + 2] += Math.cos(data.t * 0.5 + i * 0.1) * 0.01;
    if (pPos[i * 3] < -10) pPos[i * 3] = 10;
  }
  particles.geometry.attributes.position.needsUpdate = true;
  particles.material.opacity = 0.2 + gustVal * 0.04;
}

// ---- Animation Loop ----
function animate() {
  requestAnimationFrame(animate);
  wingControls.update();

  wingRenderer.render(wingScene, wingCamera);
  flightRenderer.render(flightScene, flightCamera);
}
animate();

// ---- UI Controls ----
document.getElementById('btn-gla').addEventListener('click', function() {
  state.gla_active = !state.gla_active;
  this.textContent = state.gla_active ? 'GLA: ON' : 'GLA: OFF';
  this.className = state.gla_active ? 'active' : 'danger';
  sendCommand({ gla: state.gla_active });
});

document.getElementById('btn-reset').addEventListener('click', () => {
  sendCommand({ reset: true });
});

document.getElementById('gust-amp').addEventListener('input', function() {
  state.gust_amp = parseFloat(this.value);
  document.getElementById('gust-label').textContent = `${state.gust_amp} m/s`;
});

document.getElementById('gust-amp').addEventListener('change', function() {
  sendCommand({ gust_amp: state.gust_amp, gust_len: state.gust_len });
});

document.getElementById('gain-scale').addEventListener('input', function() {
  state.gain = parseFloat(this.value);
  document.getElementById('gain-label').textContent = `${state.gain.toFixed(1)}x`;
});

// Tab switching
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', function() {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    this.classList.add('active');
    const target = this.dataset.tab;
    document.querySelectorAll('.tab-content').forEach(tc => tc.style.display = 'none');
    document.getElementById(`tab-${target}`).style.display = 'block';
    // Resize renderers after transition
    setTimeout(() => {
      const w = wingCanvas.parentElement.clientWidth || 400;
      const h = wingCanvas.parentElement.clientHeight || 300;
      wingRenderer.setSize(w, h);
      flightRenderer.setSize(w, h);
    }, 50);
  });
});

// ---- Resize Handling ----
function resizeCanvases() {
  const container = document.querySelector('.panel-body');
  const w = container.clientWidth;
  const h = container.clientHeight;
  if (w > 0 && h > 0) {
    chart.resize();
    wingRenderer.setSize(wingCanvas.clientWidth || w, wingCanvas.clientHeight || h);
    flightRenderer.setSize(flightCanvas.clientWidth || w, flightCanvas.clientHeight || h);
  }
}

window.addEventListener('resize', resizeCanvases);
setTimeout(resizeCanvases, 500);

// ---- Start ----
connectWebSocket();
console.log('GLA Digital Twin initialized');
