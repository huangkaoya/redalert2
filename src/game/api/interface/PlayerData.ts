export interface PlayerData {
    name: string;
    country: any;
    startLocation: any;
    isObserver: boolean;
    isAi: boolean;
    isCombatant: boolean;
    credits: number;
    power: {
        total: number;
        drain: number;
        isLowPower: boolean;
    };
    radarDisabled: boolean;
}
