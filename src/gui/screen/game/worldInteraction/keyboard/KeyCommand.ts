export enum TriggerMode {
    KeyDown = 0,
    KeyUp = 1,
    KeyDownUp = 2
}
export interface KeyCommand {
    triggerMode: TriggerMode;
    execute(isKeyUp: boolean): void;
}
