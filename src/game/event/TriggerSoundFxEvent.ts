import { EventType } from "./EventType";
export class TriggerSoundFxEvent {
    public readonly type: EventType;
    constructor(public readonly soundId: string, public readonly tile: any) {
        this.type = EventType.TriggerSoundFx;
    }
}
