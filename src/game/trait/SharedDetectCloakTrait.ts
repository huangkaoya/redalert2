import { NotifyOwnerChange } from "@/game/trait/interface/NotifyOwnerChange";
import { NotifySpawn } from "@/game/trait/interface/NotifySpawn";
import { NotifyTileChange } from "@/game/trait/interface/NotifyTileChange";
import { NotifyUnspawn } from "@/game/trait/interface/NotifyUnspawn";
import { RangeHelper } from "@/game/gameobject/unit/RangeHelper";
import { NotifyPower } from "@/game/trait/interface/NotifyPower";
import { NotifyTick } from "@/game/trait/interface/NotifyTick";
import { RadarTrait } from "@/game/trait/RadarTrait";
import { RadarEventType } from "@/game/rules/general/RadarRules";
import { NotifyObjectTraitAdd } from "@/game/trait/interface/NotifyObjectTraitAdd";
import { CloakableTrait } from "@/game/gameobject/trait/CloakableTrait";
import { SensorsTrait } from "@/game/gameobject/trait/SensorsTrait";
import { Vector2 } from "@/game/math/Vector2";
import { Box2 } from "@/game/math/Box2";
export class SharedDetectCloakTrait {
    private detectors: Set<any> = new Set();
    [NotifySpawn.onSpawn](object: any, game: any) {
        if (this.isGlobalDetector(object)) {
            this.detectors.add(object);
            this.updateAroundDetector(object, game);
        }
        if (this.isCloakable(object)) {
            this.detect(object, game);
        }
    }
    [NotifyUnspawn.onUnspawn](object: any, game: any) {
        if (object.isTechno() && this.isGlobalDetector(object)) {
            this.detectors.delete(object);
        }
    }
    [NotifyOwnerChange.onChange](object: any, oldOwner: any, game: any) {
        if (this.isGlobalDetector(object)) {
            this.updateAroundDetector(object, game);
        }
        if (this.isCloakable(object)) {
            this.detect(object, game);
        }
    }
    [NotifyTileChange.onTileChange](object: any, game: any, oldTile: any) {
        if (this.isGlobalDetector(object)) {
            this.updateAroundDetector(object, game);
        }
        if (this.isCloakable(object)) {
            this.detect(object, game);
        }
    }
    [NotifyObjectTraitAdd.onAdd](object: any, trait: any, game: any) {
        if (object.isTechno()) {
            if (trait instanceof CloakableTrait) {
                if (this.isCloakable(object)) {
                    this.detect(object, game);
                }
            }
            else if (trait instanceof SensorsTrait && this.isGlobalDetector(object)) {
                this.updateAroundDetector(object, game);
            }
        }
    }
    [NotifyPower.onPowerLow](object: any, game: any) { }
    [NotifyPower.onPowerRestore](owner: any, game: any) {
        const poweredDetectors = [...this.detectors].filter((detector) => detector.owner === owner && detector.isBuilding() && detector.poweredTrait);
        this.updateAroundDetectors(poweredDetectors, game);
    }
    [NotifyPower.onPowerChange](object: any, game: any) { }
    [NotifyTick.onTick](game: any) {
        for (const combatant of game.getCombatants()) {
            for (const object of combatant.getOwnedObjects()) {
                if (object.cloakableTrait && !object.cloakableTrait.isCloaked()) {
                    this.detect(object, game);
                }
            }
        }
    }
    private updateAroundDetectors(detectors: any[], game: any) {
        const detectedObjects = new Set();
        for (const detector of detectors) {
            for (const object of this.findTechnosAroundDetector(detector, game)) {
                detectedObjects.add(object);
            }
        }
        for (const object of detectedObjects) {
            if (this.isCloakable(object)) {
                this.detect(object, game);
            }
        }
    }
    private updateAroundDetector(detector: any, game: any) {
        for (const object of this.findTechnosAroundDetector(detector, game)) {
            if (this.isCloakable(object)) {
                this.detect(object, game);
            }
        }
    }
    private findTechnosAroundDetector(detector: any, game: any) {
        const foundation = detector.getFoundation();
        const size = Math.max(foundation.width, foundation.height);
        const range = detector.rules.sensorsSight + size;
        const minPoint = new Vector2(detector.tile.rx, detector.tile.ry).addScalar(-range);
        const maxPoint = new Vector2(detector.tile.rx, detector.tile.ry).addScalar(range);
        return game.map.technosByTile.queryRange(new Box2(minPoint, maxPoint));
    }
    private detect(object: any, game: any) {
        const rangeHelper = new RangeHelper(game.map.tileOccupation);
        for (const detector of this.detectors) {
            if (!game.areFriendly(detector, object)) {
                const sightRange = detector.rules.sensorsSight;
                if (!(detector.isBuilding() && detector.poweredTrait && !detector.poweredTrait.isPoweredOn()) &&
                    rangeHelper.tileDistance(object, detector.tile) <= sightRange) {
                    const wasCloaked = object.cloakableTrait?.isCloaked();
                    object.cloakableTrait.uncloak(game);
                    if (wasCloaked) {
                        for (const player of [detector.owner, ...game.alliances.getAllies(detector.owner)]) {
                            game.traits
                                .get(RadarTrait)
                                .addEventForPlayer(RadarEventType.GenericNonCombat, player, object.tile, game);
                        }
                    }
                    break;
                }
            }
        }
    }
    private isGlobalDetector(object: any): boolean {
        return !(!object.isTechno() ||
            (!object.sensorsTrait && !object.rules.sensorArray) ||
            !object.rules.sensorsSight);
    }
    private isCloakable(object: any): boolean {
        return object.isTechno() && !!object.cloakableTrait;
    }
}
