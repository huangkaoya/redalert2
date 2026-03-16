import { DataStream } from '@/data/DataStream';
import { Action } from '@/game/action/Action';
import { ActionType } from '@/game/action/ActionType';
import { Game } from '@/game/Game';
export enum DebugCommandType {
    SetGlobalDebugText = 0,
    SetUnitDebugText = 1
}
export class DebugCommand {
    constructor(public type: DebugCommandType, public params: {
        unitId?: number;
        label?: string;
        text?: string;
    }) { }
}
export class DebugAction extends Action {
    private game: Game;
    private command: DebugCommand;
    constructor(game: Game) {
        super(ActionType.DebugCommand);
        this.game = game;
    }
    unserialize(data: Uint8Array): void {
        const stream = new DataStream(data);
        const type = stream.readUint8();
        if (type === DebugCommandType.SetUnitDebugText) {
            this.command = new DebugCommand(type, {
                unitId: stream.readUint32(),
                label: stream.readCString() || undefined
            });
        }
        else if (type === DebugCommandType.SetGlobalDebugText) {
            this.command = new DebugCommand(type, {
                text: stream.readCString()
            });
        }
        else {
            console.warn(`Debug command ${type} not implemented`);
        }
    }
    serialize(): Uint8Array {
        const stream = new DataStream();
        stream.writeUint8(this.command.type);
        if (this.command.type === DebugCommandType.SetUnitDebugText) {
            const { unitId, label } = this.command.params;
            stream.writeUint32(unitId);
            stream.writeCString(label || '');
        }
        else if (this.command.type === DebugCommandType.SetGlobalDebugText) {
            const { text } = this.command.params;
            stream.writeCString(text);
        }
        else {
            throw new Error(`Debug command ${this.command.type} not implemented`);
        }
        return stream.toUint8Array();
    }
    process(): void {
        if (this.command.type === DebugCommandType.SetUnitDebugText) {
            const { unitId, label } = this.command.params;
            if (this.game.getWorld().hasObjectId(unitId)) {
                const object = this.game.getObjectById(unitId);
                if (object.isTechno()) {
                    object.debugLabel = label;
                }
            }
        }
        else if (this.command.type === DebugCommandType.SetGlobalDebugText) {
            const { text } = this.command.params;
            this.game.debugText.value = text;
        }
        else {
            console.warn(`Debug command ${this.command.type} not implemented`);
        }
    }
}
