// js/classes/WatercolorOverlay.js
class WatercolorOverlay {
    constructor(mapArea, width, height, tileSize, seed) {
        this.mapArea = mapArea;
        this.width = width;
        this.height = height;
        this.tileSize = tileSize;
        this.seed = seed;

        // Create contexts
        this.parchmentCanvas = document.getElementById("parchmentCanvas");
        this.watercolorCanvas = document.getElementById("watercolorCanvas");

        if (!this.parchmentCanvas || !this.watercolorCanvas) {
            console.warn("Canvases not found. Skipping watercolor overlay.");
            return;
        }

        this.parchmentCtx = this.parchmentCanvas.getContext("2d");
        this.ctx = this.watercolorCanvas.getContext("2d");

        this.resize();
        window.addEventListener("resize", () => this.resize());

        // Draw parchment once
        this.drawParchment();
    }

    resize() {
        const gridEl = document.getElementById("mapGrid");
        if (!gridEl || !gridEl.firstChild) {
            // If grid not rendered yet, use fallback or skip
            return;
        }
        const gridRect = gridEl.getBoundingClientRect();
        const scale = window.devicePixelRatio || 1;

        this.parchmentCanvas.width = gridRect.width * scale;
        this.parchmentCanvas.height = gridRect.height * scale;
        this.watercolorCanvas.width = gridRect.width * scale;
        this.watercolorCanvas.height = gridRect.height * scale;

        this.parchmentCanvas.style.width = `${gridRect.width}px`;
        this.parchmentCanvas.style.height = `${gridRect.height}px`;
        this.watercolorCanvas.style.width = `${gridRect.width}px`;
        this.watercolorCanvas.style.height = `${gridRect.height}px`;

        this.parchmentCtx.scale(scale, scale);
        this.ctx.scale(scale, scale);

        // Reset the canvas position to align with grid
        this.parchmentCanvas.style.position = "absolute";
        this.watercolorCanvas.style.position = "absolute";
        this.parchmentCanvas.style.left = `${gridRect.left - this.mapArea.getBoundingClientRect().left}px`;
        this.parchmentCanvas.style.top = `${gridRect.top - this.mapArea.getBoundingClientRect().top}px`;
        this.watercolorCanvas.style.left = this.parchmentCanvas.style.left;
        this.watercolorCanvas.style.top = this.parchmentCanvas.style.top;
    }

    drawParchment() {
        const w = this.parchmentCanvas.width / (window.devicePixelRatio || 1);
        const h = this.parchmentCanvas.height / (window.devicePixelRatio || 1);
        const imageData = this.parchmentCtx.createImageData(w, h);
        for (let i = 0; i < imageData.data.length; i += 4) {
            const value = 245 + Math.random() * 10;
            const tint = Math.random() > 0.9 ? 10 : 0;
            imageData.data[i] = value + tint; // R
            imageData.data[i + 1] = value - 10 + tint; // G
            imageData.data[i + 2] = value - 30; // B
            imageData.data[i + 3] = 255; // A
        }
        this.parchmentCtx.putImageData(imageData, 0, 0);

        // Lighten with screen blend
        this.parchmentCtx.globalCompositeOperation = "screen";
        this.parchmentCtx.fillStyle = "rgba(255, 255, 220, 0.1)";
        this.parchmentCtx.fillRect(0, 0, w, h);
        this.parchmentCtx.globalCompositeOperation = "source-over";
    }

    drawGrain(x, y, size, color, alpha) {
        this.ctx.save();
        this.ctx.globalAlpha = alpha;
        this.ctx.fillStyle = color;
        for (let i = 0; i < 6; i++) {
            const rx = x - size / 2 + Math.random() * size;
            const ry = y - size / 2 + Math.random() * size;
            this.ctx.fillRect(rx, ry, 1, 1);
        }
        this.ctx.restore();
    }

    drawFluffyBlob(x, y, rgb, size = 4) {
        this.ctx.save();
       // const angle = Math.random() * Math.PI * 2;
        //this.ctx.translate(x, y);
       // this.ctx.rotate(angle);

        const numLayers = 2;
        const maxRadius = size * 1.1;

        /* circles */
        // for (let i = 0; i < numLayers; i++) {
        //     const r = maxRadius * (i / numLayers);
        //     const opacity = 0.25 - i * 0.015;
        //     const jitterX = Math.random() * 15 - 7.5;
        //     const jitterY = Math.random() * 15 - 7.5;

        //     const noise = (min, max) => Math.random() * (max - min) + min;
        //     const some_num = 20;
        //     this.ctx.fillStyle = `rgba(${rgb.r + noise(-some_num, some_num)}, ${rgb.g + noise(-some_num, some_num)}, ${rgb.b + noise(-some_num, some_num)}, ${opacity})`;

        //     this.ctx.beginPath();
        //     this.ctx.arc(jitterX, jitterY, r, 0, Math.PI * 2);
        //     this.ctx.fill();
        // }

        // pencil hatches
       for (let i = 0; i < numLayers; i++) {
          const ctx = this.ctx;
          size = 1.1;
          const scale = size; // Control overall size

          // Base dimensions
          const patchSize = 50 * scale; // Area covered by hatching
          const lineLength = 60 * scale; // Slightly longer than patch for overlap
          const numLines = Math.floor(8 * scale); // Number of lines per set

          // Color with subtle noise for pencil grain
          const noise = (min, max) => Math.random() * (max - min) + min;
          const some_num = 20;
          const r = Math.max(0, Math.min(255, rgb.r + noise(-some_num, some_num)));
          const g = Math.max(0, Math.min(255, rgb.g + noise(-some_num, some_num)));
          const b = Math.max(0, Math.min(255, rgb.b + noise(-some_num, some_num)));

          // Angles for cross-hatch: 45° and -45°
          const angle1 = (45 * Math.PI) / 180;
          const angle2 = (-45 * Math.PI) / 180;

          // Slight random rotation of the entire hatch pattern (per call)
          const globalRotation = noise(-0.2, 0.2);
          const cosG = Math.cos(globalRotation);
          const sinG = Math.sin(globalRotation);

          // Local transform: center around (x, y)
          const center = (vec) => {
              return {
                  x: x + vec.x * cosG - vec.y * sinG,
                  y: y + vec.x * sinG + vec.y * cosG,
              };
          };


          // Draw two sets of hatching lines
          [angle1, angle2].forEach((angle, setIndex) => {
              const spacing = 4 * scale + noise(-2, 2); // Distance between lines
              const jitterOffset = noise(-5, 5); // Shift entire set randomly

              for (let i = 0; i < numLines; i++) {
                  const offset = (i - numLines / 2) * spacing + jitterOffset;
                  const cosA = Math.cos(angle);
                  const sinA = Math.sin(angle);

                  // Define line segment centered at (0,0), then rotate and offset
                  const halfLen = lineLength / 2;
                  const startX = -halfLen * sinA + offset * cosA;
                  const startY = halfLen * cosA + offset * sinA;
                  const endX = halfLen * sinA + offset * cosA;
                  const endY = -halfLen * cosA + offset * sinA;

                  // Apply global rotation and position
                  const p1 = center({ x: startX, y: startY });
                  const p2 = center({ x: endX, y: endY });

                  // Randomize line appearance
                  const opacity = 0.1 + Math.random() * 0.25;
                  const lineWidth = (0.5 + Math.random() * 0.8) * scale;

                  // Add slight wobble in the middle for hand-drawn feel
                  ctx.beginPath();
                  if (Math.random() < 0.7) {
                      // Straight-ish line with small wobble
                      const midX = (p1.x + p2.x) / 2 + noise(-3, 3) * scale;
                      const midY = (p1.y + p2.y) / 2 + noise(-3, 3) * scale;
                      ctx.moveTo(p1.x, p1.y);
                      ctx.quadraticCurveTo(midX, midY, p2.x, p2.y);
                  } else {
                      // Or just straight
                      ctx.moveTo(p1.x, p1.y);
                      ctx.lineTo(p2.x, p2.y);
                  }

                  ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
                  ctx.lineWidth = lineWidth;
                  ctx.stroke();
              }
          });
        }



        /* splats and spikes */
        // for (let i = 0; i < numLayers; i++) {
        //     const r = maxRadius * (i / numLayers);
        //     const opacity = 0.25 - i * 0.015;
        //     const jitterX = Math.random() * 15 - 7.5;
        //     const jitterY = Math.random() * 15 - 7.5;

        //     const noise = (min, max) => Math.random() * (max - min) + min;
        //     const some_num = 20;
        //     this.ctx.fillStyle = `rgba(${rgb.r + noise(-some_num, some_num)}, ${rgb.g + noise(-some_num, some_num)}, ${rgb.b + noise(-some_num, some_num)}, ${opacity})`;

        //     this.ctx.beginPath();

        //     const numPoints = 8 + Math.floor(Math.random() * 10); // Random number of spikes
        //     const spikes = 0.2 + Math.random() * 0.4; // How "spiky" the shape is (0 = circle, 1 = very jagged)

        //     for (let j = 0; j < numPoints * 2; j++) {
        //         const angle = ((Math.PI * 2) / numPoints) * j;
        //         const spikeFactor = j % 2 === 0 ? 1 + spikes : 1 - spikes * 0.5; // Alternate long/short radii
        //         const radius = r * spikeFactor * (0.8 + Math.random() * 0.4); // Vary radius per point
        //         const x = jitterX + radius * Math.cos(angle);
        //         const y = jitterY + radius * Math.sin(angle);

        //         if (j === 0) {
        //             this.ctx.moveTo(x, y);
        //         } else {
        //             this.ctx.lineTo(x, y);
        //         }
        //     }

        //     this.ctx.closePath();
        //     this.ctx.fill();
        // }

        /* cotton balls */
        // for (let i = 0; i < numLayers; i++) {
        //     const r = maxRadius * (i / numLayers);
        //     const opacity = 0.25 - i * 0.015;
        //     const jitterX = Math.random() * 15 - 7.5;
        //     const jitterY = Math.random() * 15 - 7.5;

        //     const noise = (min, max) => Math.random() * (max - min) + min;
        //     const some_num = 20;
        //     this.ctx.fillStyle = `rgba(${rgb.r + noise(-some_num, some_num)}, ${rgb.g + noise(-some_num, some_num)}, ${rgb.b + noise(-some_num, some_num)}, ${opacity})`;

        //     this.ctx.beginPath();

        //     const numPoints = 12 + Math.floor(Math.random() * 8); // More points = smoother spikes
        //     const spikeAmplitude = 0.3 + Math.random() * 0.5; // How extreme the spikes are
        //     const baseScale = 0.8 + Math.random() * 0.4; // Overall size variation

        //     for (let j = 0; j < numPoints; j++) {
        //         const angle = ((Math.PI * 2) / numPoints) * j;

        //         // 👉 Horizontal bias: boost radius near 0 and π (left/right)
        //         const horizontalBoost = Math.cos(angle) * 0.7; // Max at 0 and π, min at π/2 and 3π/2
        //         const directionalFactor = 1 + spikeAmplitude * horizontalBoost;

        //         // Add per-point randomness, but keep horizontal bias
        //         const randomFactor = 0.8 + Math.random() * 0.4;
        //         const radius = r * directionalFactor * randomFactor;

        //         const x = jitterX + radius * Math.cos(angle);
        //         const y = jitterY + radius * Math.sin(angle);

        //         if (j === 0) {
        //             this.ctx.moveTo(x, y);
        //         } else {
        //             this.ctx.lineTo(x, y);
        //         }
        //     }

        //     this.ctx.closePath();
        //     this.ctx.fill();
        // }

        /* paint strokes */
        // for (let i = 0; i < numLayers; i++) {
        //     const r = maxRadius * (i / numLayers);
        //     const opacity = 0.25 - i * 0.015;
        //     const jitterX = Math.random() * 10 - 5;
        //     const jitterY = Math.random() * 10 - 5;

        //     const noise = (min, max) => Math.random() * (max - min) + min;
        //     const some_num = 20;
        //     this.ctx.fillStyle = `rgba(${rgb.r + noise(-some_num, some_num)}, ${rgb.g + noise(-some_num, some_num)}, ${rgb.b + noise(-some_num, some_num)}, ${opacity})`;

        //     this.ctx.beginPath();

        //     // 👇 Control: number of spikes (fewer = more defined)
        //     const numSpikes = 6 + Math.floor(Math.random() * 2); // 6–7 spike pairs → clean structure
        //     const spikeHeight = 0.4 + Math.random() * 0.6; // How long the spikes are (relative to radius)
        //     const randomness = 0.1; // Keep low for sharpness, not fluff

        //     // 👉 We'll manually place spikes at key angles, favoring left/right
        //     const angles = [
        //         -Math.PI / 6, // slightly up from right
        //         Math.PI / 6, // slightly down from right
        //         Math.PI - Math.PI / 6, // slightly up from left
        //         Math.PI + Math.PI / 6, // slightly down from left
        //         // Optional: weak verticals, or skip them to favor horizontal
        //         // -Math.PI / 2,   // up
        //         // Math.PI / 2     // down
        //     ];

        //     // Add some random non-cardinal spikes, but bias them toward horizontal
        //     while (angles.length < numSpikes * 2) {
        //         const a = Math.random() * Math.PI * 2;
        //         // Prefer angles near 0 or π (left/right)
        //         if (Math.random() < 0.7 && Math.abs(Math.cos(a)) > 0.8) {
        //             angles.push(a);
        //         } else if (Math.random() < 0.3) {
        //            // angles.push(a); // occasional random
        //         }
        //     }

        //     // Sort so we draw in order around the circle
        //     angles.sort((a, b) => a - b);

        //     for (let j = 0; j < angles.length; j++) {
        //         const angle = angles[j];

        //         // Base radius
        //         let radius = r;

        //         // 👉 Sharply increase radius only near left/right
        //         if (Math.abs(Math.cos(angle)) > 0.9) {
        //             radius *= 1 + spikeHeight; // long spike → sharp point
        //         } else {
        //             radius *= 0.6 + Math.random() * 0.2; // short "valleys"
        //         }

        //         // Add minimal randomness to avoid perfect symmetry
        //         const x = jitterX + radius * Math.cos(angle) * (1 + Math.random() * randomness);
        //         const y = jitterY + radius * Math.sin(angle) * (1 + Math.random() * randomness);

        //         if (j === 0) {
        //             this.ctx.moveTo(x, y);
        //         } else {
        //             this.ctx.lineTo(x, y);
        //         }
        //     }

        //     this.ctx.closePath();
        //     this.ctx.fill();
        // }

        this.ctx.globalCompositeOperation = "screen"; // or 'lighter'
        this.ctx.restore();
    }

    
    
    
    draw(x, y, rgb, size = 0.1) {
    const ctx = this.ctx;
    const scale = size;
    const baseWidth = .60 * scale;   // Base stroke width
    const height = 0.15 * scale;      // Height of each stroke
    const numStrokes = 3;           // Layer 2–3 strokes for depth

    // Color with pigment-like variation
    const noise = (min, max) => Math.random() * (max - min) + min;
    const r = Math.max(0, Math.min(255, rgb.r + noise(-15, 15)));
    const g = Math.max(0, Math.min(255, rgb.g + noise(-15, 15)));
    const b = Math.max(0, Math.min(255, rgb.b + noise(-15, 15)));

    // Random horizontal and vertical jitter
    const jitterX = noise(-10 * scale, 10 * scale);
    const jitterY = noise(-5 * scale, 5 * scale);

    // Center point with jitter
    const centerX = x + jitterX;
    const centerY = y + jitterY;

    // Draw multiple overlapping strokes for wet-on-wet effect
    for (let s = 0; s < numStrokes; s++) {
        const opacity = 0.15 + Math.random() * 0.2; // Low opacity for layering
        const strokeOffsetY = centerY + (s - numStrokes / 2 + 0.5) * (height * 0.8);

        // Vary width slightly per stroke
        const width = baseWidth * (0.8 + Math.random() * 0.4);
        const halfWidth = width / 2;

        // Create a wavy, organic shape using a custom path
        ctx.save();
        ctx.beginPath();

        // Start at left
        let startX = centerX - halfWidth;
        let startY = strokeOffsetY + noise(-1, 1) * scale;
        ctx.moveTo(startX, startY);

        // Sample points along the stroke to make it wavy
        const segments = 8;
        const points = [];

        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const xPoint = centerX - halfWidth + t * width;

            // Natural wave + slight turbulence
            const wave = Math.sin(t * Math.PI) * noise(1 * scale, 3 * scale);
            const taperNoise = 1 - Math.pow(2 * t - 1, 2); // Pinch ends
            const yNoise = noise(-2 * scale, 2 * scale) * taperNoise;
            const yOffset = wave + yNoise;

            const yPoint = strokeOffsetY + yOffset;
            points.push({ x: xPoint, y: yPoint });

            if (i === 0) {
                ctx.lineTo(xPoint, yPoint);
            } else {
                // Smooth curve between points
                const xc = (points[i - 1].x + xPoint) / 2;
                const yc = (points[i - 1].y + yPoint) / 2;
                ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, xc, yc);
            }
        }

        // Close the shape downward to create a soft, filled stroke
        ctx.lineTo(centerX + halfWidth, strokeOffsetY + height / 2 + noise(-1, 1));
        ctx.lineTo(centerX - halfWidth, strokeOffsetY + height / 2 + noise(-1, 1));
        ctx.closePath();

        // Gradient for soft, diffused edges (like watercolor bleed)
        const gradient = ctx.createLinearGradient(
            centerX - halfWidth,
            strokeOffsetY,
            centerX + halfWidth,
            strokeOffsetY
        );
        gradient.addColorStop(0.0, `rgba(${r}, ${g}, ${b}, ${opacity * 0.5})`);
        gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${opacity})`);
        gradient.addColorStop(1.0, `rgba(${r}, ${g}, ${b}, ${opacity * 0.7})`);

        ctx.fillStyle = gradient;
        ctx.fill();

        // Add subtle "drips" occasionally
        if (Math.random() < 0.3) {
            const dripX = centerX - halfWidth + Math.random() * width;
            const dripLength = 5 * scale + Math.random() * 10 * scale;
            const dripWidth = Math.random() < 0.5 ? 0.5 : 1.0;

            ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity * 0.6})`;
            ctx.lineWidth = dripWidth;
            ctx.beginPath();
            ctx.moveTo(dripX, strokeOffsetY + height / 2);
            ctx.lineTo(dripX + noise(-2, 2), strokeOffsetY + height / 2 + dripLength);
            ctx.stroke();
        }

        // Optional: very faint paper texture overlay (light grain)
        if (Math.random() < 0.4) {
            ctx.globalCompositeOperation = "color-dodge";
            ctx.fillStyle = `rgba(255, 255, 200, 0.05)`;
            ctx.fillRect(
                centerX - halfWidth,
                strokeOffsetY,
                width,
                height
            );
            ctx.globalCompositeOperation = "source-over";
        }

        ctx.restore();
    }
}
    
    
    
    render(grid, theme) {
        // Reset watercolor canvas
        this.ctx.clearRect(0, 0, this.watercolorCanvas.width, this.watercolorCanvas.height);

        // Use WFC seed for determinism
        Math.seedrandom(this.seed);

        // Define draw order: heaviest on top
        const DRAW_ORDER = ["barrens", "water", "spire", "forest", "meadow"];

        // Configurable density per terrain
        const BLOB_DENSITY = {
            spire: 1.6,
            forest: 1.5,
            meadow: 1.4,
            barrens: 1.3,
            water: 4,
        };

        const getBlobCount = (terrain) => {
            return BLOB_DENSITY[terrain] || 0.3;
        };

        // For each terrain type, in draw order
        for (const terrainType of DRAW_ORDER) {
            const visual = theme.elevation[terrainType];
            if (!visual) continue;

            const baseColor = visual.colors[0];
            const rgb = this.hexToRgb(baseColor);

            for (let y = 0; y < this.height; y++) {
                for (let x = 0; x < this.width; x++) {
                    const cell = grid[y][x];
                    if (cell.terrain !== terrainType) continue;

                    if (Math.random() > getBlobCount(terrainType)) continue;

                    const tileRect = this.getTileRect(x, y);
                    const cx = tileRect.x + this.tileSize / 2;
                    const cy = tileRect.y + this.tileSize / 2;

                    // Blob size slightly larger than tile to bleed
                    // const blobSize = this.tileSize * 1.8;
                    const blobSize = this.tileSize * 0.9;
                    //this.drawFluffyBlob(cx, cy, rgb, blobSize);
                    this.draw(cx, cy, rgb, blobSize);

                    // Optional: Add subtle grain per blob
                    // this.drawGrain(cx, cy, blobSize, `rgba(${rgb.r},${rgb.g},${rgb.b},0.1)`, 1.0);
                }
            }
        }

        // Restore global randomness
        Math.seedrandom();

        console.log("🎨 Watercolor overlay rendered");
    }

    getTileRect(x, y) {
        const gridEl = document.getElementById("mapGrid");
        if (!gridEl || !gridEl.firstChild) return { x: 0, y: 0, width: this.tileSize, height: this.tileSize };

        // Use the first tile to get actual rendered size
        const firstTile = gridEl.firstChild;
        const computedStyle = getComputedStyle(firstTile);
        const tileWidth = parseFloat(computedStyle.width);
        const tileHeight = parseFloat(computedStyle.height);

        // Calculate offset within grid
        return {
            x: x * tileWidth,
            y: y * tileHeight,
            width: tileWidth,
            height: tileHeight,
        };
    }

    hexToRgb(hex) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return { r, g, b };
    }

    clear() {
        this.parchmentCtx.clearRect(0, 0, this.parchmentCanvas.width, this.parchmentCanvas.height);
        this.ctx.clearRect(0, 0, this.watercolorCanvas.width, this.watercolorCanvas.height);
    }
}
