import { Building, BuildStatus } from "@/game/gameobject/Building";
import { BuildingCaptureEvent } from "@/game/event/BuildingCaptureEvent";
import { Warhead } from "@/game/Warhead";
import { CollisionType } from "@/game/gameobject/unit/CollisionType";
import { ZoneType } from "@/game/gameobject/unit/ZoneType";
import { EnterBuildingTask } from "@/game/gameobject/task/EnterBuildingTask";
export class CaptureBuildingTask extends EnterBuildingTask {
    isAllowed(e: any): boolean {
        return (e.rules.engineer &&
            this.target.rules.capturable &&
            !this.target.isDestroyed &&
            this.target.buildStatus !== BuildStatus.BuildDown &&
            !this.game.areFriendly(e, this.target));
    }
    onEnter(t: any): void {
        this.game.unspawnObject(t);
        if (this.game.gameOpts.multiEngineer) {
            const generalRules = this.game.rules.general;
            if ((!this.target.rules.needsEngineer || !generalRules.engineerAlwaysCaptureTech) &&
                this.target.healthTrait.health > 100 * generalRules.engineerCaptureLevel) {
                let damage = Math.floor(generalRules.engineerDamage * this.target.healthTrait.maxHitPoints);
                const minHealth = Math.floor((1 - Math.floor(1 / generalRules.engineerDamage) * generalRules.engineerDamage) *
                    this.target.healthTrait.maxHitPoints);
                damage = Math.min(damage, this.target.healthTrait.getHitPoints() - minHealth);
                if (damage > 0) {
                    const warheadId = this.game.rules.combatDamage.c4Warhead;
                    const warhead = new Warhead(this.game.rules.getWarhead(warheadId));
                    warhead.detonate(this.game, damage, this.target.tile, 0, this.target.position.worldPosition, ZoneType.Ground, CollisionType.None, this.game.createTarget(this.target, this.target.tile), { player: t.owner, obj: t, weapon: undefined } as any, false, undefined, 0);
                    return;
                }
            }
        }
        t.owner.buildingsCaptured++;
        this.game.changeObjectOwner(this.target, t.owner);
        this.game.events.dispatch(new BuildingCaptureEvent(this.target));
    }
}
