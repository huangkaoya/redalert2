import { BotContext } from "../../game-api";
import { UnitComposition } from "./strategy";

export type SideComposition = {
    composition: UnitComposition;
    minimumUnits: number;
    maximumUnits: number;
};

export type Compositions = Record<string, SideComposition>;

// Returns the compositions that the player can actually build right now.
export function getValidCompositions(context: BotContext, compositions: Compositions) {
    const availableObjects = new Set(context.player.production.getAvailableObjects().map((o) => o.name));
    return Object.keys(compositions).filter((compositionName) => {
        const composition = compositions[compositionName];
        return Object.keys(composition.composition).every((unitName) => availableObjects.has(unitName));
    });
}
