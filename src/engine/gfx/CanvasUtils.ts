import { Palette } from '../../data/Palette';
interface DrawTextOptions {
    color?: string;
    backgroundColor?: string;
    outlineColor?: string;
    outlineWidth?: number;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string;
    borderColor?: string;
    borderWidth?: number;
    paddingTop?: number;
    paddingBottom?: number;
    paddingLeft?: number;
    paddingRight?: number;
    textAlign?: CanvasTextAlign;
    width?: number;
    height?: number;
    autoEnlargeCanvas?: boolean;
}
interface TextRect {
    x: number;
    y: number;
    width: number;
    height: number;
}
export class CanvasUtils {
    static canvasFromRgbaImageData(data: Uint8Array, width: number, height: number): HTMLCanvasElement {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error("Couldn't acquire canvas 2d context");
        }
        canvas.width = width;
        canvas.height = height;
        const imageData = ctx.createImageData(width, height);
        let dataIndex = 0;
        for (let i = 0; i < data.length; i += 4) {
            imageData.data[dataIndex] = data[i];
            imageData.data[dataIndex + 1] = data[i + 1];
            imageData.data[dataIndex + 2] = data[i + 2];
            imageData.data[dataIndex + 3] = data[i + 3];
            dataIndex += 4;
        }
        ctx.putImageData(imageData, 0, 0);
        return canvas;
    }
    static canvasFromRgbImageData(data: Uint8Array, width: number, height: number): HTMLCanvasElement {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error("Couldn't acquire canvas 2d context");
        }
        canvas.width = width;
        canvas.height = height;
        const imageData = ctx.createImageData(width, height);
        let dataIndex = 0;
        for (let i = 0; i < data.length; i += 3) {
            imageData.data[dataIndex] = data[i];
            imageData.data[dataIndex + 1] = data[i + 1];
            imageData.data[dataIndex + 2] = data[i + 2];
            imageData.data[dataIndex + 3] = 255;
            dataIndex += 4;
        }
        ctx.putImageData(imageData, 0, 0);
        return canvas;
    }
    static canvasFromIndexedImageData(data: Uint8Array, width: number, height: number, palette: any): HTMLCanvasElement {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error("Couldn't acquire canvas 2d context");
        }
        canvas.width = width;
        canvas.height = height;
        const imageData = ctx.createImageData(width, height);
        const colors = palette.colors;
        let dataIndex = 0;
        for (let i = 0; i < data.length; i++) {
            const colorIndex = data[i];
            const color = colors[colorIndex] || { r: 0, g: 0, b: 0 };
            imageData.data[dataIndex] = color.r;
            imageData.data[dataIndex + 1] = color.g;
            imageData.data[dataIndex + 2] = color.b;
            imageData.data[dataIndex + 3] = colorIndex ? 255 : 0;
            dataIndex += 4;
        }
        ctx.putImageData(imageData, 0, 0);
        return canvas;
    }
    static async canvasToBlob(canvas: HTMLCanvasElement, mimeType: string = "image/png"): Promise<Blob> {
        let blob = await new Promise<Blob | null>((resolve) => {
            try {
                canvas.toBlob((blob) => {
                    resolve(blob);
                });
            }
            catch (error) {
                console.error(error);
                resolve(null);
            }
        });
        if (!blob) {
            console.warn('Failed to convert canvas to blob. Falling back to dataURL generation.');
            try {
                blob = this.dataUrlToBlob(canvas.toDataURL());
            }
            catch (error) {
                throw new Error(`Failed to generate image from canvas using fallback ${error}`);
            }
        }
        return blob;
    }
    static dataUrlToBlob(dataUrl: string): Blob {
        const match = dataUrl.match(/^data:((.*?)(;charset=.*?)?)(;base64)?,/);
        if (!match) {
            throw new Error('invalid dataURI');
        }
        const mimeType = match[2] ? match[1] : 'text/plain' + (match[3] || ';charset=utf-8');
        const isBase64 = !!match[4];
        const data = dataUrl.slice(match[0].length);
        const bytes = (isBase64 ? atob : decodeURIComponent)(data);
        const byteArray: number[] = [];
        for (let i = 0; i < bytes.length; i++) {
            byteArray.push(bytes.charCodeAt(i));
        }
        return new Blob([new Uint8Array(byteArray)], { type: mimeType });
    }
    static drawText(ctx: CanvasRenderingContext2D, text: string, x: number = 0, y: number = 0, options: DrawTextOptions = {}): TextRect {
        const { color = "white", backgroundColor, outlineColor, outlineWidth, fontSize = 10, fontFamily = "Arial, sans-serif", fontWeight = "normal", borderColor, borderWidth = 0, paddingTop = 0, paddingBottom = 0, paddingLeft = 0, paddingRight = 0, textAlign = "left", width: explicitWidth, height: explicitHeight, autoEnlargeCanvas = false, } = options;
        const fontStyle = `${fontWeight} ${fontSize}px ${fontFamily}`;
        ctx.font = fontStyle;
        const textMetrics = ctx.measureText(text);
        const capAHeightMetrics = ctx.measureText("A");
        const textHeightEstimate = capAHeightMetrics.actualBoundingBoxAscent + capAHeightMetrics.actualBoundingBoxDescent;
        const measuredTextWidth = Math.ceil(Math.max(textMetrics.width, Math.abs(textMetrics.actualBoundingBoxLeft || 0) + Math.abs(textMetrics.actualBoundingBoxRight || 0)));
        const boxWidth = explicitWidth ?? (measuredTextWidth + paddingLeft + paddingRight + 2 * borderWidth);
        const boxHeight = explicitHeight ?? (textHeightEstimate + paddingTop + paddingBottom + 2 * borderWidth);
        let drawX = x;
        if (textAlign === "right" && explicitWidth === undefined) {
            drawX = ctx.canvas.width - boxWidth - x;
        }
        else if (textAlign === "center" && explicitWidth === undefined) {
            drawX = x - boxWidth / 2;
        }
        const rect: TextRect = {
            x: drawX,
            y: y,
            width: boxWidth,
            height: boxHeight,
        };
        if (autoEnlargeCanvas) {
            let needsResize = false;
            let newCanvasWidth = ctx.canvas.width;
            let newCanvasHeight = ctx.canvas.height;
            if (rect.x + rect.width > newCanvasWidth) {
                newCanvasWidth = rect.x + rect.width;
                needsResize = true;
            }
            if (rect.y + rect.height > newCanvasHeight) {
                newCanvasHeight = rect.y + rect.height;
                needsResize = true;
            }
            if (needsResize) {
                const currentContent = (ctx.canvas.width > 0 && ctx.canvas.height > 0) ? ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height) : undefined;
                ctx.canvas.width = newCanvasWidth;
                ctx.canvas.height = newCanvasHeight;
                if (currentContent)
                    ctx.putImageData(currentContent, 0, 0);
                ctx.font = fontStyle;
            }
        }
        if (backgroundColor) {
            ctx.fillStyle = backgroundColor;
            ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
        }
        if (borderColor && borderWidth > 0) {
            ctx.strokeStyle = borderColor;
            ctx.lineWidth = borderWidth;
            ctx.strokeRect(rect.x + borderWidth / 2, rect.y + borderWidth / 2, rect.width - borderWidth, rect.height - borderWidth);
        }
        ctx.fillStyle = color;
        ctx.font = fontStyle;
        ctx.textAlign = textAlign;
        let textDrawX = rect.x + paddingLeft + borderWidth;
        if (textAlign === 'center') {
            textDrawX = rect.x + rect.width / 2;
        }
        else if (textAlign === 'right') {
            textDrawX = rect.x + rect.width - paddingRight - borderWidth;
        }
        const textDrawY = rect.y + paddingTop + borderWidth + (textMetrics.actualBoundingBoxAscent || fontSize * 0.8);
        if (outlineColor && outlineWidth && outlineWidth > 0) {
            ctx.strokeStyle = outlineColor;
            ctx.lineWidth = outlineWidth * 2;
            ctx.strokeText(text, textDrawX, textDrawY, explicitWidth ? rect.width - paddingLeft - paddingRight - 2 * borderWidth : undefined);
        }
        ctx.fillText(text, textDrawX, textDrawY, explicitWidth ? rect.width - paddingLeft - paddingRight - 2 * borderWidth : undefined);
        return rect;
    }
}
