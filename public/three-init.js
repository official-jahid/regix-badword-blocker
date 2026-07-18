/**
 * REGIX Three.js 3D Scene Initialization
 * Uses Three.js via CDN - no module import needed
 */

(function() {
  if (typeof THREE === 'undefined') return;

  const canvas = document.getElementById('threeCanvas');
  if (!canvas) return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,
    antialias: true
  });

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  camera.position.z = 50;

  const particleCount = 1500;
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 1.5,
    vertexColors: true,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending
  });

  const particles = new THREE.Points(geometry, material);
  scene.add(particles);

  const color = new THREE.Color();
  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3;
    positions[i3] = (Math.random() - 0.5) * 300;
    positions[i3 + 1] = (Math.random() - 0.5) * 300;
    positions[i3 + 2] = (Math.random() - 0.5) * 300;

    const hue = 0;
    const sat = 0.8 + Math.random() * 0.2;
    const light = 0.4 + Math.random() * 0.4;
    color.setHSL(hue, sat, light);
    colors[i3] = color.r;
    colors[i3 + 1] = color.g;
    colors[i3 + 2] = color.b;
  }

  geometry.attributes.position.needsUpdate = true;
  geometry.attributes.color.needsUpdate = true;

  let mouseX = 0, mouseY = 0;
  document.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth) - 0.5;
    mouseY = (e.clientY / window.innerHeight) - 0.5;
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  function animate() {
    requestAnimationFrame(animate);
    particles.rotation.x += 0.0003 + mouseY * 0.0001;
    particles.rotation.y += 0.0005 + mouseX * 0.0001;
    const time = Date.now() * 0.0001;
    particles.position.x = Math.sin(time) * 0.5;
    particles.position.y = Math.cos(time * 0.7) * 0.5;
    renderer.render(scene, camera);
  }

  animate();
})();