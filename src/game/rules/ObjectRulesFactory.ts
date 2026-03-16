import { ObjectType } from '@/engine/type/ObjectType';
import { ObjectRules } from './ObjectRules';
import { TechnoRules } from './TechnoRules';
import { OverlayRules } from './OverlayRules';
import { TerrainRules } from './TerrainRules';
import { SmudgeRules } from './SmudgeRules';
import { DebrisRules } from './DebrisRules';
export class ObjectRulesFactory {
    create(type: ObjectType, ini: any, generalRules: any, index: number = -1) {
        switch (type) {
            case ObjectType.Aircraft:
            case ObjectType.Building:
            case ObjectType.Infantry:
            case ObjectType.Vehicle:
                return new TechnoRules(type, ini, index, generalRules);
            case ObjectType.Overlay:
                return new OverlayRules(type, ini, index, generalRules);
            case ObjectType.Terrain:
                return new TerrainRules(type, ini, index, generalRules);
            case ObjectType.Smudge:
                return new SmudgeRules(type, ini, index, generalRules);
            case ObjectType.VoxelAnim:
                return new DebrisRules(type, ini, index, generalRules);
            default:
                return new ObjectRules(type, ini, index, generalRules);
        }
    }
}
