import * as THREE from "three";
import { jsx } from "@/gui/jsx/jsx";
import { UiObject } from "@/gui/UiObject";
import { UiComponent, UiComponentProps } from "@/gui/jsx/UiComponent";
import { HtmlContainer } from "@/gui/HtmlContainer";
import { SpriteUtils } from "@/engine/gfx/SpriteUtils";
import { CanvasUtils } from "@/engine/gfx/CanvasUtils";
import { GameSpeed } from "@/game/GameSpeed";
import { formatTimeDuration } from "@/util/format";
type Player = {
    defeated: boolean;
    color: {
        asHexString: () => string;
    };
    superWeaponsTrait?: {
        getAll: () => Array<{
            getTimerSeconds: () => number;
            rules: {
                showTimer: boolean;
                uiName: string;
            };
        }>;
    };
    powerTrait?: {
        getBlackoutDuration: () => number;
    };
};
type CountdownTimer = {
    isRunning: () => boolean;
    getSeconds: () => number;
    text?: string;
};
type StalemateDetectTrait = {
    isStale: () => boolean;
    getCountdownTicks: () => number;
};
type SuperWeaponTimersProps = UiComponentProps & {
    x?: number;
    y?: number;
    zIndex?: number;
    width: number;
    height: number;
    players: Player[];
    localPlayer?: Player;
    countdownTimer: CountdownTimer;
    stalemateDetectTrait?: StalemateDetectTrait;
    strings: {
        get: (key: string) => string;
    };
};
type TimerLine = {
    text: string;
    color: string;
    flash: boolean;
};
export class SuperWeaponTimers extends UiComponent<SuperWeaponTimersProps> {
    declare ctx: CanvasRenderingContext2D;
    declare texture: THREE.Texture;
    declare mesh: THREE.Mesh;
    lastUpdate?: number;
    lastHasTimers?: boolean;
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
        SpriteUtils.addRectUvs(geometry, { x: 0, y: 0, width, height }, { width, height });
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
        if (!this.lastUpdate || now - this.lastUpdate >= 100) {
            this.lastUpdate = now;
            const lines: TimerLine[] = [];
            if (this.props.stalemateDetectTrait?.isStale()) {
                let seconds = Math.floor(this.props.stalemateDetectTrait.getCountdownTicks() /
                    GameSpeed.BASE_TICKS_PER_SECOND);
                const text = this.props.strings.get("TS:StalemateTimer") +
                    "   " +
                    formatTimeDuration(seconds, true);
                lines.push({ text, color: "red", flash: true });
            }
            const countdown = this.props.countdownTimer;
            if (countdown.isRunning()) {
                let seconds = countdown.getSeconds();
                const text = (countdown.text !== undefined
                    ? this.props.strings.get(countdown.text) + "   "
                    : "") + formatTimeDuration(seconds, true);
                lines.push({
                    text,
                    color: this.props.localPlayer?.color.asHexString() ?? "white",
                    flash: false,
                });
            }
            for (const player of this.props.players) {
                if (!player.defeated) {
                    const superWeapons = player.superWeaponsTrait?.getAll();
                    const blackoutSeconds = (player.powerTrait?.getBlackoutDuration() ?? 0) /
                        GameSpeed.BASE_TICKS_PER_SECOND;
                    if ((superWeapons && superWeapons.length) || blackoutSeconds) {
                        const color = player.color.asHexString();
                        const timers: {
                            seconds: number;
                            label: string;
                        }[] = [];
                        if (superWeapons) {
                            for (const sw of superWeapons) {
                                if (sw.rules.showTimer) {
                                    timers.push({
                                        seconds: sw.getTimerSeconds(),
                                        label: this.props.strings.get(sw.rules.uiName),
                                    });
                                }
                            }
                        }
                        if (blackoutSeconds) {
                            timers.push({
                                seconds: blackoutSeconds,
                                label: this.props.strings.get("MSG:BlackoutTimer"),
                            });
                        }
                        for (const { seconds, label } of timers) {
                            const sec = Math.floor(seconds);
                            const text = label + "   " + formatTimeDuration(sec, true);
                            lines.push({ text, color, flash: sec === 0 });
                        }
                    }
                }
            }
            const hasTimers = !!lines.length;
            if (hasTimers !== this.lastHasTimers || hasTimers) {
                this.lastHasTimers = hasTimers;
                this.ctx.clearRect(0, 0, this.props.width, this.props.height);
                let y = this.props.height - 20;
                for (const { text, color, flash } of lines) {
                    let drawColor = color;
                    if (flash) {
                        drawColor = Math.floor(now / 1000) % 2 ? color : "orange";
                    }
                    y -= this.drawLine(text, drawColor, y);
                }
                this.texture.needsUpdate = true;
            }
        }
    }
    drawLine(text: string, color: string, y: number): number {
        return CanvasUtils.drawText(this.ctx, text, 0, y, {
            color,
            fontFamily: "'Fira Sans Condensed', Arial, sans-serif",
            fontSize: 12,
            fontWeight: "500",
            paddingTop: 6,
            height: 20,
            backgroundColor: "rgba(0, 0, 0, .75)",
            textAlign: "right",
            paddingLeft: 4,
            paddingRight: 4,
        }).height;
    }
    onDispose() {
        this.mesh.geometry.dispose();
        (this.mesh.material as THREE.Material).dispose();
        this.texture.dispose();
    }
}
