export class GraphNode<T> {
    id: string;
    data: T;
    neighbors: Set<GraphNode<T>>;
    constructor(id: string, data: T) {
        this.id = id;
        this.data = data;
        this.neighbors = new Set();
    }
    addLink(node: GraphNode<T>): void {
        this.neighbors.add(node);
        if (node !== this) {
            node.neighbors.add(this);
        }
    }
    removeLink(node: GraphNode<T>): void {
        this.neighbors.delete(node);
        node.neighbors.delete(this);
    }
    deleteLinks(): void {
        for (const node of this.neighbors) {
            node.neighbors.delete(this);
        }
        this.neighbors.clear();
    }
}
export class Graph<T> {
    private nodes: Map<string, GraphNode<T>>;
    constructor() {
        this.nodes = new Map();
    }
    addNode(id: string, data: T): GraphNode<T> {
        let node = this.getNode(id);
        if (node) {
            node.data = data;
        }
        else {
            node = new GraphNode(id, data);
        }
        this.nodes.set(id, node);
        return node;
    }
    removeNode(id: string): boolean {
        const node = this.getNode(id);
        if (!node) {
            return false;
        }
        node.deleteLinks();
        this.nodes.delete(id);
        return true;
    }
    hasNode(id: string): boolean {
        return this.nodes.has(id);
    }
    getNode(id: string): GraphNode<T> | undefined {
        return this.nodes.get(id);
    }
    getNodeCount(): number {
        return this.nodes.size;
    }
    forEachNode(callback: (node: GraphNode<T>) => void): void {
        for (const node of this.nodes.values()) {
            callback(node);
        }
    }
    clear(): void {
        for (const node of this.nodes.values()) {
            node.deleteLinks();
        }
        this.nodes.clear();
    }
}
