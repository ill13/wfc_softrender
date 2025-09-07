// js/classes/ParchmentOverlay.js
// 🎨 Watercolor/Painterly Style Parchment Overlay
class ParchmentOverlay {
    constructor(width, height, themeName, seed) {
        this.width = width;
        this.height = height;
        this.themeName = themeName;
        this.seed = seed;
        this.canvas = null;
        this.ctx = null;
        this.biomeColors = {};
        this.biomeOrder = [];
        this.theme = null;
        this.mapData = null;
        this.renderScale = 1;
        this.tileSizeBase = 48;

        // Deterministic PRNG
        this.seedRandom = this.makeSeededRandom(seed);
    }

    makeSeededRandom(seed) {
        let s = (seed || 1) * 0x2f6e2b;
        return () => {
            s = (s * 0x41c64e6d + 12345) >>> 0;
            return (s & 0x7fffffff) / 0x7fffffff;
        };
    }

    noise(min, max) {
        return this.seedRandom() * (max - min) + min;
    }

    // Linear interpolation helper
    lerp(a, b, t) {
        return a + (b - a) * t;
    }

    // Map value from one range to another
    map(value, inMin, inMax, outMin, outMax) {
        return ((value - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin;
    }

    initFromTheme(theme) {
        this.theme = theme;
        this.biomeColors = {};
        Object.keys(theme.elevation).forEach((id) => {
            const visual = theme.elevation[id];
            const color = this.parseColor(visual.colors?.[0]);
            this.biomeColors[id] = {
                r: color.r,
                g: color.g,
                b: color.b,
                alpha: 0.75,
            };
        });

        // 💧 OVERRIDE: Boost water presence
        if (this.biomeColors.water) {
            // Richer teal-blue, slightly desaturated for painterly feel
            this.biomeColors.water.r = 80; // was likely ~150+
            this.biomeColors.water.g = 140; // more green-blue
            this.biomeColors.water.b = 255; // deeper sky blue
            this.biomeColors.water.alpha = 1; // stronger presence
        }

        this.biomeOrder = ["barrens", "water", "meadow", "forest", "spire"].filter((id) => this.biomeColors[id]);
    }

    parseColor(hex) {
        if (!hex || typeof hex !== "string" || !hex.startsWith("#")) {
            return { r: 100, g: 100, b: 100 };
        }
        let h = hex.slice(1);
        if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
        if (h.length !== 6) return { r: 100, g: 100, b: 100 };
        return {
            r: parseInt(h.slice(0, 2), 16) || 100,
            g: parseInt(h.slice(2, 4), 16) || 100,
            b: parseInt(h.slice(4, 6), 16) || 100,
        };
    }

    createCanvas() {
        const tileSizeBase = Math.min(48, 600 / Math.max(this.width, this.height));
        const scale = 2; // Render at 2x for crispness

        const canvasWidth = this.width * tileSizeBase * scale;
        const canvasHeight = this.height * tileSizeBase * scale;

        this.canvas = document.createElement("canvas");
        this.canvas.width = canvasWidth;
        this.canvas.height = canvasHeight;

        // Set *actual* pixel dimensions
        this.canvas.style.width = `${this.width * tileSizeBase}px`;
        this.canvas.style.height = `${this.height * tileSizeBase}px`;

        // Styling
        this.canvas.style.position = "absolute";
        this.canvas.style.top = "0";
        this.canvas.style.left = "0";
        this.canvas.style.zIndex = "1";
        this.canvas.style.pointerEvents = "none";
        this.canvas.style.display = "block";
        this.canvas.style.margin = "0 auto";
        this.canvas.style.outline = "";

        // 🔍 Enable smooth downscaling (browser blurs slightly when shrinking)
        this.canvas.style.imageRendering = "auto"; // Let browser smooth
        // Alternative: "crisp-edges" or "-webkit-optimize-contrast" if you prefer sharper

        this.ctx = this.canvas.getContext("2d");
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = "high"; // Use high-quality scaling

        // Export for use in rendering
        this.renderScale = scale;
        this.tileSizeBase = tileSizeBase;

        return this.canvas;
    }

    render() {
        if (!this.ctx || !this.mapData) return;

        const w = this.width;
        const h = this.height;
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        const ctx = this.ctx;

        // Clear
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        // Base parchment
        ctx.fillStyle = "#f0cb9bff";
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Generate soft sites (cell centers with jitter)
        const sites = this.computeVoronoiSites(canvasWidth, canvasHeight, w, h);

        // Draw biomes in order using brushstrokes and soft washes
        this.biomeOrder.forEach((biomeId) => {
            const color = this.biomeColors[biomeId];
            if (!color) return;

            ctx.save();
            ctx.globalCompositeOperation = "source-over";
            ctx.globalAlpha = 0.8;

            this.drawBiomeWatercolorWash(ctx, sites, biomeId, color, canvasWidth, canvasHeight);
            this.drawBiomeBrushstrokes(ctx, sites, biomeId, color, canvasWidth, canvasHeight);
            ctx.restore();
        });

        // Add soft biome borders (wet-edge bleed)
        this.drawBiomeBleedBorders(ctx, sites);

        // Draw biome-specific doodles at centers
        const size = canvasWidth / this.width;
        sites.forEach((site) => {
            const { col, row } = site;
            if (row >= h || col >= w || row < 0 || col < 0) return;
            const biomeId = this.mapData[row][col];
            if (!biomeId || !this.biomeColors[biomeId]) return;
            this.drawBiomeArtAt(site.x, site.y, biomeId, size);
        });

        // ✨ Add pigment blooms
        this.drawWatercolorBackruns(ctx, sites);

        // Add paper texture with multiply blend
        this.addParchmentTexture();

        // Final soft border (hand-drawn ink)
        this.drawHandDrawnBorder(ctx, canvasWidth, canvasHeight);

        // Reset
        ctx.globalAlpha = 1.0;
        ctx.globalCompositeOperation = "source-over";

        // At the very end of render(), after everything else:
        ctx.save();
        ctx.filter = "blur(0.5px)";
        ctx.drawImage(this.canvas, 0, 0); // redraw with blur
        ctx.filter = "none";
        ctx.restore();
    }

    computeVoronoiSites(canvasWidth, canvasHeight, cols, rows) {
        const sites = [];
        const dx = canvasWidth / cols;
        const dy = canvasHeight / rows;
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const x = (col + 0.5 + this.noise(-0.5, 0.5) * 0.6) * dx;
                const y = (row + 0.5 + this.noise(-0.5, 0.5) * 0.6) * dy;
                sites.push({ x, y, col, row });
            }
        }
        return sites;
    }

    drawBiomeWatercolorWash(ctx, sites, biomeId, color, canvasWidth, canvasHeight) {
        const step = 6;
        const noiseScale = 0.015;

        // Base alpha ranges
        let baseMin = 0.3;
        let baseMax = 0.6;
        let useDepthShading = false;

        if (biomeId === "water") {
            baseMin = 0.4;
            baseMax = 0.75;
            useDepthShading = true; // Enable depth effect
        }

        for (let y = 0; y < canvasHeight; y += step) {
            for (let x = 0; x < canvasWidth; x += step) {
                const site = this.findClosestSite(sites, x, y);
                const { col, row } = site;
                if (row < 0 || row >= this.height || col < 0 || col >= this.width || this.mapData[row][col] !== biomeId) continue;

                const n = this.fbm(x * noiseScale, y * noiseScale, 2, 0.6);
                let alpha = this.lerp(baseMin, baseMax, n) * color.alpha;

                // 💧 Water depth shading: darker in center of water mass
                if (useDepthShading) {
                    const clusterCenter = this.getWaterClusterCenter(col, row);
                    const dx = (col - clusterCenter.cx) * 48; // Approx cell coords
                    const dy = (row - clusterCenter.cy) * 48;
                    const distFromCenter = Math.sqrt(dx * dx + dy * dy);
                    const falloff = this.map(distFromCenter, 0, 120, 1.0, 0.6); // 2–3 tiles radius
                    alpha *= falloff; // Reduce alpha (lighter) at edges
                }

                ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
                ctx.fillRect(x, y, step, step);
            }
        }
    }

    getWaterClusterCenter(col, row) {
        const maxDist = 3; // Search within 3 tiles
        const queue = [{ col, row, dist: 0 }];
        const visited = new Set();
        const waterCells = [];

        while (queue.length > 0) {
            const { col, row, dist } = queue.shift();
            const key = `${col},${row}`;
            if (visited.has(key) || dist > maxDist) continue;
            visited.add(key);

            if (this.mapData[row]?.[col] === "water") {
                waterCells.push({ col, row });
                // Add neighbors
                for (const [dx, dy] of [
                    [-1, 0],
                    [1, 0],
                    [0, -1],
                    [0, 1],
                ]) {
                    queue.push({ col: col + dx, row: row + dy, dist: dist + 1 });
                }
            }
        }

        if (waterCells.length === 0) {
            return { cx: col, cy: row };
        }

        const cx = waterCells.reduce((sum, c) => sum + c.col, 0) / waterCells.length;
        const cy = waterCells.reduce((sum, c) => sum + c.row, 0) / waterCells.length;

        return { cx, cy };
    }

    drawWatercolorBackruns(ctx, sites) {
        const count = this.width * this.height * 0.3; // ~1–2 per few tiles
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;

        for (let i = 0; i < count; i++) {
            const site = sites[Math.floor(this.noise(0, sites.length))];
            const { col, row } = site;
            if (row >= this.height || col >= this.width) continue;

            // Only on water or forest (moist areas)
            const biomeId = this.mapData[row][col];
            if (!["water", "forest", "meadow"].includes(biomeId)) continue;

            const x = site.x + this.noise(-20, 20);
            const y = site.y + this.noise(-20, 20);
            const color = this.biomeColors[biomeId];

            // Dark center (pigment concentration)
            const r1 = this.noise(8, 14);
            const grad1 = ctx.createRadialGradient(x, y, 0, x, y, r1);
            grad1.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, 0.5)`);
            grad1.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0.05)`);
            ctx.fillStyle = grad1;
            ctx.fillRect(x - r1, y - r1, r1 * 2, r1 * 2);

            // Light outer halo (backrun edge)
            const r2 = r1 * 1.8;
            const grad2 = ctx.createRadialGradient(x, y, r1, x, y, r2);
            grad2.addColorStop(0, `rgba(255, 255, 255, 0)`);
            grad2.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0.1)`);
            ctx.fillStyle = grad2;
            ctx.fillRect(x - r2, y - r2, r2 * 2, r2 * 2);
        }
    }

    drawBiomeBrushstrokes(ctx, sites, biomeId, color, canvasWidth, canvasHeight) {
        const strokeCount = this.width * this.height * 0.8;
        for (let i = 0; i < strokeCount; i++) {
            const site = sites[Math.floor(this.noise(0, sites.length))];
            const { col, row } = site;
            if (row >= this.height || col >= this.width || this.mapData[row][col] !== biomeId) continue;

            const x = site.x + this.noise(-20, 20);
            const y = site.y + this.noise(-20, 20);
            const angle = this.noise(0, Math.PI * 2);
            const length = this.noise(6, 14) * (this.renderScale || 1);
            const width = this.noise(1.5, 3.5);
            const alpha = this.noise(0.3, 0.55);

            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(angle);
            ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
            ctx.lineWidth = width;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(-length / 2, this.noise(-2, 2));
            ctx.quadraticCurveTo(0, this.noise(-1, 1), length / 2, this.noise(-2, 2));
            ctx.stroke();
            ctx.restore();
        }
    }

    drawBiomeBleedBorders(ctx, sites) {
        const w = this.width;
        const h = this.height;
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        const step = 4;

        ctx.save();
        ctx.globalCompositeOperation = "multiply";
        ctx.globalAlpha = 0.15;

        for (let y = step / 2; y < canvasHeight; y += step) {
            for (let x = step / 2; x < canvasWidth; x += step) {
                const site = this.findClosestSite(sites, x, y);
                const { col, row } = site;
                if (row < 0 || row >= h || col < 0 || col >= w) continue;

                const neighbors = [
                    [col - 1, row],
                    [col + 1, row],
                    [col, row - 1],
                    [col, row + 1],
                ];
                const isEdge = neighbors.some(([nx, ny]) => {
                    if (nx < 0 || ny < 0 || nx >= w || ny >= h) return false;
                    return this.mapData[ny][nx] !== this.mapData[row][col];
                });

                if (isEdge) {
                    const color = this.biomeColors[this.mapData[row][col]];
                    if (!color) continue;
                    const alpha = this.noise(0.2, 0.4);
                    ctx.fillStyle = `rgba(80, 70, 60, ${alpha})`; // warm ink bleed
                    ctx.fillRect(x - 1, y - 1, 2, 2);
                }
            }
        }
        ctx.restore();
    }

    drawBiomeArtAt(x, y, biomeId, size) {
        const ctx = this.ctx;
        const scale = size / 48;

        if (biomeId === "water") {
            for (let i = 0; i < 3; i++) {
                const dy = 10 * scale + i * 15 * scale;
                ctx.strokeStyle = `rgba(235, 238, 243, 0.36)`;
                ctx.lineWidth = 1 * scale;
                ctx.beginPath();
                ctx.moveTo(x - 20 * scale, y + dy);
                const amp = this.noise(-18, 18) * scale;
                const offset = this.noise(-10, 10) * scale;
                ctx.quadraticCurveTo(x + offset, y + dy + amp, x + 20 * scale, y + dy);
                // ctx.stroke();

                // Add 1–2 soft glow "highlights"
                for (let i = 0; i < 2; i++) {
                    const yy = y + this.noise(10, 40) * scale;
                    ctx.strokeStyle = `rgba(255, 255, 255, 0.12)`;
                    ctx.lineWidth = 1 * scale;
                    ctx.lineCap = "round";
                    ctx.beginPath();
                    ctx.moveTo(x - 20 * scale, yy);
                    ctx.lineTo(x + 20 * scale, yy);
                    // ctx.stroke();
                }
            }
        } else if (biomeId === "forest") {
            for (let i = 0; i < 15; i++) {
                const rx = x + this.noise(-24, 24) * scale;
                const ry = y + this.noise(-24, 24) * scale;
                const dotSize = (2 + this.noise(0, 3)) * scale;
                ctx.fillStyle = `rgba(30, 100, 50, ${0.5 + this.noise(0, 0.3)})`;
                ctx.beginPath();
                ctx.arc(rx, ry, dotSize, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (biomeId === "spire") {
            for (let i = 0; i < 3; i++) {
                const dy = -16 * scale + i * 15 * scale;
                ctx.strokeStyle = `rgba(100, 100, 100, 0.3)`;

                const baseMin = 0.3;
                const baseMax = 0.7;

                const noiseScale = 0.015;
                const n = this.fbm(x * noiseScale, y * noiseScale, 2, 0.6);
                const alpha = this.lerp(baseMin, baseMax, n) * 0.4;
                ctx.strokeStyle = `rgba(100, 100, 100, ${alpha})`;

                ctx.lineWidth = 2 * scale;
                const startX = x - 20 * scale + this.noise(0, 9) * scale;
                const endX = x + 5 * scale + this.noise(0, 15) * scale;
                if (startX >= endX) continue;
                const midX = (startX + endX) / 2;
                const depth = (8 + this.noise(0, 8)) * scale;
                const peakOffset = this.noise(-5, 5) * scale;
                ctx.beginPath();
                ctx.moveTo(startX, y + dy);
                ctx.lineTo(midX + peakOffset, y + dy - depth);
                ctx.lineTo(endX, y + dy);
                ctx.stroke();
            }
        } else if (biomeId === "barrens") {
            for (let i = 0; i < 7; i++) {
                const rx = x + this.noise(-24, 24) * scale;
                const ry = y + this.noise(-24, 24) * scale;
                ctx.save();
                ctx.translate(rx, ry);
                ctx.rotate(this.noise(0, Math.PI * 2));
                ctx.fillStyle = `rgba(160, 30, 60, 0.3)`;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                for (let j = 0; j < 5; j++) {
                    const angle = (Math.PI * 2 * j) / 5;
                    const len = 4 + this.noise(0, 8);
                    const px = Math.cos(angle) * len * scale;
                    const py = Math.sin(angle) * len * scale;
                    ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }
        } else if (biomeId === "meadow") {
            const windLean = this.noise(-5, 5) * scale;
            for (let i = 0; i < 7; i++) {
                const dx = 10 * scale + i * 15 * scale;
                const startY = y + this.noise(0, 38) * scale;
                const length = 2 + this.noise(0, 7);
                const endY = startY + length * scale;
                const controlY = startY + (length / 2) * scale;
                const amp = this.noise(-2, 2) * scale;
                const offset = this.noise(-2, 2) * scale;
                ctx.strokeStyle = `rgba(60, 130, 60, ${0.2 + this.noise(0, 0.3)})`;
                ctx.lineWidth = 0.5 * scale;
                ctx.beginPath();
                ctx.moveTo(x + dx, startY);
                ctx.quadraticCurveTo(x + dx + windLean + amp, controlY + offset, x + dx + windLean, endY);
                ctx.stroke();
            }
        }
    }

    addParchmentTexture() {
        const scale = this.renderScale || 1;
        const texSize = 512 * scale;
        const texCanvas = document.createElement("canvas");
        texCanvas.width = texSize;
        texCanvas.height = texSize;
        const texCtx = texCanvas.getContext("2d");

        texCtx.fillStyle = "#e7c496";
        texCtx.fillRect(0, 0, texSize, texSize);

        // Grain
        const dotCount = 1000 * scale;
        for (let i = 0; i < dotCount; i++) {
            const x = this.noise(0, texSize);
            const y = this.noise(0, texSize);
            const r = this.noise(0.5, 2) * scale;
            texCtx.fillStyle = `rgba(200, 180, 150, ${this.noise(0, 0.15)})`;
            texCtx.beginPath();
            texCtx.arc(x, y, r, 0, Math.PI * 2);
            texCtx.fill();
        }

        // Fibers
        const fiberCount = 60 * scale;
        for (let i = 0; i < fiberCount; i++) {
            const x1 = this.noise(0, texSize);
            const y1 = this.noise(0, texSize);
            const x2 = x1 + this.noise(0, 200 * scale);
            const y2 = y1 + this.noise(0, 200 * scale);
            texCtx.strokeStyle = `rgba(200, 180, 150, 0.4)`;
            texCtx.lineWidth = 0.4 * scale;
            texCtx.beginPath();
            texCtx.moveTo(x1, y1);
            texCtx.lineTo(x2, y2);
            texCtx.stroke();
        }

        this.ctx.globalAlpha = 0.4;
        this.ctx.globalCompositeOperation = "multiply";
        this.ctx.drawImage(texCanvas, 0, 0, this.canvas.width, this.canvas.height);
        this.ctx.globalCompositeOperation = "source-over";
        this.ctx.globalAlpha = 1.0;
    }

    drawHandDrawnBorder(ctx, width, height) {
        ctx.save();
        ctx.strokeStyle = "rgba(100, 90, 80, 0.2)";
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        const pad = 10;
        const points = [
            { x: pad, y: pad },
            { x: width - pad, y: pad },
            { x: width - pad, y: height - pad },
            { x: pad, y: height - pad },
        ];

        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
            const a = points[i];
            const b = points[(i + 1) % 4];
            const mx = (a.x + b.x) / 2 + this.noise(-8, 8);
            const my = (a.y + b.y) / 2 + this.noise(-8, 8);
            if (i === 0) ctx.moveTo(a.x + this.noise(-5, 5), a.y + this.noise(-5, 5));
            ctx.quadraticCurveTo(mx, my, b.x + this.noise(-5, 5), b.y + this.noise(-5, 5));
        }
        ctx.stroke();
        ctx.restore();
    }

    // Simple 2D fBm (fractal Brownian motion)
    fbm(x, y, octaves = 3, persistence = 0.5) {
        let value = 0;
        let amplitude = 1;
        let frequency = 1;
        let max = 0;
        for (let i = 0; i < octaves; i++) {
            value += this.simplex2(x * frequency, y * frequency) * amplitude;
            max += amplitude;
            amplitude *= persistence;
            frequency *= 2;
        }
        return value / max;
    }

    // Very simple 2D value noise (approximate simplex)
    simplex2(x, y) {
        const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        return (n - Math.floor(n)) * 2 - 1; // -1 to 1
    }

    findClosestSite(sites, x, y) {
        let best = sites[0];
        let bestDist = Infinity;
        for (const site of sites) {
            const dx = site.x - x;
            const dy = site.y - y;
            const d = dx * dx + dy * dy;
            if (d < bestDist) {
                best = site;
                bestDist = d;
            }
        }
        return best;
    }

    setMapData(grid) {
        this.mapData = grid.map((row) => row.map((cell) => cell.terrain));
    }
}
