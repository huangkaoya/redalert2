import { isBetween } from '@/util/math';
export enum OverlayBridgeType {
    NotBridge = 0,
    Concrete = 1,
    Wood = 2
}
export class BridgeOverlayTypes {
    static minLowBridgeWoodId = 74;
    static maxLowBridgeWoodId = 99;
    static minLowBridgeConcreteId = 205;
    static maxLowBridgeConcreteId = 230;
    static minHighBridgeConcreteId = 24;
    static maxHighBridgeConcreteId = 25;
    static minHighBridgeWoodId = 237;
    static maxHighBridgeWoodId = 238;
    static bridgePlaceholderIds = [100, 101, 231, 232];
    static getOverlayBridgeType(id: number): OverlayBridgeType {
        return isBetween(id, this.minHighBridgeConcreteId, this.maxHighBridgeConcreteId) ||
            isBetween(id, this.minLowBridgeConcreteId, this.maxLowBridgeConcreteId)
            ? OverlayBridgeType.Concrete
            : isBetween(id, this.minHighBridgeWoodId, this.maxHighBridgeWoodId) ||
                isBetween(id, this.minLowBridgeWoodId, this.maxLowBridgeWoodId)
                ? OverlayBridgeType.Wood
                : OverlayBridgeType.NotBridge;
    }
    static isBridge(id: number): boolean {
        return this.isHighBridge(id) || this.isLowBridge(id);
    }
    static isBridgePlaceholder(id: number): boolean {
        return this.bridgePlaceholderIds.includes(id);
    }
    static isHighBridge(id: number): boolean {
        return (isBetween(id, this.minHighBridgeWoodId, this.maxHighBridgeWoodId) ||
            isBetween(id, this.minHighBridgeConcreteId, this.maxHighBridgeConcreteId));
    }
    static isLowBridge(id: number): boolean {
        return (isBetween(id, this.minLowBridgeWoodId, this.maxLowBridgeWoodId) ||
            isBetween(id, this.minLowBridgeConcreteId, this.maxLowBridgeConcreteId));
    }
    static isXBridge(id: number): boolean {
        return (id === this.minHighBridgeWoodId ||
            id === this.minHighBridgeConcreteId ||
            isBetween(id, this.minLowBridgeWoodId, this.minLowBridgeWoodId + 8) ||
            isBetween(id, this.minLowBridgeWoodId + 18, this.minLowBridgeWoodId + 21) ||
            isBetween(id, this.minLowBridgeConcreteId, this.minLowBridgeConcreteId + 8) ||
            isBetween(id, this.minLowBridgeConcreteId + 18, this.minLowBridgeConcreteId + 21));
    }
    static isLowBridgeHead(id: number): boolean {
        return (isBetween(id, this.minLowBridgeWoodId + 18, this.minLowBridgeWoodId + 25) ||
            isBetween(id, this.minLowBridgeConcreteId + 18, this.minLowBridgeConcreteId + 25));
    }
    static isLowBridgeHeadStart(id: number): boolean {
        return (isBetween(id, this.minLowBridgeWoodId + 20, this.minLowBridgeWoodId + 23) ||
            isBetween(id, this.minLowBridgeConcreteId + 20, this.minLowBridgeConcreteId + 23));
    }
    static calculateLowBridgeOverlayId(type: OverlayBridgeType, isStart: boolean): number {
        let baseId: number;
        if (type === OverlayBridgeType.Concrete) {
            baseId = this.minLowBridgeConcreteId;
        }
        else if (type === OverlayBridgeType.Wood) {
            baseId = this.minLowBridgeWoodId;
        }
        else {
            throw new Error("Not implemented");
        }
        return baseId + (isStart ? 0 : 9);
    }
    static calculateHighBridgeOverlayId(type: OverlayBridgeType, isStart: boolean): number {
        let baseId: number;
        if (type === OverlayBridgeType.Concrete) {
            baseId = this.minHighBridgeConcreteId;
        }
        else if (type === OverlayBridgeType.Wood) {
            baseId = this.minHighBridgeWoodId;
        }
        else {
            throw new Error("Not implemented");
        }
        return baseId + (isStart ? 0 : 1);
    }
}
