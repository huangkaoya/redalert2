export enum RadarEventType {
    GenericCombat = 0,
    GenericNonCombat = 1,
    DropZone = 2,
    BaseUnderAttack = 3,
    HarvesterUnderAttack = 4,
    EnemyObjectSensed = 5
}
export class RadarRules {
    private eventSuppressionDistances: number[] = [];
    private eventVisibilityDurations: number[] = [];
    private eventDurations: number[] = [];
    private flashFrameTime: number = 0;
    private combatFlashTime: number = 0;
    private eventMinRadius: number = 0;
    private eventSpeed: number = 0;
    private eventRotationSpeed: number = 0;
    private eventColorSpeed: number = 0;
    readIni(ini: any): RadarRules {
        this.eventSuppressionDistances = ini.getNumberArray("RadarEventSuppressionDistances");
        this.eventVisibilityDurations = ini.getNumberArray("RadarEventVisibilityDurations");
        this.eventDurations = ini.getNumberArray("RadarEventDurations");
        this.flashFrameTime = ini.getNumber("FlashFrameTime");
        this.combatFlashTime = ini.getNumber("RadarCombatFlashTime");
        this.eventMinRadius = ini.getNumber("RadarEventMinRadius");
        this.eventSpeed = ini.getNumber("RadarEventSpeed");
        this.eventRotationSpeed = ini.getNumber("RadarEventRotationSpeed");
        this.eventColorSpeed = ini.getNumber("RadarEventColorSpeed");
        return this;
    }
    getEventSuppresionDistance(eventType: RadarEventType): number {
        if (eventType > this.eventSuppressionDistances.length - 1) {
            throw new RangeError(`No event suppression distance is defined for type ${RadarEventType[eventType]}`);
        }
        return this.eventSuppressionDistances[eventType];
    }
    getEventVisibilityDuration(eventType: RadarEventType): number {
        if (eventType > this.eventVisibilityDurations.length - 1) {
            throw new RangeError(`No event visibility duration is defined for type ${RadarEventType[eventType]}`);
        }
        return this.eventVisibilityDurations[eventType];
    }
    getEventDuration(eventType: RadarEventType): number {
        if (eventType > this.eventDurations.length - 1) {
            throw new RangeError(`No event duration is defined for type ${RadarEventType[eventType]}`);
        }
        return this.eventDurations[eventType];
    }
}
