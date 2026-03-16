import React, { useState, useEffect } from 'react';
import { Palette } from '../../data/Palette';
import { PcxFile } from '../../data/PcxFile';
import { ShpFile } from '../../data/ShpFile';
import { ImageUtils } from '../../engine/gfx/ImageUtils';
import { ImageContext, ImageContextClass } from './ImageContext';
interface ImageProps {
    src: string;
    palette?: string;
}
export const Image: React.FC<ImageProps> = (props) => {
    const context = ImageContext;
    const [imageUrl, setImageUrl] = useState("");
    useEffect(() => {
        let url: string;
        let cleanup: (() => void) | undefined;
        if (ImageContextClass.imageUrlCache.has(props.src)) {
            url = ImageContextClass.imageUrlCache.get(props.src)!;
        }
        else if (context.vfs?.fileExists(props.src)) {
            const extension = props.src.split(".").pop();
            if (extension === "shp") {
                const palette = props.palette;
                if (palette && context.vfs.fileExists(palette)) {
                    const shpFile = new ShpFile(context.vfs.openFile(props.src));
                    const paletteFile = new Palette(context.vfs.openFile(palette));
                    url = ImageUtils.convertShpToCanvas(shpFile, paletteFile).toDataURL();
                }
                else {
                    console.warn(`Palette "${palette}" not found in VFS"`);
                    url = "";
                }
            }
            else if (extension === "pcx") {
                const pcxFile = new PcxFile(context.vfs.openFile(props.src));
                url = pcxFile.toDataUrl();
            }
            else if (extension === "png") {
                const stream = context.vfs.openFile(props.src).stream;
                const blob = new Blob([new Uint8Array(stream.buffer, stream.byteOffset, stream.byteLength)], { type: "image/png" });
                url = URL.createObjectURL(blob);
                cleanup = () => {
                    URL.revokeObjectURL(url);
                    ImageContextClass.imageUrlCache.delete(props.src);
                };
            }
            else {
                console.warn(`Unknown image format "${extension}"`);
                url = "";
            }
            ImageContextClass.imageUrlCache.set(props.src, url);
        }
        else {
            url = context.cdnBaseUrl
                ? context.cdnBaseUrl + props.src.substring(0, props.src.lastIndexOf(".")) + ".png"
                : (console.warn(`Image "${props.src}" not found in VFS`), "");
        }
        setImageUrl(url);
        return cleanup;
    }, [props.src]);
    return imageUrl ? <img src={imageUrl}/> : null;
};
