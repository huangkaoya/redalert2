export class Format3 {
    static decode(sourceData: Uint8Array, width: number, height: number): Uint8Array {
        const decodedData = new Uint8Array(width * height);
        let sourceIndex = 0;
        let destIndex = 0;
        for (let y = 0; y < height; y++) {
            let lineDataLength = ((sourceData[sourceIndex + 1] << 8) | sourceData[sourceIndex]) - 2;
            sourceIndex += 2;
            let currentXInLine = 0;
            while (lineDataLength > 0) {
                const value = sourceData[sourceIndex++];
                lineDataLength--;
                if (value !== 0) {
                    if (destIndex < decodedData.length && currentXInLine < width) {
                        decodedData[destIndex++] = value;
                    }
                    currentXInLine++;
                }
                else {
                    let runLength = sourceData[sourceIndex++];
                    lineDataLength--;
                    if (currentXInLine + runLength > width) {
                        runLength = (width - currentXInLine) & 255;
                    }
                    for (let k = 0; k < runLength; k++) {
                        if (destIndex < decodedData.length && currentXInLine < width) {
                            decodedData[destIndex++] = 0;
                        }
                        currentXInLine++;
                    }
                }
            }
            while (currentXInLine < width && destIndex < (y + 1) * width && destIndex < decodedData.length) {
                decodedData[destIndex++] = 0;
                currentXInLine++;
            }
            destIndex = (y + 1) * width;
        }
        return decodedData;
    }
}
