import { Coords } from "@/game/Coords";
import { ObjectType } from "@/engine/type/ObjectType";
import { Vector2 } from "@/game/math/Vector2";
import { Weapon } from "@/game/Weapon";
import { WeaponType } from "@/game/WeaponType";
import { SuperWeaponEffect, TileCoord } from "@/game/superweapon/SuperWeaponEffect";
import { Game } from "@/game/Game";
import { Target } from "@/game/Target";
import { Player } from "../Player";

export class NukeEffect extends SuperWeaponEffect {
  private weaponType: string;

  constructor(type: any, owner: Player, tile: TileCoord, weaponType: string) {
    super(type, owner, tile);
    this.weaponType = weaponType;
  }

  onStart(game: Game): void {
    const weapon = game.rules.getWeapon(this.weaponType);
    const target = game.createTarget(undefined, this.tile);
    const silo = this.owner
      .getOwnedObjectsByType(ObjectType.Building)
      .find(building => building.rules.nukeSilo);

    if (silo) {
      const weaponInstance = Weapon.factory(
        weapon.name,
        WeaponType.Primary,
        silo,
        game.rules
      );
      weaponInstance.fire(target, game);
    } else {
      this.fireLooseNuke(weapon, target, game);
    }
  }

  private fireLooseNuke(weapon: Weapon, target: Target, game: Game): void {
    const position = new Vector2(
      this.tile.rx + 0.5,
      this.tile.ry + 0.5
    ).multiplyScalar(Coords.LEPTONS_PER_TILE);

    if (game.map.isWithinHardBounds(position)) {
      const projectile = game.createLooseProjectile(weapon.name, this.owner, target);
      projectile.position.moveToLeptons(position);
      projectile.position.tileElevation = Coords.worldToTileHeight(
        projectile.rules.detonationAltitude
      );
      game.spawnObject(projectile, projectile.position.tile);
    }
  }

  onTick(game: Game): boolean {
    return true;
  }
}
