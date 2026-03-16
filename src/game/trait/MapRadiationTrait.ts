import { StanceType } from '../gameobject/infantry/StanceType';
import { RangeHelper } from '../gameobject/unit/RangeHelper';
import { RadialTileFinder } from '../map/tileFinder/RadialTileFinder';
import { Warhead } from '../Warhead';
import { EventDispatcher } from '../../util/event';
import { lerp } from '../../util/math';
import { NotifyTick } from './interface/NotifyTick';
export class MapRadiationTrait {
    private map: any;
    private radSites: Map<any, {
        radLevel: number;
        radius: number;
    }>;
    private radLevelByTile: Map<any, number>;
    private _onChange: EventDispatcher;
    private nextDamage?: number;
    private nextDecay?: number;
    get onChange() {
        return this._onChange.asEvent();
    }
    constructor(map: any) {
        this.map = map;
        this.radSites = new Map();
        this.radLevelByTile = new Map();
        this._onChange = new EventDispatcher();
    }
    getRadLevel(tile: any): number | undefined {
        return this.radLevelByTile.get(tile);
    }
    [NotifyTick.onTick](game: any): void {
        if (!this.radLevelByTile.size)
            return;
        const radiation = game.rules.radiation;
        if (this.nextDamage === undefined) {
            this.nextDamage = Math.max(0, radiation.radApplicationDelay - 1);
        }
        else if (this.nextDamage <= 0) {
            this.applyDamage(game);
            this.nextDamage = Math.max(0, radiation.radApplicationDelay);
        }
        else {
            this.nextDamage--;
        }
        if (this.nextDecay === undefined) {
            this.nextDecay = Math.max(0, radiation.radLevelDelay - 1);
        }
        else if (this.nextDecay <= 0) {
            this.applyDecay(Math.ceil(radiation.radLevelDelay / radiation.radDurationMultiple));
            this.nextDecay = this.radLevelByTile.size ? Math.max(0, radiation.radLevelDelay) : undefined;
        }
        else {
            this.nextDecay--;
        }
    }
    private applyDamage(game: any): void {
        const radiation = game.rules.radiation;
        const warhead = new Warhead(game.rules.getWarhead(radiation.radSiteWarhead));
        this.radLevelByTile.forEach((level, tile) => {
            const damage = Math.min(radiation.radLevelMax, level) * radiation.radLevelFactor;
            for (const unit of game.map.getGroundObjectsOnTile(tile).filter((obj: any) => obj.isUnit() &&
                !(obj.isInfantry() && obj.stance === StanceType.Paradrop && obj.tileElevation > 1))) {
                if (warhead.canDamage(unit, tile, unit.zone)) {
                    const computedDamage = warhead.computeDamage(damage, unit, game);
                    if (computedDamage > 0) {
                        warhead.inflictDamage(computedDamage, unit, undefined, game, true);
                    }
                }
            }
        });
    }
    private applyDecay(decayAmount: number): void {
        const affectedTiles = new Set(this.radLevelByTile.keys());
        this.radLevelByTile.clear();
        this.radSites.forEach(({ radLevel, radius }, position) => {
            const newLevel = radLevel - decayAmount;
            if (newLevel <= 0) {
                this.radSites.delete(position);
            }
            else {
                this.radSites.set(position, { radLevel: newLevel, radius });
                this.setRadLevelAround(position, radius, newLevel);
            }
        });
        this._onChange.dispatch(this, affectedTiles);
    }
    createRadSite(position: any, level: number, radius: number): void {
        const currentLevel = this.radSites.get(position)?.radLevel ?? 0;
        const additionalLevel = level - currentLevel;
        if (additionalLevel <= 0)
            return;
        this.radSites.set(position, {
            radLevel: currentLevel + additionalLevel,
            radius
        });
        const affectedTiles = this.setRadLevelAround(position, radius, additionalLevel);
        if (affectedTiles.size) {
            this._onChange.dispatch(this, affectedTiles);
        }
    }
    private setRadLevelAround(position: any, radius: number, level: number): Set<any> {
        const rangeHelper = new RangeHelper(this.map.tileOccupation);
        const tileFinder = new RadialTileFinder(this.map.tiles, this.map.mapBounds, position, { width: 1, height: 1 }, 0, radius, (tile: any) => !!tile, false);
        const affectedTiles = new Set<any>();
        let tile;
        while ((tile = tileFinder.getNextTile())) {
            const distance = rangeHelper.tileDistance(position, tile);
            if (distance <= radius) {
                const radLevel = Math.ceil(lerp(level, 0, distance / radius));
                this.radLevelByTile.set(tile, Math.min(1000, (this.radLevelByTile.get(tile) ?? 0) + radLevel));
                affectedTiles.add(tile);
            }
        }
        return affectedTiles;
    }
    getRadSiteLevel(position: any): number | undefined {
        return this.radSites.get(position)?.radLevel;
    }
}
