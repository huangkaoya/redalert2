import { binaryStringToUint8Array } from "./originalString.js";
import { OriginalCrc32 } from "./OriginalCrc32.js";
export class OriginalMixEntry {
    static size = 12;
    static hashFilename(t) {
        var i = (t = t.toUpperCase()).length, r = i >> 2;
        if (0 != (3 & i)) {
            t += String.fromCharCode(i - (r << 2));
            let e = 3 - (3 & i);
            for (; 0 != e--;)
                t += t[r << 2];
        }
        return OriginalCrc32.calculateCrc(binaryStringToUint8Array(t));
    }
    constructor(e, t, i) {
        this.hash = e;
        this.offset = t;
        this.length = i;
    }
}
