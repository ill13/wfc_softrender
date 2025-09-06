// js/classes/ParchmentOverlay.js
class ParchmentOverlay {
  constructor(width, height, themeName, seed) {
    this.width = width;
    this.height = height;
    this.themeName = themeName;
    this.seed = seed;
    this.canvas = null;
    this.ctx = null;
    this.biomeColors = {};
    this.biomeOrder = []; // Drawing order: last = topmost
    this.theme = null;
    this.mapData = null;

    // Seed random with provided seed
    this.seedRandom = this.makeSeededRandom(seed);
  }

  makeSeededRandom(seed) {
    // Deterministic PRNG
    let s = (seed || 1) * 0x2F6E2B;
    return () => {
      s = (s * 0x41C64E6D + 12345) >>> 0;
      return (s & 0x7FFFFFFF) / 0x7FFFFFFF;
    };
  }

  noise(min, max) {
    return this.seedRandom() * (max - min) + min;
  }

  // Initialize from theme JSON
  initFromTheme(theme) {
    this.theme = theme;

    // Extract and map colors
    this.biomeColors = {};
    Object.keys(theme.elevation).forEach(id => {
      const visual = theme.elevation[id];
      const color = this.parseColor(visual.colors?.[0]);
      this.biomeColors[id] = {
        r: color.r,
        g: color.g,
        b: color.b,
        alpha: 0.8
      };
    });

    // Define layer order: Mountains on top, Barrens on bottom
    this.biomeOrder = [
      'barrens',     // bottom
      'water',
      'meadow',
      'forest',
      'spire'        // top
    ].filter(id => this.biomeColors[id]); // Only include existing biomes
  }

  parseColor(hex) {
    if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) {
      return { r: 100, g: 100, b: 100 };
    }
    let h = hex.slice(1);
    if (h.length === 3) {
      h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; // #777 → #777777
    }
    if (h.length !== 6) {
      return { r: 100, g: 100, b: 100 };
    }
    return {
      r: parseInt(h.slice(0, 2), 16) || 100,
      g: parseInt(h.slice(2, 4), 16) || 100,
      b: parseInt(h.slice(4, 6), 16) || 100
    };
  }

  // Set map data (from WFC.grid after collapse)
  setMapData(grid) {
    this.mapData = grid.map(row => row.map(cell => cell.terrain));
  }

  // Create and prep canvas
  createCanvas() {
    const tileSize = Math.min(48, 600 / Math.max(this.width, this.height));
    const canvasWidth = this.width * tileSize;
    const canvasHeight = this.height * tileSize;

    this.canvas = document.createElement('canvas');
    this.canvas.width = canvasWidth;
    this.canvas.height = canvasHeight;
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.zIndex = '1';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.display = 'block';
    this.canvas.style.margin = '0 auto';
    this.canvas.style.outline = ''; // Remove debug border if added

    this.ctx = this.canvas.getContext('2d');
    return this.canvas;
  }

  // Main render function
  render() {
    if (!this.ctx || !this.mapData) return;

    const w = this.width;
    const h = this.height;
    const tileSize = this.canvas.width / this.width;
    const ctx = this.ctx;

    // Clear
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Parchment base
    ctx.fillStyle = "#f0cb9bff";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw biomes in layer order (bottom to top)
    this.biomeOrder.forEach(biomeId => {
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (this.mapData[y][x] === biomeId) {
            const px = x * tileSize;
            const py = y * tileSize;
            this.drawBiomeTile(px, py, biomeId, tileSize);
          }
        }
      }
    });

    // Add parchment texture
    this.addParchmentTexture();

    // Reset state
    ctx.globalAlpha = 1.0;
    ctx.globalCompositeOperation = 'source-over';
  }

  drawBiomeTile(x, y, biomeId, size) {
    const color = this.biomeColors[biomeId];
    if (!color || color.r === undefined) return;

    const cx = x + size / 2;
    const cy = y + size / 2;

    // Soft radial gradient fill
    const grad = this.ctx.createRadialGradient(cx, cy, 10, cx, cy, size);
    grad.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${color.alpha})`);
    grad.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);

    this.ctx.fillStyle = grad;
    this.ctx.fillRect(x, y, size, size);

    // Add biome-specific art
    this.addBiomeArt(x, y, biomeId, size);

    // Add subtle elevation shading
    this.addElevationShading(x, y, color, size);
  }

  addBiomeArt(x, y, biomeId, size) {
    const cx = x + size / 2;
    const cy = y + size / 2;
    const ctx = this.ctx;

    if (biomeId === 'water') {
      for (let i = 0; i < 3; i++) {
        const dy = 10 + i * 15;
        ctx.strokeStyle = `rgba(50, 100, 180, 0.2)`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 5, y + dy);
        const amp = this.noise(-8, 8);
        const offset = this.noise(-10, 10);
        ctx.quadraticCurveTo(cx + offset, y + dy + amp, x + 43, y + dy);
        ctx.stroke();
      }
    } else if (biomeId === 'forest') {
      for (let i = 0; i < 21; i++) {
        const nx = cx + this.noise(-22, 22);
        const ny = cy + this.noise(-22, 22);
        const dotSize = 2 + this.noise(0, 3);
        ctx.fillStyle = `rgba(30, 100, 50, ${0.5 + this.noise(0, 0.3)})`;
        ctx.beginPath();
        ctx.arc(nx, ny, dotSize, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (biomeId === 'spire') {
      for (let i = 0; i < 3; i++) {
        const dy = 16 + i * 15;
        ctx.strokeStyle = `rgba(100, 100, 100, 0.3)`;
        ctx.lineWidth = 2;
        const startX = x + 3 + this.noise(0, 9);
        const endX = x + 28 + this.noise(0, 15);
        if (startX >= endX) continue;
        ctx.beginPath();
        ctx.moveTo(startX, y + dy);
        const midX = (startX + endX) / 2;
        const depth = 8 + this.noise(0, 8);
        const peakOffset = this.noise(-5, 5);
        ctx.lineTo(midX + peakOffset, y + dy - depth);
        ctx.lineTo(endX, y + dy);
        ctx.stroke();
      }
    } else if (biomeId === 'barrens') {
      for (let i = 0; i < 7; i++) {
        const rx = cx + this.noise(-24, 24);
        const ry = cy + this.noise(-24, 24);
        ctx.save();
        ctx.translate(rx, ry);
        ctx.rotate(this.noise(0, Math.PI * 2));
        ctx.fillStyle = `rgba(160, 30, 60, 0.3)`;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        for (let j = 0; j < 5; j++) {
          const angle = (Math.PI * 2 * j) / 5;
          const len = 4 + this.noise(0, 8);
          const x = Math.cos(angle) * len;
          const y = Math.sin(angle) * len;
          ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    } else if (biomeId === 'meadow') {
      const windLean = this.noise(-5, 5);
      for (let i = 0; i < 7; i++) {
        const dx = 10 + i * 15;
        const startY = y + this.noise(0, 38);
        const length = 2 + this.noise(0, 7);
        const endY = startY + length;
        const controlY = startY + length / 2;
        const amp = this.noise(-2, 2);
        const offset = this.noise(-2, 2);
        ctx.strokeStyle = `rgba(60, 130, 60, ${0.4 + this.noise(0, 0.3)})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(x + dx, startY);
        ctx.quadraticCurveTo(
          x + dx + windLean + amp,
          controlY + offset,
          x + dx + windLean,
          endY
        );
        ctx.stroke();
      }
    }
  }

  addElevationShading(x, y, color, size) {
    const grad = this.ctx.createLinearGradient(x, y, x, y + size);
    grad.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${color.alpha * 0.8})`);
    grad.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, ${color.alpha * 0.5})`);
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(x, y, size, size);
  }

  addParchmentTexture() {
    const texCanvas = document.createElement("canvas");
    texCanvas.width = 512;
    texCanvas.height = 512;
    const texCtx = texCanvas.getContext("2d");

    // Base parchment
    texCtx.fillStyle = "#e7c496";
    texCtx.fillRect(0, 0, 512, 512);

    // Grain
    for (let i = 0; i < 1000; i++) {
      const x = Math.floor(this.noise(0, 512));
      const y = Math.floor(this.noise(0, 512));
      const r = this.noise(0.5, 2);
      texCtx.fillStyle = `rgba(200, 180, 150, ${this.noise(0, 0.1)})`;
      texCtx.beginPath();
      texCtx.arc(x, y, r, 0, Math.PI * 2);
      texCtx.fill();
    }

    // Fibers
    for (let i = 0; i < 50; i++) {
      const x1 = this.noise(0, 512);
      const y1 = this.noise(0, 512);
      const x2 = x1 + this.noise(0, 200);
      const y2 = y1 + this.noise(0, 200);
      texCtx.strokeStyle = `rgba(200, 180, 150, 0.1)`;
      texCtx.lineWidth = 0.5;
      texCtx.beginPath();
      texCtx.moveTo(x1, y1);
      texCtx.lineTo(x2, y2);
      texCtx.stroke();
    }

    this.ctx.globalAlpha = 0.1;
    this.ctx.globalCompositeOperation = "multiply";
    this.ctx.drawImage(texCanvas, 0, 0, this.canvas.width, this.canvas.height);
    this.ctx.globalCompositeOperation = "source-over";
    this.ctx.globalAlpha = 1.0;
  }
}