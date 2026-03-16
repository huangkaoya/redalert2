import { Coords } from "@/game/Coords";
import { Vector3 } from "@/game/math/Vector3";
import { InfDeathType } from "@/game/gameobject/infantry/InfDeathType";
import { StanceType } from "@/game/gameobject/infantry/StanceType";
import { Task } from "@/game/gameobject/task/system/Task";
export class ParadropTask extends Task {
    private game: any;
    constructor(game: any) {
        super();
        this.game = game;
    }
    onTick(e: any): boolean {
        const fallRate = Math.abs(this.game.rules.general.parachuteMaxFallRate);
        const bridgeElevation = e.tile.onBridgeLandType
            ? this.game.map.tileOccupation.getBridgeOnTile(e.tile).tileElevation
            : 0;
        const bridgeHeight = Coords.tileHeightToWorld(bridgeElevation);
        const currentElevation = e.tileElevation;
        const currentHeight = Coords.tileHeightToWorld(currentElevation);
        if (bridgeHeight < Math.max(bridgeHeight, currentHeight - fallRate)) {
            e.position.moveByLeptons3(new Vector3(0, -fallRate, 0));
            e.moveTrait.handleElevationChange(currentElevation, this.game);
            return false;
        }
        e.position.tileElevation = bridgeElevation;
        e.stance = StanceType.None;
        if (!this.game.map.terrain.getPassableSpeed(e.tile, e.rules.speedType, e.isInfantry(), e.onBridge)) {
            e.infDeathType = InfDeathType.None;
            this.game.destroyObject(e, undefined, true);
        }
        return true;
    }
}
