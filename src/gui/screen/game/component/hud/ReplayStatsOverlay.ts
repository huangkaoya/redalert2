import * as THREE from "three";
import { jsx } from "@/gui/jsx/jsx";
import { UiObject } from "@/gui/UiObject";
import { UiComponent, UiComponentProps } from "@/gui/jsx/UiComponent";
import { HtmlContainer } from "@/gui/HtmlContainer";
import { SpriteUtils } from "@/engine/gfx/SpriteUtils";
import { QueueType, QueueStatus } from "@/game/player/production/ProductionQueue";
import { ObjectType } from "@/engine/type/ObjectType";
import { formatTimeDuration } from "@/util/format";

type Player = {
    name: string;
    credits: number;
    defeated: boolean;
    resigned: boolean;
    color: {
        asHexString: () => string;
    };
    powerTrait?: {
        power: number;
        drain: number;
    };
    superWeaponsTrait?: {
        getAll: () => Array<{
            name: string;
            status: number; // SuperWeaponStatus
            getTimerSeconds: () => number;
            getChargeProgress: () => number;
            rules: {
                showTimer: boolean;
                uiName: string;
                rechargeTime: number;
            };
        }>;
    };
    production?: {
        getAllQueues: () => Array<{
            type: QueueType;
            status: QueueStatus;
            getFirst: () =>
                | {
                      rules: { name: string; uiName?: string };
                      quantity: number;
                      progress: number;
                  }
                | undefined;
            getAll: () => Array<{
                rules: { name: string; uiName?: string };
                quantity: number;
                progress: number;
            }>;
        }>;
    };
    getOwnedObjectsByType: (type: ObjectType, includeLimbo?: boolean) => any[];
    getOwnedObjects: (includeLimbo?: boolean) => any[];
};

interface ReplayStatsOverlayProps extends UiComponentProps {
    x?: number;
    y?: number;
    zIndex?: number;
    width: number;
    height: number;
    players: Player[];
    strings: {
        get: (key: string) => string;
    };
}

const FONT = "'Fira Sans Condensed', Arial, sans-serif";
const LINE_HEIGHT = 16;
const SECTION_GAP = 4;
const COL_WIDTH = 220;
const PADDING = 6;

const QUEUE_TYPE_LABELS: Record<number, string> = {
    [QueueType.Structures]: "建筑",
    [QueueType.Armory]: "防御",
    [QueueType.Infantry]: "步兵",
    [QueueType.Vehicles]: "载具",
    [QueueType.Aircrafts]: "空军",
    [QueueType.Ships]: "海军",
};

export class ReplayStatsOverlay extends UiComponent<ReplayStatsOverlayProps> {
    declare ctx: CanvasRenderingContext2D;
    declare texture: THREE.Texture;
    declare mesh: THREE.Mesh;
    lastUpdate?: number;

    createUiObject() {
        const obj = new UiObject(new THREE.Object3D(), new HtmlContainer());
        obj.setPosition(this.props.x || 0, this.props.y || 0);
        const { width, height } = this.props;
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        this.ctx = canvas.getContext("2d", { alpha: true })!;
        this.texture = this.createTexture(canvas);
        this.mesh = this.createMesh(width, height);
        return obj;
    }

    createTexture(canvas: HTMLCanvasElement) {
        const texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;
        texture.flipY = false;
        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.NearestFilter;
        return texture;
    }

    createMesh(width: number, height: number) {
        const geometry = SpriteUtils.createRectGeometry(width, height);
        SpriteUtils.addRectUvs(
            geometry,
            { x: 0, y: 0, width, height },
            { width, height },
        );
        geometry.translate(width / 2, height / 2, 0);
        const material = new THREE.MeshBasicMaterial({
            map: this.texture,
            side: THREE.DoubleSide,
            transparent: true,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.frustumCulled = false;
        return mesh;
    }

    defineChildren() {
        return jsx("mesh", { zIndex: this.props.zIndex }, this.mesh);
    }

    onFrame(now: number) {
        // Update at ~5 fps to avoid perf impact
        if (!this.lastUpdate || now - this.lastUpdate >= 200) {
            this.lastUpdate = now;
            this.render();
        }
    }

    private render() {
        const ctx = this.ctx;
        const { width, height, players } = this.props;
        ctx.clearRect(0, 0, width, height);

        const activePlayers = players.filter(
            (p) => !p.defeated && !p.resigned,
        );
        if (activePlayers.length === 0) return;

        // Layout: place player panels in columns
        const numCols = Math.min(activePlayers.length, 4);
        const colW = Math.min(COL_WIDTH, Math.floor((width - PADDING * 2) / numCols));

        for (let i = 0; i < activePlayers.length; i++) {
            const player = activePlayers[i];
            const col = i % numCols;
            const row = Math.floor(i / numCols);
            const x = PADDING + col * (colW + SECTION_GAP);
            const baseY = PADDING + row * 200; // rough estimate per player block
            this.renderPlayer(ctx, player, x, baseY, colW);
        }

        this.texture.needsUpdate = true;
    }

    private renderPlayer(
        ctx: CanvasRenderingContext2D,
        player: Player,
        x: number,
        startY: number,
        colWidth: number,
    ) {
        let y = startY;

        // ── Player name header with colored underline ──
        const color = player.color.asHexString();
        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.fillRect(x, y, colWidth, LINE_HEIGHT + 2);
        ctx.fillStyle = color;
        ctx.font = `bold 12px ${FONT}`;
        ctx.textBaseline = "top";
        ctx.fillText(player.name, x + 4, y + 2);
        // Thin colored underline
        ctx.fillStyle = color;
        ctx.fillRect(x, y + LINE_HEIGHT, colWidth, 2);
        y += LINE_HEIGHT + 2 + SECTION_GAP;

        // ── Credits & Power ──
        const credits = Math.floor(player.credits);
        const powerTotal = player.powerTrait?.power ?? 0;
        const powerDrain = player.powerTrait?.drain ?? 0;
        const powerColor =
            powerDrain > powerTotal ? "#ff4444" : "#88ff88";

        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillRect(x, y, colWidth, LINE_HEIGHT);
        ctx.font = `11px ${FONT}`;
        ctx.fillStyle = "#ffd700";
        ctx.fillText(`$${credits}`, x + 4, y + 2);
        ctx.fillStyle = powerColor;
        const powerText = `⚡${powerTotal}/${powerDrain}`;
        ctx.fillText(powerText, x + colWidth / 2, y + 2);
        y += LINE_HEIGHT + 1;

        // ── Unit Counts ──
        const buildings = player.getOwnedObjectsByType(
            ObjectType.Building,
        ).length;
        const infantry = player.getOwnedObjectsByType(
            ObjectType.Infantry,
        ).length;
        const vehicles = player.getOwnedObjectsByType(
            ObjectType.Vehicle,
        ).length;
        const aircraft = player.getOwnedObjectsByType(
            ObjectType.Aircraft,
        ).length;
        const totalUnits = buildings + infantry + vehicles + aircraft;

        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillRect(x, y, colWidth, LINE_HEIGHT);
        ctx.font = `11px ${FONT}`;
        ctx.fillStyle = "#cccccc";
        const countsText = `🏠${buildings} 🚶${infantry} 🚛${vehicles}`;
        ctx.fillText(countsText, x + 4, y + 2);
        if (aircraft > 0) {
            ctx.fillText(`✈${aircraft}`, x + colWidth - 40, y + 2);
        }
        // Total on right side
        ctx.fillStyle = "#aaaaaa";
        ctx.textAlign = "right";
        ctx.fillText(`Σ${totalUnits}`, x + colWidth - 4, y + 2);
        ctx.textAlign = "left";
        y += LINE_HEIGHT + 1;

        // ── Production Queues ──
        if (player.production) {
            const queues = player.production.getAllQueues();
            for (const queue of queues) {
                const first = queue.getFirst();
                if (
                    queue.status === QueueStatus.Idle ||
                    !first
                )
                    continue;

                const label =
                    QUEUE_TYPE_LABELS[queue.type] || "?";
                const itemName = this.resolveUiName(first.rules);
                const progress = Math.floor(first.progress * 100);
                const statusStr =
                    queue.status === QueueStatus.OnHold
                        ? " ⏸"
                        : queue.status === QueueStatus.Ready
                          ? " ✓"
                          : "";

                ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
                ctx.fillRect(x, y, colWidth, LINE_HEIGHT);

                // Label
                ctx.fillStyle = "#999999";
                ctx.font = `10px ${FONT}`;
                ctx.fillText(label, x + 4, y + 3);

                // Item name + progress
                ctx.fillStyle = "#dddddd";
                ctx.font = `11px ${FONT}`;
                ctx.fillText(`${itemName}`, x + 36, y + 2);

                // Progress bar
                if (
                    queue.status === QueueStatus.Active &&
                    first.progress > 0
                ) {
                    const barX = x + colWidth - 54;
                    const barW = 40;
                    const barH = 8;
                    const barY = y + 4;
                    ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
                    ctx.fillRect(barX, barY, barW, barH);
                    ctx.fillStyle = color;
                    ctx.globalAlpha = 0.7;
                    ctx.fillRect(
                        barX,
                        barY,
                        barW * first.progress,
                        barH,
                    );
                    ctx.globalAlpha = 1;
                    ctx.fillStyle = "#ffffff";
                    ctx.font = `9px ${FONT}`;
                    ctx.textAlign = "center";
                    ctx.fillText(
                        `${progress}%`,
                        barX + barW / 2,
                        barY,
                    );
                    ctx.textAlign = "left";
                } else {
                    ctx.fillStyle = "#aaaaaa";
                    ctx.textAlign = "right";
                    ctx.font = `10px ${FONT}`;
                    ctx.fillText(statusStr, x + colWidth - 4, y + 3);
                    ctx.textAlign = "left";
                }

                // Multiple items indicator
                const allItems = queue.getAll();
                if (allItems.length > 1 || first.quantity > 1) {
                    const totalQ = allItems.reduce(
                        (sum, item) => sum + item.quantity,
                        0,
                    );
                    if (totalQ > 1) {
                        ctx.fillStyle = "#aaaaaa";
                        ctx.font = `9px ${FONT}`;
                        ctx.fillText(
                            `×${totalQ}`,
                            x + 80,
                            y + 3,
                        );
                    }
                }

                y += LINE_HEIGHT;
            }
        }

        // ── Superweapon Countdowns ──
        if (player.superWeaponsTrait) {
            const superWeapons = player.superWeaponsTrait.getAll();
            for (const sw of superWeapons) {
                if (!sw.rules.showTimer) continue;
                const seconds = Math.floor(sw.getTimerSeconds());
                const label = this.props.strings.get(sw.rules.uiName);
                const isReady = seconds <= 0;
                const progress = sw.getChargeProgress();

                ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
                ctx.fillRect(x, y, colWidth, LINE_HEIGHT);

                ctx.font = `11px ${FONT}`;

                if (isReady) {
                    // Ready - flash
                    const flash =
                        Math.floor(Date.now() / 500) % 2 === 0;
                    ctx.fillStyle = flash ? "#ff4444" : "#ffaa00";
                    ctx.fillText(`☢ ${label} READY`, x + 4, y + 2);
                } else {
                    ctx.fillStyle = "#ff8800";
                    ctx.fillText(`☢ ${label}`, x + 4, y + 2);

                    // Timer
                    ctx.fillStyle = "#ffcc66";
                    ctx.textAlign = "right";
                    ctx.fillText(
                        formatTimeDuration(seconds, false),
                        x + colWidth - 48,
                        y + 2,
                    );
                    ctx.textAlign = "left";

                    // Small progress bar
                    const barX = x + colWidth - 44;
                    const barW = 40;
                    const barH = 6;
                    const barY = y + 5;
                    ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
                    ctx.fillRect(barX, barY, barW, barH);
                    ctx.fillStyle = "#ff6600";
                    ctx.globalAlpha = 0.8;
                    ctx.fillRect(
                        barX,
                        barY,
                        barW * progress,
                        barH,
                    );
                    ctx.globalAlpha = 1;
                }

                y += LINE_HEIGHT;
            }
        }
    }

    /**
     * Resolve a rules object's uiName to a localized display string.
     * Falls back to the internal code name if no localized string is found.
     */
    private resolveUiName(rules: { name: string; uiName?: string }): string {
        const uiName = (rules as any).uiName;
        if (uiName && uiName !== "") {
            const resolved = this.props.strings.get(uiName);
            if (resolved && resolved !== uiName) {
                return resolved;
            }
        }
        return rules.name;
    }

    onDispose() {
        this.mesh.geometry.dispose();
        (this.mesh.material as THREE.Material).dispose();
        this.texture.dispose();
    }
}
