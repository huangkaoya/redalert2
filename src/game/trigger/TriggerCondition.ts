export class TriggerCondition {
    [key: string]: any;
    public event: any;
    public trigger: any;
    public blocking: boolean;
    public targets: any[];
    public player?: any;
    constructor(event: any, trigger: any) {
        this.event = event;
        this.trigger = trigger;
        this.blocking = false;
        this.targets = [];
    }
    init(game: any): void {
        const player = game
            .getAllPlayers()
            .find((p: any) => p.country?.name === this.trigger.houseName);
        if (player) {
            this.player = player;
        }
    }
    setTargets(targets: any[]): void {
        this.targets = targets;
    }
    reset(): void { }
    getDebugName(): string {
        return `${this.event.triggerId}[${this.event.eventIndex}] (${this.trigger.name}).`;
    }
}
