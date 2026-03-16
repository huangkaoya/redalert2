import { ObjectType } from "@/engine/type/ObjectType";
import { TileCollection, TileDirection } from "@/game/map/TileCollection";
import { LandType } from "@/game/type/LandType";
import { TiberiumTrait } from "@/game/gameobject/trait/TiberiumTrait";
export class AnimTerrainEffect {
    destroyOre(animationId: string, tile: any, game: any): void {
        if (tile.landType === LandType.Tiberium &&
            (game.art.hasObject(animationId, ObjectType.Animation)
                ? game.art.getAnimation(animationId)
                : undefined)?.crater) {
            const tiberiumObject = game.map
                .getObjectsOnTile(tile)
                .find((obj: any) => obj.isOverlay() && obj.isTiberium());
            if (tiberiumObject) {
                let bailCount = Math.ceil(TiberiumTrait.maxBails / 2);
                bailCount = animationId.startsWith("S_CLSN")
                    ? bailCount
                    : game.generateRandomInt(1, bailCount);
                const tiberiumTrait = tiberiumObject.traits.get(TiberiumTrait);
                tiberiumTrait.removeBails(bailCount);
                if (!tiberiumTrait.getBailCount()) {
                    game.unspawnObject(tiberiumObject);
                }
            }
        }
    }
    spawnSmudges(animationId: string, tile: any, game: any): void {
        if (tile.landType === LandType.Clear &&
            tile.rampType === 0 &&
            game.map.mapBounds.isWithinBounds(tile) &&
            !game.map.getObjectsOnTile(tile).find((obj: any) => !obj.isUnit())) {
            const animation = game.art.hasObject(animationId, ObjectType.Animation)
                ? game.art.getAnimation(animationId)
                : undefined;
            if (animation?.crater) {
                const craterSize = animation?.forceBigCraters ? 2 : 1;
                const isScorch = animation?.scorch;
                const hasNeighbors = [
                    TileDirection.Bottom,
                    TileDirection.BottomLeft,
                    TileDirection.BottomRight,
                ].every((dir) => game.map.tiles.getNeighbourTile(tile, dir));
                const validSmudges = [...game.rules.smudgeRules.values()].filter((rule) => ((rule.crater && rule.width === craterSize && rule.height === craterSize) ||
                    (isScorch && rule.burn)) &&
                    !((rule.width > 1 || rule.height > 1) && !hasNeighbors));
                if (validSmudges.length) {
                    const selectedSmudge = validSmudges[game.generateRandomInt(0, validSmudges.length - 1)].name;
                    const smudgeObject = game.createObject(ObjectType.Smudge, selectedSmudge);
                    game.spawnObject(smudgeObject, tile);
                }
            }
        }
    }
}
