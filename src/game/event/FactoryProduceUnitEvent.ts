import { EventType } from "./EventType";
export class FactoryProduceUnitEvent {
    public readonly type: EventType;
    constructor(public readonly target: any) {
        this.type = EventType.FactoryProduceUnit;
    }
}
