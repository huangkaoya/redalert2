export class ShpImage {
    public width: number;
    public height: number;
    public x: number;
    public y: number;
    public imageData: Uint8Array;
    constructor(imageData?: Uint8Array, width?: number, height?: number, x?: number, y?: number) {
        this.imageData = imageData ?? new Uint8Array(0);
        this.width = width ?? (imageData ? Math.sqrt(imageData.length) : 1);
        this.height = height ?? (imageData ? imageData.length / this.width : 1);
        this.x = x ?? 0;
        this.y = y ?? 0;
        if (this.imageData.length > 0 && this.width * this.height > this.imageData.length) {
        }
    }
    clip(clipWidth: number, clipHeight: number): ShpImage {
        const newWidth = Math.min(this.width, clipWidth);
        const newHeight = Math.min(this.height, clipHeight);
        const clippedImageData = new Uint8Array(newWidth * newHeight);
        for (let r = 0; r < newHeight; r++) {
            for (let c = 0; c < newWidth; c++) {
                const sourceIndex = r * this.width + c;
                const destIndex = r * newWidth + c;
                if (sourceIndex < this.imageData.length) {
                    clippedImageData[destIndex] = this.imageData[sourceIndex];
                }
                else {
                    clippedImageData[destIndex] = 0;
                }
            }
        }
        return new ShpImage(clippedImageData, newWidth, newHeight, this.x, this.y);
    }
}
