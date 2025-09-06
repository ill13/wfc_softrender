// js/classes/SoftRenderer.js
class SoftRenderer {
  constructor(mapGridElement) {
    this.gridEl = mapGridElement;
    this.canvas = null;
    this.ctx = null;
    this.tileSize = 0;
    this.width = 0;
    this.height = 0;
    this.rows = 0;
    this.cols = 0;
    this.drawn = new Set();
    this.lastGridEl = null;
    this.mapKey = null; // Track current map uniquely
    this.init();
  }

  init() {
    const rect = this.gridEl.getBoundingClientRect();
    this.tileSize = rect.width / Math.sqrt(this.gridEl.children.length);
    this.width = Math.round(rect.width);
    this.height = Math.round(rect.height);
    this.cols = Math.floor(this.width / this.tileSize);
    this.rows = Math.floor(this.height / this.cols);

    // Create or reuse canvas
    if (!this.canvas) {
      this.canvas = document.createElement("canvas");
      this.canvas.style.cssText = `
        position: fixed;
        pointer-events: none;
        z-index: 3;
        width: ${this.width}px;
        height: ${this.height}px;
      `;
      this.canvas.width = this.width;
      this.canvas.height = this.height;
      this.gridEl.parentElement.style.position = "relative"; // Ensure positioning context
      this.gridEl.parentElement.appendChild(this.canvas);
      this.ctx = this.canvas.getContext("2d");
    } else {
      // Resize existing canvas
      this.canvas.width = this.width;
      this.canvas.height = this.height;
      this.canvas.style.width = `${this.width}px`;
      this.canvas.style.height = `${this.height}px`;
    }

    this.ctx.resetTransform();
    this.ctx.imageSmoothingEnabled = false;

    // Apply border offset
    const border = parseInt(window.getComputedStyle(this.gridEl.parentElement).borderLeftWidth) || 0;
    this.ctx.translate(border, border);
  }

  reset() {
    // ✅ Always fully clear canvas
    this.ctx.clearRect(0, 0, this.width, this.height);

    // ✅ Reset composite mode before drawing background
    this.ctx.globalCompositeOperation = "source-over";

    // ✅ Redraw clean parchment texture
    this.drawParchmentTexture();

    // ✅ Reset drawn set for new map
    this.drawn.clear();

    // ✅ Generate new map key to invalidate old draws
    this.mapKey = Date.now(); // Or use a UUID, but Date.now() suffices for now
  }

  update() {
    // If grid changed (new map), re-init and reset
    if (this.gridEl !== this.lastGridEl) {
      this.lastGridEl = this.gridEl;
      this.init(); // Recalculate sizes
      this.reset(); // Clear canvas, reset state
    }

    // ✅ Always clear drawn set before full redraw
    // But we already do this in reset(), and we now redraw all tiles every frame
    // So let’s remove per-tile memoization within same map — it’s unsafe during partial updates
    this.render();
  }

  render() {
    if (!this.ctx) return;

    const tiles = Array.from(this.gridEl.children);
    this.drawn.clear(); // 🔁 Clear every frame — we do full redraw now

    tiles.forEach((tile, index) => {
      const x = index % this.cols;
      const y = Math.floor(index / this.cols);

      const bgColor = this.getTileColor(tile);
      if (!bgColor || bgColor === "rgb(55, 65, 81)") return; // Skip empty/ignored

      const style = this.getStyleForColor(bgColor);
      this.drawWatercolorSplotch(x, y, bgColor, style);
    });
  }

  getTileColor(tile) {
    const computed = window.getComputedStyle(tile).backgroundColor;
    return computed && computed !== "rgba(0, 0, 0, 0)" ? computed : null;
  }

  getStyleForColor(color) {
    const styleMap = {
      // Fantasy
      "rgb(119, 119, 119)": { scale: 1.1, offsetY: -4, blur: 6, alpha: 0.5 },
      "rgb(22, 163, 74)": { scale: 1.25, blur: 8, alpha: 0.4 },
      "rgb(163, 230, 53)": { scale: 1.2, blur: 6, alpha: 0.35 },
      "rgb(29, 78, 216)": { scale: 1.15, blur: 10, alpha: 0.5, flow: true },
      "rgb(124, 45, 18)": { scale: 0.85, alpha: 0.3, texture: "ash" },

      // Cyberpunk
      "rgb(84, 41, 92)": { scale: 1.2, blur: 12, alpha: 0.4, glow: "#33F0FF" },
      "rgb(70, 127, 161)": { scale: 1.0, blur: 4, alpha: 0.4 },
      "rgb(55, 65, 81)": { scale: 0.9, alpha: 0.3 },

      // Modern
      "rgb(14, 165, 233)": { scale: 1.2, blur: 10, alpha: 0.5 },
      "rgb(16, 185, 129)": { scale: 1.2, blur: 6, alpha: 0.4 },
      "rgb(22, 163, 74)": { scale: 1.1, blur: 5, alpha: 0.4 },
    };

    return styleMap[color] || { scale: 1.0, blur: 0, alpha: 0.4 };
  }

  drawWatercolorSplotch(x, y, color, style) {
    const { scale = 1.0, blur = 0, alpha = 0.4, offsetY = 0, glow, flow, texture } = style;

    const tx = x * this.tileSize;
    const ty = y * this.tileSize;
    const cx = tx + this.tileSize / 2;
    const cy = ty + this.tileSize / 2;
    const size = this.tileSize * scale;

    this.ctx.save();

    // Main pigment blobs
    this.ctx.shadowBlur = 0;
    for (let i = 0; i < 4; i++) {
      const angle = Math.random() * Math.PI * 2;
      const offset = (Math.random() - 0.5) * size * 0.3;
      const radius = size * (0.25 + Math.random() * 0.15);
      const dx = cx + Math.cos(angle) * offset;
      const dy = cy + Math.sin(angle) * offset + offsetY;

      this.ctx.beginPath();
      this.ctx.arc(dx, dy, radius, 0, Math.PI * 2);
      this.ctx.fillStyle = color;
      this.ctx.globalAlpha = alpha * (0.2 + Math.random() * 0.2);
      this.ctx.fill();
    }

    // Soft bleed edge
    if (blur > 0) {
      this.ctx.globalAlpha = alpha * 0.3;
      this.ctx.shadowColor = color;
      this.ctx.shadowBlur = blur * 1.5;
      this.ctx.beginPath();
      this.ctx.ellipse(cx, cy + offsetY, size * 0.6, size * 0.4, 0, 0, Math.PI * 2);
      this.ctx.fillStyle = color;
      this.ctx.fill();
    }

    // Flow effect
    if (flow) {
      this.ctx.globalAlpha = alpha * 0.2;
      this.ctx.shadowColor = color;
      this.ctx.shadowBlur = blur * 2;
      this.ctx.beginPath();
      this.ctx.ellipse(cx, cy + offsetY + 4, size * 0.7, size * 0.3, 0, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Glow (cyberpunk)
    if (glow) {
      this.ctx.globalAlpha = alpha * 0.2;
      this.ctx.shadowColor = glow;
      this.ctx.shadowBlur = blur * 2.5;
      this.ctx.beginPath();
      this.ctx.ellipse(cx, cy + offsetY, size * 0.5, size * 0.5, 0, 0, Math.PI * 2);
      this.ctx.stroke();
    }

    // Ash texture
    if (texture === "ash") {
      this.drawGrain(cx, cy, size, "#fff", 0.1);
    }

    this.ctx.restore();
  }

  drawParchmentTexture() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const imageData = ctx.createImageData(w, h);
    for (let i = 0; i < imageData.data.length; i += 4) {
      const value = 245 + Math.random() * 10;
      const tint = Math.random() > 0.9 ? 10 : 0;
      imageData.data[i] = value + tint;         // R
      imageData.data[i + 1] = value - 10 + tint; // G
      imageData.data[i + 2] = value - 30;       // B
      imageData.data[i + 3] = 255;              // A
    }
    ctx.putImageData(imageData, 0, 0);

    // Use screen blend to lighten base
    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = "rgba(255, 255, 220, 0.1)";
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "source-over"; // Reset after
  }

  drawGrain(cx, cy, size, color, alpha) {
    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = color;
    for (let i = 0; i < 6; i++) {
      const rx = cx - size / 2 + Math.random() * size;
      const ry = cy - size / 2 + Math.random() * size;
      this.ctx.fillRect(rx, ry, 1, 1);
    }
    this.ctx.restore();
  }
}