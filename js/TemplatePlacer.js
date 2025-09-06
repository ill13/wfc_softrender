// js/TemplatePlacer.js
class TemplatePlacer {
    static applyTo(wfc, templates) {
        if (!templates || Object.keys(templates).length === 0) return;

        const templateList = Object.entries(templates).map(([id, t]) => ({ id, ...t }));

        const numToApply = Math.floor(Math.random() * 2) + 1;
        for (let i = 0; i < numToApply; i++) {
            if (templateList.length === 0) break;
            const template = this.getRandomTemplate(templateList);
            const applied = this.applyTemplateToGrid(template, wfc.grid, wfc.width, wfc.height);
            if (applied) {
                wfc.log(`🎨 Applied template: ${template.id}`);
            }
        }
    }

    static getRandomTemplate(templates) {
        const totalWeight = templates.reduce((sum, t) => sum + t.weight, 0);
        let r = Math.random() * totalWeight;
        for (const template of templates) {
            r -= template.weight;
            if (r <= 0) return template;
        }
        return templates[0];
    }

    static getPlacementPosition(template, width, height) {
        const tWidth = template.pattern[0]?.length || 0;
        const tHeight = template.pattern.length || 0;
        if (tWidth === 0 || tHeight === 0) return { x: 0, y: 0 };

        let x, y;
        switch (template.placement) {
            case "center":
                x = Math.floor((width - tWidth) / 2);
                y = Math.floor((height - tHeight) / 2);
                break;
            case "top_left":
                x = 0;
                y = 0;
                break;
            default: // "any"
                x = Math.floor(Math.random() * (width - tWidth + 1));
                y = Math.floor(Math.random() * (height - tHeight + 1));
        }
        x = Math.max(0, Math.min(x, width - tWidth));
        y = Math.max(0, Math.min(y, height - tHeight));
        return { x, y };
    }

    static applyTemplateToGrid(template, grid, width, height) {
        const { x: startX, y: startY } = this.getPlacementPosition(template, width, height);
        const pattern = template.pattern;

        for (let dy = 0; dy < pattern.length; dy++) {
            for (let dx = 0; dx < pattern[dy].length; dx++) {
                const x = startX + dx;
                const y = startY + dy;
                const terrainType = pattern[dy][dx];
                if (terrainType === null || terrainType === "") continue;
                const cell = grid[y]?.[x];
                if (!cell) continue;
                cell.possibilities = [terrainType];
                cell.collapsed = false;
            }
        }
        return true;
    }
}