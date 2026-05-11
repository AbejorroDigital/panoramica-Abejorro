/* ============================================================
   Panorámica 360° — Lógica de la aplicación
   ============================================================ */

/**
 * Componente A-Frame: drag-look
 * Experiencia de agarrar y arrastrar para rotar la vista 360°
 */
AFRAME.registerComponent('drag-look', {
  schema: {
    sensitivity: { type: 'number', default: 0.2 },
    inertia: { type: 'number', default: 0.92 },
    maxPitch: { type: 'number', default: 70 }
  },

  init: function () {
    this.isDragging = false;
    this.prevX = 0;
    this.prevY = 0;
    this.yaw = 0;
    this.pitch = 0;
    this.vx = 0;
    this.vy = 0;

    var rot = this.el.getAttribute('rotation');
    if (rot) { this.pitch = rot.x; this.yaw = rot.y; }

    this.canvas = this.el.sceneEl.canvas;

    this._onMD = this.onMD.bind(this);
    this._onMM = this.onMM.bind(this);
    this._onMU = this.onMU.bind(this);
    this._onTS = this.onTS.bind(this);
    this._onTM = this.onTM.bind(this);
    this._onTE = this.onTE.bind(this);

    if (this.canvas) { this.bind(); }
    else { this.el.sceneEl.addEventListener('renderstart', this.bind.bind(this)); }
  },

  bind: function () {
    this.canvas = this.el.sceneEl.canvas;
    var c = this.canvas;
    c.addEventListener('mousedown', this._onMD);
    window.addEventListener('mousemove', this._onMM);
    window.addEventListener('mouseup', this._onMU);
    c.addEventListener('touchstart', this._onTS, { passive: false });
    window.addEventListener('touchmove', this._onTM, { passive: false });
    window.addEventListener('touchend', this._onTE);
  },

  remove: function () {
    var c = this.canvas; if (!c) return;
    c.removeEventListener('mousedown', this._onMD);
    window.removeEventListener('mousemove', this._onMM);
    window.removeEventListener('mouseup', this._onMU);
    c.removeEventListener('touchstart', this._onTS);
    window.removeEventListener('touchmove', this._onTM);
    window.removeEventListener('touchend', this._onTE);
  },

  onMD: function (e) {
    if (e.button !== 0) return;
    this.isDragging = true; this.prevX = e.clientX; this.prevY = e.clientY;
    this.vx = 0; this.vy = 0;
  },
  onMM: function (e) {
    if (!this.isDragging) return;
    this.applyDelta(e.clientX - this.prevX, e.clientY - this.prevY);
    this.prevX = e.clientX; this.prevY = e.clientY;
  },
  onMU: function () { this.isDragging = false; },

  onTS: function (e) {
    if (e.touches.length !== 1) return; e.preventDefault();
    this.isDragging = true; this.prevX = e.touches[0].clientX; this.prevY = e.touches[0].clientY;
    this.vx = 0; this.vy = 0;
  },
  onTM: function (e) {
    if (!this.isDragging || e.touches.length !== 1) return; e.preventDefault();
    this.applyDelta(e.touches[0].clientX - this.prevX, e.touches[0].clientY - this.prevY);
    this.prevX = e.touches[0].clientX; this.prevY = e.touches[0].clientY;
  },
  onTE: function () { this.isDragging = false; },

  applyDelta: function (dx, dy) {
    var s = this.data.sensitivity;
    this.vx = dx * s * -1;
    this.vy = dy * s * 1;
    this.yaw += this.vx;
    this.pitch += this.vy;
    this.pitch = Math.max(-this.data.maxPitch, Math.min(this.data.maxPitch, this.pitch));
  },

  tick: function () {
    if (!this.isDragging) {
      this.yaw += this.vx; this.pitch += this.vy;
      this.pitch = Math.max(-this.data.maxPitch, Math.min(this.data.maxPitch, this.pitch));
      this.vx *= this.data.inertia; this.vy *= this.data.inertia;
      if (Math.abs(this.vx) < 0.001) this.vx = 0;
      if (Math.abs(this.vy) < 0.001) this.vy = 0;
    }
    this.el.setAttribute('rotation', { x: this.pitch, y: this.yaw, z: 0 });
  }
});

/* ============================================================
   Inicialización del DOM
   ============================================================ */
document.addEventListener('DOMContentLoaded', function () {

  // --- Pantalla de carga ---
  var loadingScreen = document.getElementById('loading-screen');
  var scene = document.querySelector('a-scene');
  if (scene) {
    scene.addEventListener('loaded', function () {
      setTimeout(function () { loadingScreen.classList.add('hidden'); }, 600);
    });
  }

  // --- Tooltip de primer uso ---
  var tooltip = document.getElementById('first-use-tooltip');
  var dismissed = false;
  function hideTooltip() {
    if (!dismissed && tooltip) { tooltip.classList.add('hidden'); dismissed = true; }
  }
  setTimeout(hideTooltip, 7000);
  document.addEventListener('mousedown', hideTooltip, { once: true });
  document.addEventListener('touchstart', hideTooltip, { once: true });

  // --- Brújula ---
  var compassArrow = document.getElementById('compass-arrow');
  var compassLabel = document.getElementById('compass-label');
  var cam = document.getElementById('panoramic-camera');

  function getDir(yaw) {
    var a = ((yaw % 360) + 360) % 360;
    if (a >= 337.5 || a < 22.5) return 'N';
    if (a < 67.5) return 'NE';
    if (a < 112.5) return 'E';
    if (a < 157.5) return 'SE';
    if (a < 202.5) return 'S';
    if (a < 247.5) return 'SO';
    if (a < 292.5) return 'O';
    return 'NO';
  }

  if (cam && compassArrow && compassLabel) {
    setInterval(function () {
      var r = cam.getAttribute('rotation');
      if (r) {
        compassArrow.style.transform = 'rotate(' + (-r.y) + 'deg)';
        compassLabel.textContent = getDir(-r.y);
      }
    }, 100);
  }

  // --- Pantalla completa ---
  var fsBtn = document.getElementById('fullscreen-btn');
  if (fsBtn) {
    fsBtn.addEventListener('click', function () {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(function () {});
      } else {
        document.exitFullscreen();
      }
    });
    document.addEventListener('fullscreenchange', function () {
      var use = fsBtn.querySelector('svg use');
      use.setAttribute('href', document.fullscreenElement ? '#icon-compress' : '#icon-expand');
    });
  }
});
