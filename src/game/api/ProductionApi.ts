export class ProductionApi {
    private readonly production: any;
    constructor(production: any) {
        this.production = production;
    }
    isAvailableForProduction(object: any): boolean {
        return this.production.isAvailableForProduction(object);
    }
    getAvailableObjects(queueType?: any): any[] {
        let objects = this.production.getAvailableObjects();
        if (queueType !== undefined) {
            objects = objects.filter(obj => this.getQueueTypeForObject(obj) === queueType);
        }
        return objects;
    }
    getQueueTypeForObject(object: any): any {
        return this.production.getQueueTypeForObject(object);
    }
    getQueueData(queue: any): {
        size: number;
        maxSize: number;
        status: any;
        type: any;
        items: Array<{
            rules: any;
            quantity: number;
        }>;
    } {
        const queueData = this.production.getQueue(queue);
        return {
            size: queueData.currentSize,
            maxSize: queueData.maxSize,
            status: queueData.status,
            type: queueData.type,
            items: queueData.getAll().map(item => ({
                rules: item.rules,
                quantity: item.quantity
            }))
        };
    }
}
