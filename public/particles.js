/**
 * REGIX — Red Moving Particle System
 * Smooth, organic, red-colored particles with connection lines.
 */
(function () {
  "use strict";

  const canvas = document.getElementById("particleCanvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  let particles = [];
  let mouseX = -9999;
  let mouseY = -9999;
  let animFrameId = null;

  const CONFIG = {
    count: 120,
    maxSpeed: 1.2,
    minSpeed: 0.3,
    connectionDistance: 150,
    particleRadius: 2.5,
    color: "255, 26, 26", // RGB for #ff1a1a
    bgAlpha: 0.12,
    mouseInfluenceRadius: 200,
    mouseForce: 0.5,
  };

  // ─── Resize ───────────────────────────────────────────────────────
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  window.addEventListener("resize", resize);

  // ─── Particle Class ────────────────────────────────────────────────
  class Particle {
    constructor() {
      this.reset();
    }

    reset() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.vx = (Math.random() - 0.5) * CONFIG.maxSpeed * 2;
      this.vy = (Math.random() - 0.5) * CONFIG.maxSpeed * 2;
      this.radius = CONFIG.particleRadius + Math.random() * 1.5;
      this.alpha = 0.3 + Math.random() * 0.5;
      this.pulseSpeed = 0.02 + Math.random() * 0.03;
      this.pulseOffset = Math.random() * Math.PI * 2;
      this.originX = this.x;
      this.originY = this.y;
      this.wanderAngle = Math.random() * Math.PI * 2;
    }

    update() {
      // Wander behavior
      this.wanderAngle += (Math.random() - 0.5) * 0.05;
      const wx = Math.cos(this.wanderAngle) * 0.2;
      const wy = Math.sin(this.wanderAngle) * 0.2;

      // Mouse interaction (repel)
      const dx = this.x - mouseX;
      const dy = this.y - mouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      let fx = 0;
      let fy = 0;

      if (dist < CONFIG.mouseInfluenceRadius && dist > 0) {
        const force =
          (CONFIG.mouseInfluenceRadius - dist) / CONFIG.mouseInfluenceRadius;
        const normX = dx / dist;
        const normY = dy / dist;
        fx = normX * force * CONFIG.mouseForce;
        fy = normY * force * CONFIG.mouseForce;
      }

      this.vx += wx + fx;
      this.vy += wy + fy;

      // Damping
      this.vx *= 0.98;
      this.vy *= 0.98;

      // Speed clamping
      const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
      if (speed > CONFIG.maxSpeed) {
        this.vx = (this.vx / speed) * CONFIG.maxSpeed;
        this.vy = (this.vy / speed) * CONFIG.maxSpeed;
      }
      if (speed < CONFIG.minSpeed && speed > 0) {
        this.vx = (this.vx / speed) * CONFIG.minSpeed;
        this.vy = (this.vy / speed) * CONFIG.minSpeed;
      }

      this.x += this.vx;
      this.y += this.vy;

      // Wrap around edges with smooth transition
      const margin = 50;
      if (this.x < -margin) this.x = canvas.width + margin;
      if (this.x > canvas.width + margin) this.x = -margin;
      if (this.y < -margin) this.y = canvas.height + margin;
      if (this.y > canvas.height + margin) this.y = -margin;

      // Pulse alpha over time
      this.currentAlpha =
        this.alpha *
        (0.7 + 0.3 * Math.sin(Date.now() * this.pulseSpeed + this.pulseOffset));
    }

    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${CONFIG.color}, ${this.currentAlpha})`;
      ctx.fill();

      // Soft glow
      const gradient = ctx.createRadialGradient(
        this.x,
        this.y,
        0,
        this.x,
        this.y,
        this.radius * 4,
      );
      gradient.addColorStop(
        0,
        `rgba(${CONFIG.color}, ${this.currentAlpha * 0.3})`,
      );
      gradient.addColorStop(1, `rgba(${CONFIG.color}, 0)`);
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius * 4, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    }
  }

  // ─── Init Particles ──────────────────────────────────────────────
  function initParticles() {
    particles = [];
    for (let i = 0; i < CONFIG.count; i++) {
      particles.push(new Particle());
    }
  }

  // ─── Draw Connections ─────────────────────────────────────────────
  function drawConnections() {
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < CONFIG.connectionDistance) {
          const alpha = (1 - dist / CONFIG.connectionDistance) * 0.3;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(${CONFIG.color}, ${alpha})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }
  }

  // ─── Mouse Tracking ──────────────────────────────────────────────
  function onMouseMove(e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
  }

  function onMouseLeave() {
    mouseX = -9999;
    mouseY = -9999;
  }

  function onTouchMove(e) {
    if (e.touches.length > 0) {
      mouseX = e.touches[0].clientX;
      mouseY = e.touches[0].clientY;
    }
  }

  function onTouchEnd() {
    mouseX = -9999;
    mouseY = -9999;
  }

  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseleave", onMouseLeave);
  document.addEventListener("touchmove", onTouchMove, { passive: true });
  document.addEventListener("touchend", onTouchEnd);

  // ─── Animation Loop ───────────────────────────────────────────────
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background trail effect
    ctx.fillStyle = `rgba(10, 10, 15, ${CONFIG.bgAlpha})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Update & draw particles
    for (const p of particles) {
      p.update();
      p.draw();
    }

    // Draw connection lines
    drawConnections();

    animFrameId = requestAnimationFrame(animate);
  }

  // ─── Start ────────────────────────────────────────────────────────
  function start() {
    if (animFrameId) cancelAnimationFrame(animFrameId);
    resize();
    initParticles();
    animate();
  }

  // Handle visibility change — pause/resume
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (animFrameId) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
      }
    } else {
      animate();
    }
  });

  start();
})();
