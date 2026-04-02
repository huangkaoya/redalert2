import { NotifyOwnerChange } from "@/game/trait/interface/NotifyOwnerChange";
import { NotifySpawn } from "@/game/trait/interface/NotifySpawn";
import { NotifyTileChange } from "@/game/trait/interface/NotifyTileChange";
import { NotifyUnspawn } from "@/game/trait/interface/NotifyUnspawn";
import { RangeHelper } from "@/game/gameobject/unit/RangeHelper";
import { NotifyPower } from "@/game/trait/interface/NotifyPower";
import { Vector2 } from "@/game/math/Vector2";
import { Box2 } from "@/game/math/Box2";
export class SharedDetectDisguiseTrait {
    private detectors: Set<any>;
    constructor() {
        this.detectors = new Set();
    }
    [NotifySpawn.onSpawn](entity: any, game: any) {
        if (this.isGlobalDetector(entity)) {
            this.detectors.add(entity);
            this.updateAroundDetector(entity, game);
        }
        if (this.isDisguisable(entity)) {
            this.detect(entity, game);
        }
    }
    [NotifyUnspawn.onUnspawn](entity: any, game: any) {
        if (entity.isTechno()) {
            if (this.isGlobalDetector(entity)) {
                this.detectors.delete(entity);
                this.updateAroundDetector(entity, game);
            }
            if (this.isDisguisable(entity)) {
                this.undetect(entity, game);
            }
        }
    }
    [NotifyOwnerChange.onChange](entity: any, oldOwner: any, game: any) {
        if (this.isGlobalDetector(entity)) {
            this.updateAroundDetector(entity, game);
        }
        if (this.isDisguisable(entity)) {
            this.undetect(entity, game);
            this.detect(entity, game);
        }
    }
    [NotifyTileChange.onTileChange](entity: any, game: any, oldTile: any) {
        if (this.isGlobalDetector(entity)) {
            this.updateAroundDetector(entity, game, oldTile);
            this.updateAroundDetector(entity, game);
        }
        if (this.isDisguisable(entity)) {
            this.undetect(entity, game);
            this.detect(entity, game);
        }
    }
    [NotifyPower.onPowerLow](owner: any, game: any) {
        const affectedDetectors = [...this.detectors].filter((detector) => detector.owner === owner &&
            detector.isBuilding() &&
            detector.poweredTrait &&
            !detector.poweredTrait.isPoweredOn());
        this.updateAroundDetectors(affectedDetectors, game);
    }
    [NotifyPower.onPowerRestore](owner: any, game: any) {
        const affectedDetectors = [...this.detectors].filter((detector) => detector.owner === owner &&
            detector.isBuilding() &&
            detector.poweredTrait);
        this.updateAroundDetectors(affectedDetectors, game);
    }
    [NotifyPower.onPowerChange](entity: any, game: any) { }
    private updateAroundDetectors(detectors: any[], game: any) {
        const affectedTechnos = new Set();
        for (const detector of detectors) {
            for (const techno of this.findTechnosAroundDetector(detector, game, detector.tile)) {
                affectedTechnos.add(techno);
            }
        }
        for (const techno of affectedTechnos) {
            if (this.isDisguisable(techno)) {
                this.undetect(techno, game);
                this.detect(techno, game);
            }
        }
    }
    private updateAroundDetector(detector: any, game: any, tile: any = detector.tile) {
        for (const techno of this.findTechnosAroundDetector(detector, game, tile)) {
            if (this.isDisguisable(techno)) {
                this.undetect(techno, game);
                this.detect(techno, game);
            }
        }
    }
    private findTechnosAroundDetector(detector: any, game: any, tile: any) {
        const foundation = detector.getFoundation();
        const size = Math.max(foundation.width, foundation.height);
        const range = detector.rules.detectDisguiseRange + size;
        const minPoint = new Vector2(tile.rx, tile.ry).addScalar(-range);
        const maxPoint = new Vector2(tile.rx, tile.ry).addScalar(range);
        return game.map.technosByTile.queryRange(new Box2(minPoint, maxPoint));
    }
    private detect(entity: any, game: any) {
        const detectedOwners = new Set();
        const rangeHelper = new RangeHelper(game.map.tileOccupation);
        for (const detector of this.detectors) {
            if (!game.areFriendly(detector, entity)) {
                const owner = detector.owner;
                const range = detector.rules.detectDisguiseRange;
                if (!detectedOwners.has(owner)) {
                    if (!(detector.isBuilding() &&
                        detector.poweredTrait &&
                        !detector.poweredTrait.isPoweredOn()) &&
                        rangeHelper.tileDistance(entity, detector.tile) <= range) {
                        for (const allianceOwner of [owner, ...game.alliances.getAllies(owner)]) {
                            detectedOwners.add(allianceOwner);
                        }
                    }
                }
            }
        }
        for (const owner of detectedOwners) {
            (owner as any).sharedDetectDisguiseTrait?.add(entity);
        }
    }
    private undetect(entity: any, game: any) {
        for (const combatant of game.getCombatants()) {
            combatant.sharedDetectDisguiseTrait?.delete(entity);
        }
    }
    private isGlobalDetector(entity: any): boolean {
        return entity.isTechno() && entity.rules.detectDisguiseRange;
    }
    private isDisguisable(entity: any): boolean {
        return (entity.isInfantry() || entity.isVehicle()) && entity.disguiseTrait;
    }
}
