/**
 * REGIX — Red Moving Particles Background
 * High-performance canvas-based particle system with crimson theme
 */

(function() {
  const canvas = document.getElementById('threeCanvas');
  if (!canvas) {
    const fallbackCanvas = document.createElement('canvas');
    fallbackCanvas.id = 'particleCanvas';
    fallbackCanvas.className = 'particle-canvas';
    document.body.prepend(fallbackCanvas);
    initParticles(fallbackCanvas);
    return;
  }

  initParticles(canvas);
})();

function initParticles(canvas) {
  const ctx = canvas.getContext('2d', { alpha: true });
  
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  
  resize();
  window.addEventListener('resize', resize);

  const particles = [];
  const particleCount = 100;
  
  class Particle {
    constructor() {
      this.reset();
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.size = Math.random() * 3 + 1;
      this.speedX = (Math.random() - 0.5) * 0.3;
      this.speedY = (Math.random() - 0.5) * 0.3;
      this.alpha = Math.random() * 0.5 + 0.3;
      this.orbitRadius = Math.random() * 30;
      this.orbitAngle = Math.random() * Math.PI * 2;
      this.orbitSpeed = (Math.random() - 0.5) * 0.02;
    }

    reset() {
      this.life = 0;
    }

    update() {
      this.x += this.speedX;
      this.y += this.speedY;
      this.orbitAngle += this.orbitSpeed;

      if (this.x < -20) this.x = canvas.width + 20;
      if (this.x > canvas.width + 20) this.x = -20;
      if (this.y < -20) this.y = canvas.height + 20;
      if (this.y > canvas.height + 20) this.y = -20;
    }

    draw() {
      const orbitX = Math.sin(this.orbitAngle) * this.orbitRadius * 0.1;
      const orbitY = Math.cos(this.orbitAngle) * this.orbitRadius * 0.1;
      
      const gradient = ctx.createRadialGradient(
        this.x + orbitX, this.y + orbitY, 0,
        this.x + orbitX, this.y + orbitY, this.size * 2
      );
      
      gradient.addColorStop(0, `rgba(239, 68, 68, ${this.alpha})`);
      gradient.addColorStop(0.5, `rgba(255, 30, 39, ${this.alpha * 0.6})`);
      gradient.addColorStop(1, `rgba(127, 29, 31, 0)`);
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(this.x + orbitX, this.y + orbitY, this.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle());
  }

  let mouseX = 0;
  let mouseY = 0;
  
  document.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / canvas.width) - 0.5;
    mouseY = (e.clientY / canvas.height) - 0.5;
  });

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    particles.forEach(p => {
      p.update();
      p.draw();
    });

    const time = Date.now() * 0.00005;
    const pulse = Math.sin(time) * 0.5 + 0.5;
    
    const pulseX = canvas.width * 0.5 + Math.cos(time * 0.3) * 100;
    const pulseY = canvas.height * 0.3 + Math.sin(time * 0.2) * 80;
    
    const glowGradient = ctx.createRadialGradient(
      pulseX, pulseY, 0,
      pulseX, pulseY, 300
    );
    glowGradient.addColorStop(0, `rgba(255, 30, 39, ${pulse * 0.03})`);
    glowGradient.addColorStop(1, `rgba(8, 8, 12, 0)`);
    
    ctx.fillStyle = glowGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    requestAnimationFrame(animate);
  }

  animate();
}