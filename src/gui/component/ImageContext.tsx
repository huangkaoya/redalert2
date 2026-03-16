export class ImageContextClass {
    static imageUrlCache = new Map<string, string>();
    vfs?: any;
    cdnBaseUrl?: string;
}
export const ImageContext = new ImageContextClass();
