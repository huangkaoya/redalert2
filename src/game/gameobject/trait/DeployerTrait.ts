import { StanceType } from "../infantry/StanceType";
import { NotifyTick } from "./interface/NotifyTick";
enum DeployFireState {
    None = 0,
    PreparingToFire = 1,
    FiringUp = 2,
    Firing = 3
}
interface GameObject {
    isInfantry(): boolean;
    stance: StanceType;
    ammo: number;
    art: {
        fireUp: number;
    };
    isFiring: boolean;
    onBridge: boolean;
    tile: any;
    primaryWeapon?: Weapon;
    secondaryWeapon?: Weapon;
    armedTrait?: {
        getDeployFireWeapon(): Weapon | undefined;
    };
    rules: {
        undeployDelay?: number;
    };
}
interface Weapon {
    rules: {
        areaFire?: boolean;
        fireOnce?: boolean;
        radLevel?: number;
    };
    fire(target: any, context: any): void;
    getCooldownTicks(): number;
    resetCooldown(): void;
}
interface GameContext {
    map: {
        tileOccupation: {
            getBridgeOnTile(tile: any): any;
        };
    };
    mapRadiationTrait: {
        getRadSiteLevel(tile: any): number;
    };
    rules: {
        radiation: {
            radDurationMultiple: number;
            radLevelDelay: number;
        };
    };
    createTarget(bridge: any, tile: any): any;
}
export class DeployerTrait implements NotifyTick {
    private gameObject: GameObject;
    private deployed: boolean = false;
    private deployFireDelay: number = 0;
    private deployFireState: DeployFireState = DeployFireState.None;
    private fireUpDelay: number = 0;
    private deployFireCount: number = 0;
    private deployWeapon?: Weapon;
    private undeployDelay?: number;
    constructor(gameObject: GameObject) {
        this.gameObject = gameObject;
    }
    isDeployed(): boolean {
        return this.deployed;
    }
    setDeployed(deployed: boolean): void {
        const wasDeployed = this.deployed;
        if ((this.deployed = deployed) !== wasDeployed) {
            const gameObject = this.gameObject;
            if (gameObject.isInfantry()) {
                gameObject.stance = deployed ? StanceType.Deployed : StanceType.None;
            }
            if (deployed) {
                this.deployFireState = DeployFireState.PreparingToFire;
                const deployWeapon = gameObject.armedTrait?.getDeployFireWeapon();
                this.deployWeapon = deployWeapon?.rules.areaFire ? deployWeapon : undefined;
                const otherWeapon = deployWeapon === gameObject.primaryWeapon
                    ? gameObject.secondaryWeapon
                    : gameObject.primaryWeapon;
                this.deployFireDelay = 15 + (otherWeapon?.getCooldownTicks() ?? 0);
                this.deployFireCount = 0;
                this.undeployDelay = gameObject.rules.undeployDelay || undefined;
            }
            else {
                if (this.deployFireState === DeployFireState.FiringUp) {
                    gameObject.isFiring = false;
                }
                this.deployFireState = DeployFireState.None;
                this.deployWeapon = undefined;
            }
        }
    }
    toggleDeployed(): void {
        this.setDeployed(!this.isDeployed());
    }
    [NotifyTick.onTick](gameObject: GameObject, context: GameContext): void {
        if (this.undeployDelay !== undefined) {
            if (this.undeployDelay > 0) {
                this.undeployDelay--;
            }
            if (this.undeployDelay <= 0 &&
                [DeployFireState.None, DeployFireState.PreparingToFire].includes(this.deployFireState)) {
                this.undeployDelay = undefined;
                this.setDeployed(false);
                return;
            }
        }
        if (this.deployWeapon && this.deployFireState !== DeployFireState.None) {
            if (this.deployFireState === DeployFireState.PreparingToFire) {
                if (this.deployFireDelay > 0) {
                    this.deployFireDelay--;
                    return;
                }
                if (gameObject.ammo === 0) {
                    return;
                }
                if (this.computeDeployFireCooldown(this.deployWeapon, context) > 0) {
                    return;
                }
                this.fireUpDelay = Math.max(1, gameObject.art.fireUp);
                this.deployFireState = DeployFireState.FiringUp;
            }
            if (this.deployFireState === DeployFireState.FiringUp) {
                gameObject.isFiring = true;
                if (this.fireUpDelay > 0) {
                    this.fireUpDelay--;
                    return;
                }
                this.deployFireState = DeployFireState.Firing;
            }
            if (this.deployFireState === DeployFireState.Firing) {
                gameObject.isFiring = false;
                const bridge = gameObject.onBridge
                    ? context.map.tileOccupation.getBridgeOnTile(gameObject.tile)
                    : undefined;
                this.deployWeapon.fire(context.createTarget(bridge, gameObject.tile), context);
                this.deployFireCount++;
                const otherWeapon = this.deployWeapon === gameObject.primaryWeapon
                    ? gameObject.secondaryWeapon
                    : gameObject.primaryWeapon;
                otherWeapon?.resetCooldown();
                if (this.deployWeapon.rules.fireOnce) {
                    this.deployFireState = DeployFireState.None;
                    this.deployWeapon = undefined;
                }
                else {
                    this.deployFireState = DeployFireState.PreparingToFire;
                }
            }
        }
    }
    private computeDeployFireCooldown(weapon: Weapon, context: GameContext): number {
        if (weapon.rules.radLevel && weapon.rules.areaFire) {
            const tile = this.gameObject.tile;
            const radLevel = context.mapRadiationTrait.getRadSiteLevel(tile);
            if (!radLevel) {
                return 0;
            }
            const radiation = context.rules.radiation;
            let cooldown = Math.max(0, radLevel * radiation.radDurationMultiple - radiation.radLevelDelay);
            if (this.deployFireCount === 1) {
                const radDuration = radiation.radDurationMultiple * weapon.rules.radLevel!;
                cooldown = Math.max(0, cooldown - Math.floor(0.25 * radDuration));
            }
            return cooldown;
        }
        return weapon.getCooldownTicks();
    }
    getHash(): number {
        return this.deployed ? 1 : 0;
    }
    debugGetState(): {
        deployed: boolean;
    } {
        return { deployed: this.deployed };
    }
    dispose(): void {
        this.gameObject = undefined as any;
    }
}
