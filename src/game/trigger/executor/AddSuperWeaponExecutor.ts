import { TriggerExecutor } from '@/game/trigger/TriggerExecutor';
export class AddSuperWeaponExecutor extends TriggerExecutor {
    private oneTimeOnly: boolean;
    private superWeaponIdx: number;
    constructor(action: any, trigger: any, oneTimeOnly: boolean) {
        super(action, trigger);
        this.oneTimeOnly = oneTimeOnly;
        this.superWeaponIdx = Number(action.params[1]);
    }
    execute(context: any): void {
        const superWeaponRule = [...context.rules.superWeaponRules.values()].find((rule) => rule.index === this.superWeaponIdx);
        if (superWeaponRule) {
            const player = context
                .getAllPlayers()
                .find((p) => p.country?.name === this.trigger.houseName);
            if (player &&
                player.superWeaponsTrait &&
                !player.superWeaponsTrait.has(superWeaponRule.name)) {
                const superWeapon = context.createSuperWeapon(superWeaponRule.name, player, this.oneTimeOnly);
                superWeapon.isGift = true;
                player.superWeaponsTrait.add(superWeapon);
            }
        }
        else {
            console.warn(`No superweapon found with index "${this.superWeaponIdx}". ` +
                `Skipping action ${this.getDebugName()}.`);
        }
    }
}
