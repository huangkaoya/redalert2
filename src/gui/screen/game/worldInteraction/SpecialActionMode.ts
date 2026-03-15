import { PointerType } from '@/engine/type/PointerType';
import { EventDispatcher } from '@/util/event';
import { SuperWeaponType } from '@/game/type/SuperWeaponType';

const pointerTypeBySuperWeapon = new Map<SuperWeaponType, PointerType>()
  .set(SuperWeaponType.MultiMissile, PointerType.Nuke)
  .set(SuperWeaponType.LightningStorm, PointerType.Storm)
  .set(SuperWeaponType.IronCurtain, PointerType.Iron)
  .set(SuperWeaponType.ChronoSphere, PointerType.Chrono)
  .set(SuperWeaponType.ChronoWarp, PointerType.Chrono)
  .set(SuperWeaponType.AmerParaDrop, PointerType.Para)
  .set(SuperWeaponType.ParaDrop, PointerType.Para);

export class SpecialActionMode {
  private readonly _onExecute = new EventDispatcher<SpecialActionMode, { tile: any; tile2?: any }>();
  private isPostClick = false;
  private preTile?: any;
  private pointerSwType?: SuperWeaponType;

  get onExecute() {
    return this._onExecute.asEvent();
  }

  get superWeaponType() {
    return this.superWeaponRules.type;
  }

  static factory(
    allSuperWeaponRules: any,
    superWeaponRules: any,
    superWeaponFxHandler: any,
    pointer: any,
    eva: any,
  ): SpecialActionMode {
    return new SpecialActionMode(allSuperWeaponRules, superWeaponRules, superWeaponFxHandler, pointer, eva);
  }

  constructor(
    private readonly allSuperWeaponRules: any,
    private readonly superWeaponRules: any,
    private readonly superWeaponFxHandler: any,
    private readonly pointer: any,
    private readonly eva: any,
  ) {
    this.pointerSwType = this.superWeaponRules.type;
  }

  enter(): void {
    this.eva.play('EVA_SelectTarget');
  }

  hover(hover: any): void {
    const tile = hover?.tile;
    const pointerType = this.pointerSwType !== undefined ? pointerTypeBySuperWeapon.get(this.pointerSwType) : undefined;
    this.pointer.setPointerType(tile && pointerType !== undefined ? pointerType : PointerType.Default);
  }

  execute(hover: any): false | void {
    const tile = hover?.tile;
    if (!tile) {
      return false;
    }

    if (
      this.superWeaponRules.type === SuperWeaponType.ChronoSphere &&
      !this.isPostClick
    ) {
      this.superWeaponFxHandler.createChronoSphereAnim(tile);
    }

    if (this.superWeaponRules.preClick && !this.isPostClick) {
      this.isPostClick = true;
      this.preTile = tile;
      const dependentType = [...this.allSuperWeaponRules.values()].find(
        (rules: any) => rules.postClick && rules.preDependent === this.superWeaponRules.type,
      )?.type;
      if (dependentType === undefined) {
        throw new Error(
          `No super weapon section found with PostClick=yes and PreDependent="${SuperWeaponType[this.superWeaponRules.type]}"`,
        );
      }
      this.pointerSwType = dependentType;
      return false;
    }

    this._onExecute.dispatch(this, this.isPostClick ? { tile: this.preTile, tile2: tile } : { tile });
  }

  cancel(): void {
    this.end();
  }

  private end(): void {
    if (this.superWeaponRules.type === SuperWeaponType.ChronoSphere && this.isPostClick) {
      this.superWeaponFxHandler.disposeChronoSphereAnim();
    }
  }

  dispose(): void {
    this.end();
  }
}
