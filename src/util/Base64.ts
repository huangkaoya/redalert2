declare var Buffer: any;
export class Base64 {
    static encode(str: string): string {
        if (typeof globalThis.btoa === 'function') {
            try {
                return globalThis.btoa(str);
            }
            catch (e) {
                if (typeof Buffer !== 'undefined') {
                    return Buffer.from(str, 'utf-8').toString('base64');
                }
                else {
                    console.warn('Base64.encode: Buffer is not defined, encoding may be incorrect for non-ASCII.');
                    return unescape(encodeURIComponent(str));
                }
            }
        }
        else if (typeof Buffer !== 'undefined') {
            return Buffer.from(str, 'utf-8').toString('base64');
        }
        else {
            throw new Error('Base64 encoding unsupported in this environment.');
        }
    }
    static decode(encodedStr: string): string {
        if (typeof globalThis.atob === 'function') {
            try {
                return globalThis.atob(encodedStr);
            }
            catch (e) {
                if (typeof Buffer !== 'undefined') {
                    return Buffer.from(encodedStr, 'base64').toString('utf-8');
                }
                else {
                    console.warn('Base64.decode: Buffer is not defined, decoding may be incorrect for non-ASCII.');
                    return decodeURIComponent(escape(encodedStr));
                }
            }
        }
        else if (typeof Buffer !== 'undefined') {
            return Buffer.from(encodedStr, 'base64').toString('utf-8');
        }
        else {
            throw new Error('Base64 decoding unsupported in this environment.');
        }
    }
    static isBase64(str: string): boolean {
        if (!str || typeof str !== 'string') {
            return false;
        }
        const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
        if (!base64Regex.test(str)) {
            return false;
        }
        const strictBase64Regex = /^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
        return strictBase64Regex.test(str);
    }
}
