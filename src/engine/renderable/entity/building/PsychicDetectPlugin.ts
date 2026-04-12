import { DetectionLineFx } from "@/engine/renderable/fx/DetectionLineFx";
import * as THREE from "three";
export class PsychicDetectPlugin {
    private gameObject: any;
    private psychicDetectorTrait: any;
    private localPlayer: {
        value: any;
    };
    private camera: THREE.Camera;
    private lineEffects: Map<string, DetectionLineFx>;
    private renderableManager?: any;
    private lastDetectionLines?: any[];
    constructor(gameObject: any, psychicDetectorTrait: any, localPlayer: {
        value: any;
    }, camera: THREE.Camera) {
        this.gameObject = gameObject;
        this.psychicDetectorTrait = psychicDetectorTrait;
        this.localPlayer = localPlayer;
        this.camera = camera;
        this.lineEffects = new Map();
    }
    onCreate(renderableManager: any): void {
        this.renderableManager = renderableManager;
    }
    update(delta: number): void {
        const localPlayer = this.localPlayer?.value ?? this.localPlayer;
        if (localPlayer === this.gameObject.owner) {
            const detectionLines = this.psychicDetectorTrait.detectionLines;
            const hasChanged = detectionLines !== this.lastDetectionLines;
            this.lastDetectionLines = detectionLines;
            const lines = detectionLines.map((line: any) => ({
                hash: line.source.id + "_" + (line.target.obj?.id ?? line.target.tile.id),
                line: line,
            }));
            if (hasChanged) {
                for (const hash of this.lineEffects.keys()) {
                    if (!lines.find(({ hash: h }) => h === hash)) {
                        this.disposeLine(this.lineEffects.get(hash)!);
                        this.lineEffects.delete(hash);
                    }
                }
                for (const { line, hash } of lines) {
                    if (!this.lineEffects.has(hash)) {
                        const sourcePos = line.source.position.worldPosition.clone();
                        const targetPos = line.target.getWorldCoords().clone();
                        const color = new THREE.Color(line.source.owner.color.asHex());
                        const effect = new DetectionLineFx(this.camera as any, sourcePos, targetPos, color, 1e6);
                        this.lineEffects.set(hash, effect);
                        this.renderableManager.addEffect(effect);
                    }
                }
            }
            for (const { line, hash } of lines) {
                const effect = this.lineEffects.get(hash);
                if (!effect)
                    throw new Error("Line hash should have been found");
                const sourcePos = line.source.position.worldPosition.clone();
                const targetPos = line.target.getWorldCoords().clone();
                const color = new THREE.Color(line.source.owner.color.asHex());
                if (!effect.color.equals(color)) {
                    effect.color.copy(color);
                    effect.needsUpdate = true;
                }
                if (!effect.sourcePos.equals(sourcePos)) {
                    effect.sourcePos.copy(sourcePos);
                    effect.needsUpdate = true;
                }
                if (!effect.targetPos.equals(targetPos)) {
                    effect.targetPos.copy(targetPos);
                    effect.needsUpdate = true;
                }
            }
        }
        else {
            this.lineEffects.forEach((effect) => this.disposeLine(effect));
        }
    }
    onRemove(): void {
        this.renderableManager = undefined;
        this.dispose();
    }
    dispose(): void {
        this.lineEffects.forEach((effect) => this.disposeLine(effect));
    }
    private disposeLine(effect: DetectionLineFx): void {
        effect.remove();
        effect.dispose();
    }
}
