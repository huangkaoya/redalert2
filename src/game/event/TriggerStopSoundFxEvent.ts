import { EventType } from "./EventType";
export class TriggerStopSoundFxEvent {
    public readonly type: EventType;
    constructor(public readonly tile: any) {
        this.type = EventType.TriggerStopSoundFx;
    }
}
