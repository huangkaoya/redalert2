interface Node {
    fScore: number;
    heapIndex: number;
}
export class NodeHeap {
    private data: Node[];
    public length: number;
    constructor(initialData: Node[] = []) {
        this.data = initialData;
        this.length = initialData.length;
        if (this.length > 0) {
            for (let i = this.length >> 1; i >= 0; i--) {
                this.down(i);
            }
        }
        for (let i = 0; i < this.length; ++i) {
            this.setNodeId(this.data[i], i);
        }
    }
    private compare(a: Node, b: Node): number {
        return a.fScore - b.fScore;
    }
    private setNodeId(node: Node, index: number): void {
        node.heapIndex = index;
    }
    push(node: Node): void {
        this.data.push(node);
        this.setNodeId(node, this.length);
        this.length++;
        this.up(this.length - 1);
    }
    pop(): Node | undefined {
        if (this.length === 0) {
            return undefined;
        }
        const result = this.data[0];
        this.length--;
        if (this.length > 0) {
            this.data[0] = this.data[this.length];
            this.setNodeId(this.data[0], 0);
            this.down(0);
        }
        this.data.pop();
        return result;
    }
    peek(): Node | undefined {
        return this.data[0];
    }
    updateItem(index: number): void {
        this.down(index);
        this.up(index);
    }
    private up(index: number): void {
        const data = this.data;
        const item = data[index];
        while (index > 0) {
            const parentIndex = (index - 1) >> 1;
            const parent = data[parentIndex];
            if (this.compare(item, parent) >= 0) {
                break;
            }
            data[index] = parent;
            this.setNodeId(parent, index);
            index = parentIndex;
        }
        data[index] = item;
        this.setNodeId(item, index);
    }
    private down(index: number): void {
        const data = this.data;
        const halfLength = this.length >> 1;
        const item = data[index];
        while (index < halfLength) {
            let childIndex = 1 + (index << 1);
            const rightChildIndex = childIndex + 1;
            let child = data[childIndex];
            if (rightChildIndex < this.length && this.compare(data[rightChildIndex], child) < 0) {
                childIndex = rightChildIndex;
                child = data[rightChildIndex];
            }
            if (this.compare(child, item) >= 0) {
                break;
            }
            data[index] = child;
            this.setNodeId(child, index);
            index = childIndex;
        }
        data[index] = item;
        this.setNodeId(item, index);
    }
}
