export interface GrowingPackerBlock {
    w: number;
    h: number;
    fit?: GrowingPackerNode;
}
export interface GrowingPackerNode {
    x: number;
    y: number;
    w: number;
    h: number;
    used?: boolean;
    right?: GrowingPackerNode;
    down?: GrowingPackerNode;
}
export class GrowingPacker {
    root!: GrowingPackerNode;
    fit(blocks: GrowingPackerBlock[]): void {
        const width = blocks.length > 0 ? blocks[0].w : 0;
        const height = blocks.length > 0 ? blocks[0].h : 0;
        this.root = { x: 0, y: 0, w: width, h: height };
        for (const block of blocks) {
            const node = this.findNode(this.root, block.w, block.h);
            block.fit = node ? this.splitNode(node, block.w, block.h) : this.growNode(block.w, block.h);
        }
    }
    private findNode(root: GrowingPackerNode | undefined, width: number, height: number): GrowingPackerNode | undefined {
        if (!root) {
            return undefined;
        }
        if (root.used) {
            return this.findNode(root.right, width, height) ?? this.findNode(root.down, width, height);
        }
        if (width <= root.w && height <= root.h) {
            return root;
        }
        return undefined;
    }
    private splitNode(node: GrowingPackerNode, width: number, height: number): GrowingPackerNode {
        node.used = true;
        node.down = { x: node.x, y: node.y + height, w: node.w, h: node.h - height };
        node.right = { x: node.x + width, y: node.y, w: node.w - width, h: height };
        return node;
    }
    private growNode(width: number, height: number): GrowingPackerNode | undefined {
        const canGrowDown = width <= this.root.w;
        const canGrowRight = height <= this.root.h;
        const shouldGrowRight = canGrowRight && this.root.h >= this.root.w + width;
        const shouldGrowDown = canGrowDown && this.root.w >= this.root.h + height;
        if (shouldGrowRight) {
            return this.growRight(width, height);
        }
        if (shouldGrowDown) {
            return this.growDown(width, height);
        }
        if (canGrowRight) {
            return this.growRight(width, height);
        }
        if (canGrowDown) {
            return this.growDown(width, height);
        }
        return undefined;
    }
    private growRight(width: number, height: number): GrowingPackerNode | undefined {
        this.root = {
            used: true,
            x: 0,
            y: 0,
            w: this.root.w + width,
            h: this.root.h,
            down: this.root,
            right: { x: this.root.w, y: 0, w: width, h: this.root.h },
        };
        const node = this.findNode(this.root, width, height);
        return node ? this.splitNode(node, width, height) : undefined;
    }
    private growDown(width: number, height: number): GrowingPackerNode | undefined {
        this.root = {
            used: true,
            x: 0,
            y: 0,
            w: this.root.w,
            h: this.root.h + height,
            down: { x: 0, y: this.root.h, w: this.root.w, h: height },
            right: this.root,
        };
        const node = this.findNode(this.root, width, height);
        return node ? this.splitNode(node, width, height) : undefined;
    }
}
