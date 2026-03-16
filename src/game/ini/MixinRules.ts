import { MixinRulesType } from './MixinRulesType';
export class MixinRules {
    static getTypes(config: {
        noDogEngiKills?: boolean;
    }): MixinRulesType[] {
        const types: MixinRulesType[] = [];
        if (config.noDogEngiKills) {
            types.push(MixinRulesType.NoDogEngiKills);
        }
        return types;
    }
}
