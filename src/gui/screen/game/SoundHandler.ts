import { CompositeDisposable } from '@/util/disposable/CompositeDisposable';
import { EventType } from '@/game/event/EventType';
import { SoundKey } from '@/engine/sound/SoundKey';
import { ChannelType } from '@/engine/sound/ChannelType';
import { Coords } from '@/game/Coords';
import { PowerupType } from '@/game/type/PowerupType';
import { SuperWeaponType } from '@/game/type/SuperWeaponType';
import { RadarEventType } from '@/game/rules/general/RadarRules';

const detectedSuperWeaponEvaByType = new Map([
    [SuperWeaponType.MultiMissile, 'EVA_NuclearSiloDetected'],
    [SuperWeaponType.IronCurtain, 'EVA_IronCurtainDetected'],
    [SuperWeaponType.ChronoSphere, 'EVA_ChronosphereDetected'],
    [SuperWeaponType.LightningStorm, 'EVA_WeatherDeviceReady'],
]);

const superWeaponReadyEvaByType = new Map([
    [SuperWeaponType.MultiMissile, 'EVA_NuclearMissileReady'],
    [SuperWeaponType.IronCurtain, 'EVA_IronCurtainReady'],
    [SuperWeaponType.ChronoSphere, 'EVA_ChronosphereReady'],
    [SuperWeaponType.LightningStorm, 'EVA_LightningStormReady'],
    [SuperWeaponType.ParaDrop, 'EVA_ReinforcementsReady'],
    [SuperWeaponType.AmerParaDrop, 'EVA_ReinforcementsReady'],
]);

const superWeaponActivateEvaByType = new Map([
    [SuperWeaponType.MultiMissile, 'EVA_NuclearMissileLaunched'],
    [SuperWeaponType.IronCurtain, 'EVA_IronCurtainActivated'],
    [SuperWeaponType.ChronoSphere, 'EVA_ChronosphereActivated'],
    [SuperWeaponType.LightningStorm, 'EVA_LightningStormCreated'],
]);

const superWeaponActivateSoundByType = new Map([
    [SuperWeaponType.MultiMissile, SoundKey.DigSound],
]);

const superWeaponActivateMessageByType = new Map([
    [SuperWeaponType.LightningStorm, 'TXT_LIGHTNING_STORM_APPROACHING'],
]);

const crateSoundByType = new Map([
    [PowerupType.Veteran, SoundKey.CratePromoteSound],
    [PowerupType.Money, SoundKey.CrateMoneySound],
    [PowerupType.Reveal, SoundKey.CrateRevealSound],
    [PowerupType.Firepower, SoundKey.CrateFireSound],
    [PowerupType.Armor, SoundKey.CrateArmourSound],
    [PowerupType.Speed, SoundKey.CrateSpeedSound],
    [PowerupType.Unit, SoundKey.CrateUnitSound],
]);

const crateEvaByType = new Map([
    [PowerupType.Armor, 'EVA_UnitArmorUpgraded'],
    [PowerupType.Firepower, 'EVA_UnitFirePowerUpgraded'],
    [PowerupType.Speed, 'EVA_UnitSpeedUpgraded'],
]);

export class SoundHandler {
    private lastAvailableObjectNames: string[] = [];
    private lastQueueStatuses = new Map();
    private triggerSoundHandles = new Map();
    private disposables = new CompositeDisposable();
    private lastFeedbackTime?: number;
    constructor(private game: any, private worldSound: any, private eva: any, private sound: any, private gameEvents: any, private messageList: any, private strings: any, private player: any) { }
    init(): void {
        this.disposables.add(this.gameEvents.subscribe((event: any) => this.handleGameEvent(event)));
    }
    dispose(): void {
        this.disposables.dispose();
    }
    private handleGameEvent(event: any): void {
        switch (event.type) {
            case EventType.Cheer:
                this.sound.play(SoundKey.CheerSound, ChannelType.Effect);
                break;
            case EventType.UnitDeployUndeploy:
                const isUndeploy = event.deployType === 'undeploy';
                const unit = event.unit;
                const deploySound = isUndeploy ? unit.rules.undeploySound : unit.rules.deploySound;
                if (deploySound) {
                    this.worldSound.playEffect(deploySound, unit, unit.owner);
                }
                break;
            case EventType.WeaponFire:
                this.handleWeaponFireSound(event);
                break;
            case EventType.InflictDamage:
                this.handleDamageSound(event);
                break;
            case EventType.RadarEvent:
                this.handleRadarEventSound(event);
                break;
            case EventType.SuperWeaponReady:
                this.handleSuperWeaponReadySound(event);
                break;
            case EventType.SuperWeaponActivate:
                this.handleSuperWeaponActivateSound(event);
                break;
            case EventType.LightningStormManifest:
                this.handleLightningStormManifestSound(event);
                break;
            case EventType.WarheadDetonate:
                this.handleWarheadDetonateSound(event);
                break;
            case EventType.ObjectDestroy:
                this.handleObjectDestroySound(event);
                break;
            case EventType.ObjectSpawn:
                this.handleObjectSpawnSound(event);
                break;
            case EventType.BuildingPlace:
                this.handleBuildingPlaceSound(event);
                break;
            case EventType.PlayerDefeated:
                this.handlePlayerDefeatedSound(event);
                break;
            case EventType.UnitPromote:
                this.handleUnitPromoteSound(event);
                break;
            case EventType.CratePickup:
                this.handleCratePickupSound(event);
                break;
            default:
                break;
        }
    }
    private handleWeaponFireSound(event: any): void {
        const weapon = event.weapon;
        const gameObject = event.gameObject;
        if (weapon.rules.report?.length) {
            const volume = weapon.warhead.rules.electricAssault ? 0.25 : 1;
            const soundIndex = Math.floor(Math.random() * weapon.rules.report.length);
            this.worldSound.playEffect(weapon.rules.report[soundIndex], gameObject.position.worldPosition, gameObject.owner, volume);
        }
    }
    private handleDamageSound(event: any): void {
        if (event.target.isBuilding() && !event.target.wallTrait) {
            const damagePercent = (event.damageHitPoints / event.target.healthTrait.maxHitPoints) * 100;
            const rules = this.game.rules.audioVisual;
            const redThreshold = 100 * rules.conditionRed;
            const yellowThreshold = 100 * rules.conditionYellow;
            const health = event.target.healthTrait.health;
            if ((health <= yellowThreshold && yellowThreshold < health + damagePercent) ||
                (health <= redThreshold && redThreshold < health + damagePercent)) {
                this.worldSound.playEffect(SoundKey.BuildingDamageSound, event.target, event.target.owner);
            }
        }
    }
    private handleRadarEventSound(event: any): void {
        if (event.radarEventType === RadarEventType.BaseUnderAttack || event.radarEventType === 'BaseUnderAttack') {
            if (event.target === this.player) {
                this.eva.play('EVA_OurBaseIsUnderAttack');
                this.sound.play(SoundKey.BaseUnderAttackSound, ChannelType.Effect);
            }
            else if (this.player && this.game.alliances.areAllied(this.player, event.target)) {
                this.eva.play('EVA_OurAllyIsUnderAttack');
                this.sound.play(SoundKey.BaseUnderAttackSound, ChannelType.Effect);
            }
        }
        else if (event.radarEventType === RadarEventType.HarvesterUnderAttack || event.radarEventType === 'HarvesterUnderAttack') {
            if (event.target === this.player) {
                this.eva.play('EVA_OreMinerUnderAttack');
            }
        }
        else if ((event.radarEventType === RadarEventType.EnemyObjectSensed || event.radarEventType === 'EnemyObjectSensed') && event.target === this.player) {
            const building = this.game.map.getGroundObjectsOnTile(event.tile).find((object: any) => object.isBuilding() && object.superWeaponTrait);
            const superWeaponType = building?.superWeaponTrait?.getSuperWeapon(building)?.rules.type;
            const eva = detectedSuperWeaponEvaByType.get(superWeaponType);
            if (eva) {
                this.eva.play(eva);
            }
        }
    }
    private handleSuperWeaponReadySound(event: any): void {
        if (event.target.owner === this.player) {
            const eva = event.target.rules?.type !== undefined
                ? superWeaponReadyEvaByType.get(event.target.rules.type)
                : undefined;
            if (eva) {
                this.eva.play(eva);
            }
        }
    }
    private handleSuperWeaponActivateSound(event: any): void {
        if (!event.noSfxWarning) {
            const eva = superWeaponActivateEvaByType.get(event.target);
            if (eva) {
                this.eva.play(eva, true);
            }
            const sound = superWeaponActivateSoundByType.get(event.target);
            if (sound) {
                this.worldSound.playEffect(sound, Coords.tile3dToWorld(event.atTile.rx, event.atTile.ry, event.atTile.z), event.owner);
            }
        }
        const message = superWeaponActivateMessageByType.get(event.target);
        if (message) {
            this.messageList.addSystemMessage(this.strings.get(message), this.player ?? 'grey');
        }
    }
    private handleLightningStormManifestSound(event: any): void {
        this.messageList.addSystemMessage(this.strings.get('TXT_LIGHTNING_STORM'), this.player ?? 'grey');
        this.worldSound.playEffect(SoundKey.StormSound, Coords.tile3dToWorld(event.target.rx, event.target.ry, event.target.z));
    }
    private handleWarheadDetonateSound(event: any): void {
        if (event.isLightningStrike) {
            this.worldSound.playEffect(SoundKey.LightningSounds, event.position);
        }
    }
    private handleObjectDestroySound(event: any): void {
        const target = event.target;
        let sound: string | undefined;
        if (target.isTechno()) {
            sound = target.rules.dieSound;
            if (!sound && target.isBuilding()) {
                sound = SoundKey.BuildingDieSound;
            }
        }
        if (sound) {
            this.worldSound.playEffect(sound, target.position.worldPosition, target.owner);
        }
        if (target.isUnit() && !target.rules.spawned && target.owner === this.player) {
            this.eva.play('EVA_UnitLost');
        }
    }
    private handleObjectSpawnSound(event: any): void {
        const gameObject = event.gameObject;
        if (gameObject.isTechno() && gameObject.rules.createSound) {
            this.worldSound.playEffect(gameObject.rules.createSound, gameObject, gameObject.owner);
        }
    }
    private handleBuildingPlaceSound(event: any): void {
        const building = event.target;
        this.worldSound.playEffect(SoundKey.BuildingSlam, building, building.owner);
    }
    private handlePlayerDefeatedSound(event: any): void {
        const player = event.target;
        if (player === this.player && !this.player.isObserver) {
            return;
        }
        if (!player.resigned) {
            const playerName = player.isAi
                ? this.strings.get(`AI_${player.aiDifficulty}`)
                : player.name;
            this.eva.play(player !== this.player ? 'EVA_PlayerDefeated' : 'EVA_YouHaveLost');
            this.messageList.addSystemMessage(this.strings.get('TXT_PLAYER_DEFEATED', playerName), player);
        }
    }
    private handleUnitPromoteSound(event: any): void {
        if (event.target.owner === this.player) {
            const isElite = event.target.veteranLevel === 'Elite';
            this.sound.play(isElite ? SoundKey.UpgradeEliteSound : SoundKey.UpgradeVeteranSound, ChannelType.Effect);
            this.eva.play('EVA_UnitPromoted', true);
        }
    }
    private handleCratePickupSound(event: any): void {
        const crateType = event.target?.type;
        let sound = crateSoundByType.get(crateType);
        if (!sound && crateType === PowerupType.HealBase) {
            sound = this.game.rules.crateRules.healCrateSound;
        }
        const eva = crateEvaByType.get(crateType);
        const isHostilePickup = this.player &&
            !this.player.isObserver &&
            event.player !== this.player &&
            !this.game.alliances.areAllied(event.player, this.player);
        if (isHostilePickup) {
            return;
        }
        if (sound) {
            const position = Coords.tile3dToWorld(event.tile.rx, event.tile.ry, event.tile.z);
            this.worldSound.playEffect(sound, position, event.player);
        }
        if (eva) {
            this.eva.play(eva);
        }
    }
    handleOrderPushed(unit: any, orderType: any, feedbackType: any): void {
        const now = Date.now();
        if (!this.lastFeedbackTime || now - this.lastFeedbackTime >= 250) {
            let sound: string | undefined;
            switch (feedbackType) {
                case 'Attack':
                    sound = unit.rules.voiceAttack;
                    break;
                case 'Move':
                    sound = unit.rules.voiceMove;
                    break;
                case 'Capture':
                    sound = unit.rules.voiceCapture || unit.rules.voiceSpecialAttack;
                    break;
            }
            if (sound) {
                this.sound.play(sound, ChannelType.Effect);
                this.lastFeedbackTime = now;
            }
        }
    }
    handleSelectionChangeEvent(event: any): void {
        if (event.selection.length && event.selection[0].owner === this.player) {
            const now = Date.now();
            const canPlayFeedback = !this.lastFeedbackTime || now - this.lastFeedbackTime >= 250;
            if (canPlayFeedback) {
                this.lastFeedbackTime = now;
                event.selection.forEach((unit: any) => {
                    if (unit.rules.voiceSelect) {
                        this.sound.play(unit.rules.voiceSelect, ChannelType.Effect);
                    }
                });
            }
        }
    }
}
