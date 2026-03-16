import { Action } from './Action';
import { ActionType } from './ActionType';
import { DataStream } from '@/data/DataStream';
import { OrderUnitsAction, ORDER_UNIT_LIMIT } from './OrderUnitsAction';
import { OrderActionContext } from './OrderActionContext';
import { GameObject } from '../gameobject/GameObject';
export class SelectUnitsAction extends Action {
    private _unitIds: number[] = [];
    private orderActionContext: OrderActionContext;
    constructor(game: any, orderActionContext: OrderActionContext) {
        super(ActionType.SelectUnits);
        this.orderActionContext = orderActionContext;
    }
    get unitIds(): number[] {
        return this._unitIds;
    }
    set unitIds(value: number[]) {
        this._unitIds = value.slice(0, ORDER_UNIT_LIMIT);
    }
    unserialize(data: Uint8Array): void {
        const stream = new DataStream(data);
        this.unitIds = new Array(data.byteLength / 4);
        for (let i = 0; i < data.byteLength / 4; i++) {
            this.unitIds[i] = stream.readUint32();
        }
    }
    serialize(): Uint8Array {
        const stream = new DataStream(4 * this.unitIds.length);
        stream.dynamicSize = false;
        for (const id of this.unitIds) {
            stream.writeUint32(id);
        }
        return stream.toUint8Array();
    }
    print(): string {
        return `Select unit(s) [${this.unitIds.join(',')}]`;
    }
    process(): void {
        const player = this.player;
        const units: GameObject[] = [];
        for (const id of this.unitIds) {
            const unit = player.getOwnedObjectById(id);
            if (unit) {
                units.push(unit);
            }
        }
        this.orderActionContext.getOrCreateSelection(player).update(units);
    }
}
