import { CompositeDisposable } from '@/util/disposable/CompositeDisposable';
import { EventType } from '@/game/event/EventType';
import { SoundKey } from '@/engine/sound/SoundKey';
import { ChannelType } from '@/engine/sound/ChannelType';
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
        if (event.radarEventType === 'BaseUnderAttack') {
            if (event.target === this.player) {
                this.eva.play('EVA_OurBaseIsUnderAttack');
                this.sound.play(SoundKey.BaseUnderAttackSound, ChannelType.Effect);
            }
            else if (this.player && this.game.alliances.areAllied(this.player, event.target)) {
                this.eva.play('EVA_OurAllyIsUnderAttack');
                this.sound.play(SoundKey.BaseUnderAttackSound, ChannelType.Effect);
            }
        }
    }
    private handleSuperWeaponReadySound(event: any): void {
        if (event.target.owner === this.player) {
            this.eva.play('EVA_SuperWeaponReady');
        }
    }
    private handleSuperWeaponActivateSound(event: any): void {
        if (!event.noSfxWarning) {
            this.eva.play('EVA_SuperWeaponActivated', true);
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
        const crateType = event.target.type;
        this.sound.play(SoundKey.CrateMoneySound, ChannelType.Effect);
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
