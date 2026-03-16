export class RadarTrait {
    private disabled: boolean;
    private activeEvents: any[];
    constructor() {
        this.disabled = true;
        this.activeEvents = [];
    }
    isDisabled(): boolean {
        return this.disabled;
    }
    setDisabled(value: boolean): void {
        this.disabled = value;
    }
}
