import { MindControlLinkFx } from "@/engine/renderable/fx/MindControlLinkFx";
import * as THREE from "three";
export class MindControlLinkPlugin {
    private source: any;
    private selectionModel: any;
    private alliances: any;
    private viewer: any;
    private links: Map<any, MindControlLinkFx>;
    private renderableManager?: any;
    constructor(source: any, selectionModel: any, alliances: any, viewer: any) {
        this.source = source;
        this.selectionModel = selectionModel;
        this.alliances = alliances;
        this.viewer = viewer;
        this.links = new Map();
    }
    onCreate(renderableManager: any): void {
        this.renderableManager = renderableManager;
    }
    update(): void {
        if (!this.source.isDestroyed &&
            !this.source.isCrashing &&
            this.source.mindControllerTrait) {
            if (!this.selectionModel.isSelected() ||
                (this.viewer.value &&
                    !this.alliances.haveSharedIntel(this.source.owner, this.viewer.value))) {
                this.disposeLinks();
            }
            else {
                const targets = this.source.mindControllerTrait.getTargets();
                for (const [target, link] of this.links.entries()) {
                    if (!targets.includes(target)) {
                        link.removeAndDispose();
                        this.links.delete(target);
                    }
                }
                const color = new THREE.Color(this.source.owner.color.asHex());
                const sourcePos = this.source.position.worldPosition.clone();
                for (const target of targets) {
                    const targetPos = target.position.worldPosition.clone();
                    let link = this.links.get(target);
                    if (!link) {
                        link = new MindControlLinkFx(sourcePos, targetPos, color, 2);
                        this.links.set(target, link);
                        this.renderableManager?.addEffect(link);
                    }
                    link.updateEndpoints(sourcePos, targetPos);
                }
            }
        }
    }
    onRemove(): void {
        this.renderableManager = undefined;
        this.disposeLinks();
    }
    dispose(): void {
        this.disposeLinks();
    }
    private disposeLinks(): void {
        this.links.forEach((link) => link.removeAndDispose());
        this.links.clear();
    }
}
