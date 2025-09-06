// js/classes/ParchmentOverlay.js
// voroni style
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
        let s = (seed || 1) * 0x2f6e2b;
        return () => {
            s = (s * 0x41c64e6d + 12345) >>> 0;
            return (s & 0x7fffffff) / 0x7fffffff;
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
        Object.keys(theme.elevation).forEach((id) => {
            const visual = theme.elevation[id];
            const color = this.parseColor(visual.colors?.[0]);
            this.biomeColors[id] = {
                r: color.r,
                g: color.g,
                b: color.b,
                alpha: 0.8,
            };
        });

        // Define layer order: Mountains on top, Barrens on bottom
        this.biomeOrder = [
            "barrens", // bottom
            "water",
            "meadow",
            "forest",
            "spire", // top
        ].filter((id) => this.biomeColors[id]); // Only include existing biomes
    }

    parseColor(hex) {
        if (!hex || typeof hex !== "string" || !hex.startsWith("#")) {
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
            b: parseInt(h.slice(4, 6), 16) || 100,
        };
    }

    // Set map data (from WFC.grid after collapse)
    setMapData(grid) {
        this.mapData = grid.map((row) => row.map((cell) => cell.terrain));
    }

    // Create and prep canvas
    createCanvas() {
        const tileSizeBase = Math.min(48, 600 / Math.max(this.width, this.height));
        const scale = 1; // High-res render
        const canvasWidth = this.width * tileSizeBase * scale;
        const canvasHeight = this.height * tileSizeBase * scale;

        this.canvas = document.createElement("canvas");
        this.canvas.width = canvasWidth;
        this.canvas.height = canvasHeight;
        this.canvas.style.position = "absolute";
        this.canvas.style.top = "0";
        this.canvas.style.left = "0";
        this.canvas.style.zIndex = "1";
        this.canvas.style.pointerEvents = "none";
        this.canvas.style.display = "block";
        this.canvas.style.margin = "0 auto";
        this.canvas.style.outline = "";

        // 🔍 Key: display at 1x, let browser smooth it
        this.canvas.style.imageRendering = "auto"; // Smooth downscale
        this.canvas.style.width = `${this.width * tileSizeBase}px`;
        this.canvas.style.height = `${this.height * tileSizeBase}px`;

        this.ctx = this.canvas.getContext("2d");
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = "high"; // Use high-quality downscaling

        // Export scale for use in render
        this.renderScale = scale;
        this.tileSizeBase = tileSizeBase;

        return this.canvas;
    }

    // Main render function — now with Voronoi-style soft regions!
    render() {
        if (!this.ctx || !this.mapData) return;

        const w = this.width;
        const h = this.height;
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        const ctx = this.ctx;

        // Clear
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        // Parchment base
        ctx.fillStyle = "#f0cb9bff";
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Generate Voronoi-like sites (deterministic)
        const sites = this.computeVoronoiSites(canvasWidth, canvasHeight, w, h);

        // Draw each biome in layer order
        this.biomeOrder.forEach((biomeId) => {
            ctx.save();
            ctx.globalAlpha = 0.85;
            ctx.globalCompositeOperation = "source-over";

            // Sample every 2px for soft field
            const step = 2;
            for (let y = step / 2; y < canvasHeight; y += step) {
                for (let x = step / 2; x < canvasWidth; x += step) {
                    const site = this.findClosestSite(sites, x, y);
                    const { col, row } = site;

                    // Bounds check and biome match
                    if (row >= 0 && row < h && col >= 0 && col < w && this.mapData[row][col] === biomeId) {
                        const color = this.biomeColors[biomeId];
                        if (!color) continue;

                        // Soft radial glow
                        const somenum = 32;
                        const radius = somenum + this.noise(-(somenum / 4), somenum / 8); // slight variation
                        const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
                        grad.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${color.alpha * 0.7})`);
                        grad.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);

                        ctx.fillStyle = grad;
                        ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
                    }
                }
            }

            // Draw soft borders only around mountain (spire) regions
            this.drawMountainOutlines(sites);
            ctx.restore();
        });

        // Draw biome-specific art at cell centers
        const size = canvasWidth / this.width; // nominal tile size
        sites.forEach((site) => {
            const { col, row } = site;
            if (row >= h || col >= w || row < 0 || col < 0) return;
            const biomeId = this.mapData[row][col];
            if (!biomeId || !this.biomeColors[biomeId]) return;
            this.drawBiomeArtAt(site.x, site.y, biomeId, size);
        });

        // Draw soft borders between biomes
        //this.drawBiomeBorders(sites);
        // Add parchment texture on top
        // this.addParchmentTexture();

        // Reset state
        ctx.globalAlpha = 1.0;
        ctx.globalCompositeOperation = "source-over";
    }

    // Generate sites with seeded jitter
    computeVoronoiSites(canvasWidth, canvasHeight, cols, rows) {
        const sites = [];
        const dx = canvasWidth / cols;
        const dy = canvasHeight / rows;
        const rand = () => this.seedRandom();

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const x = (col + 0.5 + (rand() - 0.5) * 0.7) * dx;
                const y = (row + 0.5 + (rand() - 0.5) * 0.7) * dy;
                sites.push({ x, y, col, row });
            }
        }
        return sites;
    }

    // Brute-force closest site (fine for small grids)
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

    // Draw biome art centered at (x, y)
    drawBiomeArtAt(x, y, biomeId, size) {
        const ctx = this.ctx;
        const scale = size / 48; // normalize to 48px base

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
                ctx.strokeStyle = `rgba(60, 130, 60, ${0.7 + this.noise(0, 0.6)})`;
                ctx.lineWidth = 0.5 * scale;
                ctx.beginPath();
                ctx.moveTo(x + dx, startY);
                ctx.quadraticCurveTo(x + dx + windLean + amp, controlY + offset, x + dx + windLean, endY);
                ctx.stroke();
            }
        }
    }

    // Add this method to your class
    drawMountainOutline(sites) {
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;

        // Step 1: Collect all spire sites
        const spireSites = sites.filter((site) => {
            const { col, row } = site;
            return row >= 0 && row < h && col >= 0 && col < w && this.mapData[row][col] === "spire";
        });

        if (spireSites.length === 0) return;

        // Step 2: Find the convex hull (simplified gift wrapping)
        const hull = this.convexHull(spireSites);
        if (hull.length < 3) return; // Need at least 3 points

        // Step 3: Draw a soft, wobbly outline around the hull
        ctx.strokeStyle = "rgba(80, 80, 80, 0.1)";
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        // Add noise to make it feel hand-drawn
        const noise = (min, max) => this.seedRandom() * (max - min) + min;

        ctx.beginPath();
        let lastX, lastY;

        hull.forEach((point, i) => {
            const x = point.x;
            const y = point.y;

            // Wobble the line slightly
            const dx = noise(-6, 6);
            const dy = noise(-6, 6);

            if (i === 0) {
                ctx.moveTo(x + dx, y + dy);
                lastX = x + dx;
                lastY = y + dy;
            } else {
                // Smooth curve between points
                const midX = (lastX + x) / 2;
                const midY = (lastY + y) / 2;
                const cx = midX + noise(-4, 4);
                const cy = midY + noise(-4, 4);

                ctx.quadraticCurveTo(cx, cy, x + dx, y + dy);
                lastX = x + dx;
                lastY = y + dy;
            }
        });

        // Close the loop
        ctx.closePath();
        ctx.stroke();

        // Optional: second fainter stroke for ink bleed
        ctx.strokeStyle = "rgba(100, 90, 80, 0.15)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        hull.forEach((point, i) => {
            const x = point.x;
            const y = point.y;
            const dx = noise(-4, 4);
            const dy = noise(-4, 4);
            if (i === 0) {
                ctx.moveTo(x + dx, y + dy);
            } else {
                const midX = (lastX + x) / 2;
                const midY = (lastY + y) / 2;
                const cx = midX + noise(-3, 3);
                const cy = midY + noise(-3, 3);
                ctx.quadraticCurveTo(cx, cy, x + dx, y + dy);
            }
            lastX = x + dx;
            lastY = y + dy;
        });
        ctx.closePath();
        ctx.stroke();
    }

    convexHull(points) {
        if (points.length < 3) return [];

        // Sort by x, then y
        const sorted = [...points].sort((a, b) => {
            if (a.x !== b.x) return a.x - b.x;
            return a.y - b.y;
        });

        // Start from leftmost point
        let hull = [];
        let current = sorted[0];
        let prevPoint = null;

        while (true) {
            // Find next point on hull
            let next = null;
            let maxAngle = -Infinity;

            for (const p of points) {
                if (p === current || p === prevPoint) continue;

                const angle = this.angleBetween(current, p, prevPoint);
                if (angle > maxAngle) {
                    maxAngle = angle;
                    next = p;
                }
            }

            if (!next) break;

            hull.push(current);
            prevPoint = current;
            current = next;
        }

        // Return the hull points
        return hull;
    }

    angleBetween(a, b, c) {
        // Angle at b between vectors ba and bc
        const ba = { x: a.x - b.x, y: a.y - b.y };
        const bc = { x: c.x - b.x, y: c.y - b.y };

        const dot = ba.x * bc.x + ba.y * bc.y;
        const magBa = Math.sqrt(ba.x * ba.x + ba.y * ba.y);
        const magBc = Math.sqrt(bc.x * bc.x + bc.y * bc.y);

        if (magBa === 0 || magBc === 0) return 0;

        const cosAngle = dot / (magBa * magBc);
        const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle)));

        // Return angle in radians
        return angle;
    }

    addParchmentTexture() {
        const scale = this.renderScale || 1;
        const texSize = 512 * scale;

        const texCanvas = document.createElement("canvas");
        texCanvas.width = texSize;
        texCanvas.height = texSize;
        const texCtx = texCanvas.getContext("2d");

        // Base parchment
        texCtx.fillStyle = "#e7c496";
        texCtx.fillRect(0, 0, texSize, texSize);

        // Grain dots — more at high-res
        const dotCount = scale === 1 ? 1000 : 1000 * scale;
        for (let i = 0; i < dotCount; i++) {
            const x = Math.floor(this.noise(0, texSize));
            const y = Math.floor(this.noise(0, texSize));
            const r = this.noise(0.5, 2) * scale;
            texCtx.fillStyle = `rgba(200, 180, 150, ${this.noise(0, 0.1)})`;
            texCtx.beginPath();
            texCtx.arc(x, y, r, 0, Math.PI * 2);
            texCtx.fill();
        }

        // Fibers — scale length and count
        const fiberCount = scale === 1 ? 50 : 50 * scale;
        for (let i = 0; i < fiberCount; i++) {
            const x1 = this.noise(0, texSize);
            const y1 = this.noise(0, texSize);
            const x2 = x1 + this.noise(0, 200 * scale);
            const y2 = y1 + this.noise(0, 200 * scale);
            texCtx.strokeStyle = `rgba(200, 180, 150, 1)`;
            texCtx.lineWidth = 0.5 * scale;
            texCtx.beginPath();
            texCtx.moveTo(x1, y1);
            texCtx.lineTo(x2, y2);
            texCtx.stroke();
        }

        this.ctx.globalAlpha = 0.51;
        this.ctx.globalCompositeOperation = "multiply";
        this.ctx.drawImage(texCanvas, 0, 0, this.canvas.width, this.canvas.height);
        this.ctx.globalCompositeOperation = "source-over";
        this.ctx.globalAlpha = 1.0;
    }
}
