import { Coords } from "@/game/Coords";
import { IsoCoords } from "@/engine/IsoCoords";
import * as THREE from "three";
export class MapSpriteTranslation {
    private rx: number;
    private ry: number;
    constructor(rx: number, ry: number) {
        this.rx = rx;
        this.ry = ry;
    }
    compute(): {
        spriteOffset: THREE.Vector2;
        anchorPointWorld: THREE.Vector3;
    } {
        let worldPos = Coords.tileToWorld(this.rx, this.ry);
        let screenPos = IsoCoords.worldToScreen(worldPos.x, worldPos.y);
        let originScreen = IsoCoords.worldToScreen(0, 0);
        let spriteOffset = new THREE.Vector2(originScreen.x - screenPos.x, originScreen.y - screenPos.y);
        let yRemainder = spriteOffset.y - Math.floor(spriteOffset.y);
        if (yRemainder !== 0) {
            spriteOffset.y -= yRemainder;
            originScreen = new THREE.Vector2(originScreen.x - spriteOffset.x, originScreen.y - spriteOffset.y);
            worldPos = IsoCoords.screenToWorld(originScreen.x, originScreen.y);
        }
        return {
            spriteOffset,
            anchorPointWorld: worldPos
        };
    }
}
