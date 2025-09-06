// js/classes/WaveFunctionCollapse.js
class WaveFunctionCollapse {
    constructor(width, height, themeName) {
        this.width = width;
        this.height = height;
        this.themeName = themeName;
        this.grid = [];
        this.stepCount = 0;
        this.locationCount = 0;
        this.isGenerating = false;
        this.autoSpeed = 0;
        this.placedLocations = [];
        this.mapName = "";
        this.parchment = null; // ← Add this
        this.init();
    }

    init() {
        // Remove existing parchment overlay if present
        const container = document.getElementById("mapGrid");
        if (container) {
            const overlay = container.querySelector("canvas");
            if (overlay) overlay.remove();
        }

        // Re-init grid
        this.grid = [];
        this.stepCount = 0;
        this.locationCount = 0;
        this.placedLocations = [];

        for (let y = 0; y < this.height; y++) {
            this.grid[y] = [];
            for (let x = 0; x < this.width; x++) {
                this.grid[y][x] = {
                    possibilities: Object.keys(TERRAIN_TYPES),
                    collapsed: false,
                    terrain: null,
                    location: null,
                };
            }
        }
        this.log(`Initialized ${this.width}x${this.height} grid`);
        this.updateUI();
    }

    getCell(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return null;
        return this.grid[y][x];
    }

    getNeighbors(x, y) {
        const directions = [
            [-1, 0],
            [1, 0],
            [0, -1],
            [0, 1],
        ];
        return directions.map(([dx, dy]) => ({ x: x + dx, y: y + dy, cell: this.getCell(x + dx, y + dy) })).filter((n) => n.cell);
    }

    findLowestEntropy() {
        let minEntropy = Infinity;
        let candidates = [];
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const cell = this.grid[y][x];
                if (!cell.collapsed && cell.possibilities.length < minEntropy) {
                    minEntropy = cell.possibilities.length;
                    candidates = [{ x, y }];
                } else if (!cell.collapsed && cell.possibilities.length === minEntropy) {
                    candidates.push({ x, y });
                }
            }
        }
        return candidates.length > 0 ? candidates[Math.floor(Math.random() * candidates.length)] : null;
    }

    collapseCell(x, y) {
        const cell = this.grid[y][x];
        if (cell.collapsed) return false;

        let weights = {};
        for (const t of cell.possibilities) {
            let weight = TERRAIN_TYPES[t].weight;
            const neighborMatchCount = this.getNeighbors(x, y).filter((n) => n.cell.collapsed && n.cell.terrain === t).length;
            weight *= Math.pow(1.7, neighborMatchCount);
            weights[t] = weight;
        }

        const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
        if (totalWeight === 0) return false;

        let r = Math.random() * totalWeight;
        let selected = cell.possibilities[0];
        for (const t of cell.possibilities) {
            r -= weights[t];
            if (r <= 0) {
                selected = t;
                break;
            }
        }

        const theme = ThemeManager.current;
        const terrainVisual = theme.elevation[selected];
        const chosenColor = ThemeManager.getRandomColor(terrainVisual.colors);

        cell.terrain = selected;
        cell.possibilities = [selected];
        cell.collapsed = true;
        cell.color = chosenColor;

        this.log(`Collapsed (${x}, ${y}) → ${selected}`);
        return true;
    }

    propagate(x, y) {
        const queue = [{ x, y }];
        const processed = new Set();
        while (queue.length > 0) {
            const { x, y } = queue.shift();
            const key = `${x},${y}`;
            if (processed.has(key)) continue;
            processed.add(key);
            const neighbors = this.getNeighbors(x, y);
            for (const { x: nx, y: ny, cell: neighbor } of neighbors) {
                if (neighbor.collapsed) continue;
                const valid = neighbor.possibilities.filter((p) => {
                    const allowed = TERRAIN_TYPES[p].adjacent;
                    return this.getNeighbors(nx, ny).some(({ cell: nn }) => (nn.collapsed ? allowed.includes(nn.terrain) : true));
                });
                if (valid.length !== neighbor.possibilities.length) {
                    neighbor.possibilities = valid;
                    if (valid.length === 0) {
                        this.log(`Contradiction at (${nx}, ${ny})`);
                        return false;
                    }
                    queue.push({ x: nx, y: ny });
                }
            }
        }
        return true;
    }

    step() {
        if (this.isComplete()) return false;
        const cell = this.findLowestEntropy();
        if (!cell) return false;
        if (this.collapseCell(cell.x, cell.y)) {
            if (!this.propagate(cell.x, cell.y)) {
                this.log("Contradiction!");
                return false;
            }
            this.stepCount++;
            this.updateUI();
            const el = document.querySelector(`[data-pos="${cell.x},${cell.y}"]`);
            if (el) {
                el.classList.add("collapsed");
                setTimeout(() => el.classList.remove("collapsed"), 500);
            }
            return true;
        }
        return false;
    }

    isComplete() {
        return this.grid.flat().every((c) => c.collapsed);
    }

    placeLocations() {
        const cells = [];
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (!this.grid[y][x].location) {
                    cells.push({ x, y });
                }
            }
        }

        const sortedLocations = [...LOCATIONS].sort((a, b) => {
            const countValid = (loc) => cells.filter((pos) => this.isValidLocationSpot(pos.x, pos.y, loc)).length;
            return countValid(a) - countValid(b);
        });

        for (const loc of sortedLocations) {
            const validSpots = cells.filter((pos) => this.isValidLocationSpot(pos.x, pos.y, loc));
            if (validSpots.length === 0) continue;
            const pick = validSpots[Math.floor(Math.random() * validSpots.length)];
            const { x, y } = pick;
            this.grid[y][x].location = loc;
            this.placedLocations.push({ x, y, loc });
            this.locationCount++;
            this.log(`📍 Placed ${loc.name} at (${x}, ${y})`);
            const idx = cells.findIndex((c) => c.x === x && c.y === y);
            if (idx !== -1) cells.splice(idx, 1);
        }
    }

    isValidLocationSpot(x, y, location) {
        const cell = this.grid[y][x];
        if (cell.location) return false;
        const terrain = cell.terrain;
        const rules = location.rules;

        if (rules.on && !rules.on.includes(terrain)) return false;

        if (rules.adjacent && rules.adjacent.length > 0) {
            const neighborTerrains = this.getNeighbors(x, y)
                .filter((n) => n.cell.collapsed)
                .map((n) => n.cell.terrain);
            const hasAllRequired = rules.adjacent.every((req) => neighborTerrains.includes(req));
            if (!hasAllRequired) return false;
        }

        const tooClose = this.placedLocations.some((p) => Math.abs(x - p.x) + Math.abs(y - p.y) < 3);
        if (tooClose) return false;

        return true;
    }

    async autoGenerate_old() {
        if (this.isGenerating) return;

        // Generate name → use as seed
        this.mapName = MapNamer.generate(this);
        const seedValue = MapNamer.stringToSeed(this.mapName);
        Math.seedrandom?.(seedValue); // Requires seedrandom.js

        this.isGenerating = true;
        this.init();
        TemplatePlacer.applyTo(this);

        let attempts = 0;
        const max = this.width * this.height * 2;
        while (!this.isComplete() && attempts < max && this.isGenerating) {
            if (!this.step()) {
                this.log("Restarting...");
                this.init();
                TemplatePlacer.applyTo(this);
                attempts = 0;
            } else {
                attempts++;
            }
            await this.sleep(this.autoSpeed);
        }

        if (this.isComplete() && this.isGenerating) {
            this.placeLocations();
            this.mapName = MapNamer.generate(this); // Re-generate after placing locations
            this.log(`🌍 Map Name: "${this.mapName}"`);
            this.log("🎉 Complete with locations!");
        }

        this.isGenerating = false;
        this.updateUI();
    }

    /**
     * Generate the map automatically with seeded randomness.
     * After completion, applies smart locations and renders the parchment overlay.
     */
    async autoGenerate() {
        if (this.isGenerating) return;

        // Use manual name if provided, else generate one
        const input = document.getElementById("mapNameInput");
        const userInput = input?.value.trim();
        this.mapName = userInput || MapNamer.generate(this);

        // Seed RNG for deterministic generation
        const seedValue = MapNamer.stringToSeed(this.mapName);
        Math.seedrandom?.(seedValue);

        this.isGenerating = true;
        this.init(); // Reset grid
        TemplatePlacer.applyTo(this); // Apply any terrain templates

        let attempts = 0;
        const max = this.width * this.height * 2;

        // Main generation loop
        while (!this.isComplete() && attempts < max && this.isGenerating) {
            if (!this.step()) {
                this.log("Restarting due to contradiction...");
                this.init();
                TemplatePlacer.applyTo(this);
                attempts = 0;
            } else {
                attempts++;
            }
            await this.sleep(this.autoSpeed);
        }

        // ✅ ONLY IF generation succeeded and hasn't been canceled
        if (this.isComplete() && this.isGenerating) {
            this.placeLocations(); // Place locations based on rules

            // Re-generate map name based on final state (unless user typed one)
            const finalName = MapNamer.generate(this);
            if (!document.getElementById("mapNameInput").value) {
                this.mapName = finalName;
            }
            this.updateMapName();
            this.log(`🌍 Final Name: "${finalName}"`);
            this.log("🎉 Complete with locations!");

            // ===================================================================================
            // ✅ NEW: PARCHMENT OVERLAY HANDLING
            // - Only runs if ParchmentOverlay class is loaded
            // - Uses same seed for deterministic visuals
            // - Hides WFC tiles, keeps locations visible
            // ===================================================================================
            if (typeof ParchmentOverlay !== "undefined") {
                // Instantiate the overlay with grid size, theme, and seed
                this.parchment = new ParchmentOverlay(this.width, this.height, this.themeName, seedValue);

                // Load theme color data
                this.parchment.initFromTheme(ThemeManager.current);

                // Pass the final WFC grid data
                this.parchment.setMapData(this.grid);

                // Create and render the overlay canvas
                const overlayCanvas = this.parchment.createCanvas();
                this.parchment.render();
                console.log("Parchment overlay added:", overlayCanvas.width, "x", overlayCanvas.height);

                // Add to DOM — position over the map grid
                const container = document.getElementById("mapGrid");
                container.style.position = "relative"; // Ensure absolute positioning works
                container.appendChild(overlayCanvas);

                // Hide the original WFC tiles (but leave location tiles visible)
                container.querySelectorAll(".tile").forEach((tile) => {
                    if (!tile.classList.contains("location")) {
                        tile.style.visibility = "hidden";
                    }
                });

                this.renderLocationsOnTop();
            }
            // ===================================================================================
            // ✅ END OF PARCHMENT OVERLAY LOGIC
            // ===================================================================================
        }

        // Final cleanup
        this.isGenerating = false;
        //  this.updateUI();
        this.updateStats();
        this.updateMapName();
    }
    sleep(ms) {
        return new Promise((r) => setTimeout(r, ms));
    }

    updateUI() {
        this.renderGrid();
        this.updateProgress();
        this.updateStats();
        this.updateMapName();
    }

    renderGrid() {
        const container = document.getElementById("mapGrid");
        const w = this.width;
        const h = this.height;
        const tileSize = Math.min(48, 600 / Math.max(w, h)); // Max 600px canvas
        const totalWidth = w * tileSize;
        const totalHeight = h * tileSize;

        // Set container size explicitly
        container.style.cssText = `
    grid-template-columns: repeat(${w}, ${tileSize}px);
    grid-template-rows: repeat(${h}, ${tileSize}px);
    gap: 0;
    width: ${totalWidth}px;
    height: ${totalHeight}px;
    margin: 0 auto;
    position: relative;
  `;

        container.innerHTML = "";

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const cell = this.grid[y][x];
                const tile = document.createElement("div");
                tile.className = "tile";
                tile.dataset.pos = `${x},${y}`;
                if (cell.collapsed) {
                    const theme = ThemeManager.current;
                    const visual = theme.elevation[cell.terrain];
                    tile.style.backgroundColor = visual?.colors[0] || "#374151";
                    if (cell.location) {
                        const locTheme = theme.locations[cell.location.id];
                        tile.classList.add("location");
                        tile.textContent = locTheme?.emoji || cell.location.emoji;
                        tile.title = locTheme?.label || cell.location.name;
                    }
                } else {
                    tile.style.backgroundColor = "#374151";
                }
                tile.style.width = `${tileSize}px`;
                tile.style.height = `${tileSize}px`;
                container.appendChild(tile);
            }
        }
    }







    renderLocationsOnTop() {
  const container = document.getElementById("mapGrid");
  const tileSize = Math.min(48, 600 / Math.max(this.width, this.height));

  // Remove existing location overlays
  container.querySelectorAll(".location-overlay").forEach(el => el.remove());

  this.placedLocations.forEach(({ x, y, loc }) => {
    const theme = ThemeManager.current.locations[loc.id];
    const emoji = theme?.emoji || loc.emoji;

    const locationEl = document.createElement("div");
    locationEl.className = "location-overlay";
    locationEl.textContent = emoji;
    locationEl.title = theme?.label || loc.name;
    locationEl.style.cssText = `
      position: absolute;
      left: ${x * tileSize}px;
      top: ${y * tileSize}px;
      width: ${tileSize}px;
      height: ${tileSize}px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.4em;
      z-index: 3;
      pointer-events: none;
      color: white;
      text-shadow: 1px 1px 2px black;
    `;
    container.appendChild(locationEl);
  });
}









    updateProgress() {
        const total = this.width * this.height;
        const done = this.grid.flat().filter((c) => c.collapsed).length;
        const p = Math.round((done / total) * 100);
        const bar = document.getElementById("progressBar");
        bar.style.width = `${p}%`;
        bar.textContent = `${p}%`;
    }

    updateStats() {
        document.getElementById("stepCount").textContent = this.stepCount;
        document.getElementById("locationCount").textContent = this.locationCount;
        const unCollapsed = this.grid.flat().filter((c) => !c.collapsed);
        const entropy = unCollapsed.reduce((sum, c) => sum + c.possibilities.length, 0);
        const collapsed = this.grid.flat().filter((c) => c.collapsed).length;
        document.getElementById("entropyCount").textContent = entropy;
        document.getElementById("collapsedCount").textContent = collapsed;
    }

    updateMapName() {
        const input = document.getElementById("mapNameInput");
        if (!input) return;

        // Only update placeholder if user hasn't typed anything
        if (!input.value) {
            input.placeholder = this.mapName || "Unnamed World";
        }
    }

    log(msg) {
        const log = document.getElementById("log");
        const time = new Date().toLocaleTimeString();
        log.innerHTML += `<div>[${time}] ${msg}</div>`;
        log.scrollTop = log.scrollHeight;
    }
}
