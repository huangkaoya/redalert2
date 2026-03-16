export class OriginalDataStream {
    constructor(e, t, i = OriginalDataStream.LITTLE_ENDIAN) {
        (this.endianness = i),
            (this.position = 0),
            (this._dynamicSize = !0),
            (this._byteLength = 0),
            (this._byteOffset = t || 0),
            e instanceof ArrayBuffer
                ? (this.buffer = e)
                : "object" == typeof e
                    ? ((this.dataView = e), t && (this._byteOffset += t))
                    : (this.buffer = new ArrayBuffer(e || 0));
    }
    get dynamicSize() {
        return this._dynamicSize;
    }
    set dynamicSize(e) {
        e || this._trimAlloc(), (this._dynamicSize = e);
    }
    get byteLength() {
        return this._byteLength - this._byteOffset;
    }
    get buffer() {
        return this._trimAlloc(), this._buffer;
    }
    set buffer(e) {
        (this._buffer = e),
            (this._dataView = new DataView(this._buffer, this._byteOffset)),
            (this._byteLength = this._buffer.byteLength);
    }
    get byteOffset() {
        return this._byteOffset;
    }
    set byteOffset(e) {
        (this._byteOffset = e),
            (this._dataView = new DataView(this._buffer, this._byteOffset)),
            (this._byteLength = this._buffer.byteLength);
    }
    get dataView() {
        return this._dataView;
    }
    set dataView(e) {
        (this._byteOffset = e.byteOffset),
            (this._buffer = e.buffer),
            (this._dataView = new DataView(this._buffer, this._byteOffset)),
            (this._byteLength = this._byteOffset + e.byteLength);
    }
    bigEndian() {
        return (this.endianness = OriginalDataStream.BIG_ENDIAN), this;
    }
    _realloc(t) {
        if (this._dynamicSize) {
            var i = this._byteOffset + this.position + t;
            let e = this._buffer.byteLength;
            if (i <= e)
                i > this._byteLength && (this._byteLength = i);
            else {
                for (e < 1 && (e = 1); i > e;)
                    e *= 2;
                var r = new ArrayBuffer(e), s = new Uint8Array(this._buffer);
                const a = new Uint8Array(r, 0, s.length);
                a.set(s), (this.buffer = r), (this._byteLength = i);
            }
        }
    }
    _trimAlloc() {
        if (this._byteLength !== this._buffer.byteLength) {
            var e = new ArrayBuffer(this._byteLength);
            const i = new Uint8Array(e);
            var t = new Uint8Array(this._buffer, 0, i.length);
            i.set(t), (this.buffer = e);
        }
    }
    seek(e) {
        var t = Math.max(0, Math.min(this.byteLength, e));
        this.position = isNaN(t) || !isFinite(t) ? 0 : t;
    }
    isEof() {
        return this.position >= this.byteLength;
    }
    mapInt32Array(e, t) {
        this._realloc(4 * e);
        var i = new Int32Array(this._buffer, this.byteOffset + this.position, e);
        return (OriginalDataStream.arrayToNative(i, void 0 === t ? this.endianness : t),
            (this.position += 4 * e),
            i);
    }
    mapInt16Array(e, t) {
        this._realloc(2 * e);
        var i = new Int16Array(this._buffer, this.byteOffset + this.position, e);
        return (OriginalDataStream.arrayToNative(i, void 0 === t ? this.endianness : t),
            (this.position += 2 * e),
            i);
    }
    mapInt8Array(e) {
        this._realloc(e);
        var t = new Int8Array(this._buffer, this.byteOffset + this.position, e);
        return (this.position += e), t;
    }
    mapUint32Array(e, t) {
        this._realloc(4 * e);
        var i = new Uint32Array(this._buffer, this.byteOffset + this.position, e);
        return (OriginalDataStream.arrayToNative(i, void 0 === t ? this.endianness : t),
            (this.position += 4 * e),
            i);
    }
    mapUint16Array(e, t) {
        this._realloc(2 * e);
        var i = new Uint16Array(this._buffer, this.byteOffset + this.position, e);
        return (OriginalDataStream.arrayToNative(i, void 0 === t ? this.endianness : t),
            (this.position += 2 * e),
            i);
    }
    mapUint8Array(e) {
        this._realloc(e);
        var t = new Uint8Array(this._buffer, this.byteOffset + this.position, e);
        return (this.position += e), t;
    }
    mapFloat64Array(e, t) {
        this._realloc(8 * e);
        var i = new Float64Array(this._buffer, this.byteOffset + this.position, e);
        return (OriginalDataStream.arrayToNative(i, void 0 === t ? this.endianness : t),
            (this.position += 8 * e),
            i);
    }
    mapFloat32Array(e, t) {
        this._realloc(4 * e);
        var i = new Float32Array(this._buffer, this.byteOffset + this.position, e);
        return (OriginalDataStream.arrayToNative(i, void 0 === t ? this.endianness : t),
            (this.position += 4 * e),
            i);
    }
    readInt32Array(e, t) {
        e = void 0 === e ? this.byteLength - this.position / 4 : e;
        var i = new Int32Array(e);
        return (OriginalDataStream.memcpy(i.buffer, 0, this.buffer, this.byteOffset + this.position, e * i.BYTES_PER_ELEMENT),
            OriginalDataStream.arrayToNative(i, void 0 === t ? this.endianness : t),
            (this.position += i.byteLength),
            i);
    }
    readInt16Array(e, t) {
        e = void 0 === e ? this.byteLength - this.position / 2 : e;
        var i = new Int16Array(e);
        return (OriginalDataStream.memcpy(i.buffer, 0, this.buffer, this.byteOffset + this.position, e * i.BYTES_PER_ELEMENT),
            OriginalDataStream.arrayToNative(i, void 0 === t ? this.endianness : t),
            (this.position += i.byteLength),
            i);
    }
    readInt8Array(e) {
        e = void 0 === e ? this.byteLength - this.position : e;
        var t = new Int8Array(e);
        return (OriginalDataStream.memcpy(t.buffer, 0, this.buffer, this.byteOffset + this.position, e * t.BYTES_PER_ELEMENT),
            (this.position += t.byteLength),
            t);
    }
    readUint32Array(e, t) {
        e = void 0 === e ? this.byteLength - this.position / 4 : e;
        var i = new Uint32Array(e);
        return (OriginalDataStream.memcpy(i.buffer, 0, this.buffer, this.byteOffset + this.position, e * i.BYTES_PER_ELEMENT),
            OriginalDataStream.arrayToNative(i, void 0 === t ? this.endianness : t),
            (this.position += i.byteLength),
            i);
    }
    readUint16Array(e, t) {
        e = void 0 === e ? this.byteLength - this.position / 2 : e;
        var i = new Uint16Array(e);
        return (OriginalDataStream.memcpy(i.buffer, 0, this.buffer, this.byteOffset + this.position, e * i.BYTES_PER_ELEMENT),
            OriginalDataStream.arrayToNative(i, void 0 === t ? this.endianness : t),
            (this.position += i.byteLength),
            i);
    }
    readUint8Array(e) {
        e = void 0 === e ? this.byteLength - this.position : e;
        var t = new Uint8Array(e);
        return (OriginalDataStream.memcpy(t.buffer, 0, this.buffer, this.byteOffset + this.position, e * t.BYTES_PER_ELEMENT),
            (this.position += t.byteLength),
            t);
    }
    readFloat64Array(e, t) {
        e = void 0 === e ? this.byteLength - this.position / 8 : e;
        var i = new Float64Array(e);
        return (OriginalDataStream.memcpy(i.buffer, 0, this.buffer, this.byteOffset + this.position, e * i.BYTES_PER_ELEMENT),
            OriginalDataStream.arrayToNative(i, void 0 === t ? this.endianness : t),
            (this.position += i.byteLength),
            i);
    }
    readFloat32Array(e, t) {
        e = void 0 === e ? this.byteLength - this.position / 4 : e;
        var i = new Float32Array(e);
        return (OriginalDataStream.memcpy(i.buffer, 0, this.buffer, this.byteOffset + this.position, e * i.BYTES_PER_ELEMENT),
            OriginalDataStream.arrayToNative(i, void 0 === t ? this.endianness : t),
            (this.position += i.byteLength),
            i);
    }
    writeInt32Array(t, i) {
        if ((this._realloc(4 * t.length),
            t instanceof Int32Array &&
                (this.byteOffset + this.position) % t.BYTES_PER_ELEMENT == 0))
            OriginalDataStream.memcpy(this._buffer, this.byteOffset + this.position, t.buffer, t.byteOffset, t.byteLength),
                this.mapInt32Array(t.length, i);
        else
            for (let e = 0; e < t.length; e++)
                this.writeInt32(t[e], i);
        return this;
    }
    writeInt16Array(t, i) {
        if ((this._realloc(2 * t.length),
            t instanceof Int16Array &&
                (this.byteOffset + this.position) % t.BYTES_PER_ELEMENT == 0))
            OriginalDataStream.memcpy(this._buffer, this.byteOffset + this.position, t.buffer, t.byteOffset, t.byteLength),
                this.mapInt16Array(t.length, i);
        else
            for (let e = 0; e < t.length; e++)
                this.writeInt16(t[e], i);
        return this;
    }
    writeInt8Array(t) {
        if ((this._realloc(t.length),
            t instanceof Int8Array &&
                (this.byteOffset + this.position) % t.BYTES_PER_ELEMENT == 0))
            OriginalDataStream.memcpy(this._buffer, this.byteOffset + this.position, t.buffer, t.byteOffset, t.byteLength),
                this.mapInt8Array(t.length);
        else
            for (let e = 0; e < t.length; e++)
                this.writeInt8(t[e]);
        return this;
    }
    writeUint32Array(t, i) {
        if ((this._realloc(4 * t.length),
            t instanceof Uint32Array &&
                (this.byteOffset + this.position) % t.BYTES_PER_ELEMENT == 0))
            OriginalDataStream.memcpy(this._buffer, this.byteOffset + this.position, t.buffer, t.byteOffset, t.byteLength),
                this.mapUint32Array(t.length, i);
        else
            for (let e = 0; e < t.length; e++)
                this.writeUint32(t[e], i);
        return this;
    }
    writeUint16Array(t, i) {
        if ((this._realloc(2 * t.length),
            t instanceof Uint16Array &&
                (this.byteOffset + this.position) % t.BYTES_PER_ELEMENT == 0))
            OriginalDataStream.memcpy(this._buffer, this.byteOffset + this.position, t.buffer, t.byteOffset, t.byteLength),
                this.mapUint16Array(t.length, i);
        else
            for (let e = 0; e < t.length; e++)
                this.writeUint16(t[e], i);
        return this;
    }
    writeUint8Array(t) {
        if ((this._realloc(t.length),
            t instanceof Uint8Array &&
                (this.byteOffset + this.position) % t.BYTES_PER_ELEMENT == 0))
            OriginalDataStream.memcpy(this._buffer, this.byteOffset + this.position, t.buffer, t.byteOffset, t.byteLength),
                this.mapUint8Array(t.length);
        else
            for (let e = 0; e < t.length; e++)
                this.writeUint8(t[e]);
        return this;
    }
    writeFloat64Array(t, i) {
        if ((this._realloc(8 * t.length),
            t instanceof Float64Array &&
                (this.byteOffset + this.position) % t.BYTES_PER_ELEMENT == 0))
            OriginalDataStream.memcpy(this._buffer, this.byteOffset + this.position, t.buffer, t.byteOffset, t.byteLength),
                this.mapFloat64Array(t.length, i);
        else
            for (let e = 0; e < t.length; e++)
                this.writeFloat64(t[e], i);
        return this;
    }
    writeFloat32Array(t, i) {
        if ((this._realloc(4 * t.length),
            t instanceof Float32Array &&
                (this.byteOffset + this.position) % t.BYTES_PER_ELEMENT == 0))
            OriginalDataStream.memcpy(this._buffer, this.byteOffset + this.position, t.buffer, t.byteOffset, t.byteLength),
                this.mapFloat32Array(t.length, i);
        else
            for (let e = 0; e < t.length; e++)
                this.writeFloat32(t[e], i);
        return this;
    }
    readInt32(e) {
        var t = this._dataView.getInt32(this.position, void 0 === e ? this.endianness : e);
        return (this.position += 4), t;
    }
    readInt16(e) {
        var t = this._dataView.getInt16(this.position, void 0 === e ? this.endianness : e);
        return (this.position += 2), t;
    }
    readInt8() {
        var e = this._dataView.getInt8(this.position);
        return (this.position += 1), e;
    }
    readUint32(e) {
        var t = this._dataView.getUint32(this.position, void 0 === e ? this.endianness : e);
        return (this.position += 4), t;
    }
    readUint16(e) {
        var t = this._dataView.getUint16(this.position, void 0 === e ? this.endianness : e);
        return (this.position += 2), t;
    }
    readUint8() {
        var e = this._dataView.getUint8(this.position);
        return (this.position += 1), e;
    }
    readFloat32(e) {
        var t = this._dataView.getFloat32(this.position, void 0 === e ? this.endianness : e);
        return (this.position += 4), t;
    }
    readFloat64(e) {
        var t = this._dataView.getFloat64(this.position, void 0 === e ? this.endianness : e);
        return (this.position += 8), t;
    }
    writeInt32(e, t) {
        return (this._realloc(4),
            this._dataView.setInt32(this.position, e, void 0 === t ? this.endianness : t),
            (this.position += 4),
            this);
    }
    writeInt16(e, t) {
        return (this._realloc(2),
            this._dataView.setInt16(this.position, e, void 0 === t ? this.endianness : t),
            (this.position += 2),
            this);
    }
    writeInt8(e) {
        return (this._realloc(1),
            this._dataView.setInt8(this.position, e),
            (this.position += 1),
            this);
    }
    writeUint32(e, t) {
        return (this._realloc(4),
            this._dataView.setUint32(this.position, e, void 0 === t ? this.endianness : t),
            (this.position += 4),
            this);
    }
    writeUint16(e, t) {
        return (this._realloc(2),
            this._dataView.setUint16(this.position, e, void 0 === t ? this.endianness : t),
            (this.position += 2),
            this);
    }
    writeUint8(e) {
        return (this._realloc(1),
            this._dataView.setUint8(this.position, e),
            (this.position += 1),
            this);
    }
    writeFloat32(e, t) {
        return (this._realloc(4),
            this._dataView.setFloat32(this.position, e, void 0 === t ? this.endianness : t),
            (this.position += 4),
            this);
    }
    writeFloat64(e, t) {
        return (this._realloc(8),
            this._dataView.setFloat64(this.position, e, void 0 === t ? this.endianness : t),
            (this.position += 8),
            this);
    }
    static memcpy(e, t, i, r, s) {
        const a = new Uint8Array(e, t, s);
        var n = new Uint8Array(i, r, s);
        a.set(n);
    }
    static arrayToNative(e, t) {
        return t === this.endianness ? e : this.flipArrayEndianness(e);
    }
    static nativeToEndian(e, t) {
        return this.endianness === t ? e : this.flipArrayEndianness(e);
    }
    static flipArrayEndianness(i) {
        const r = new Uint8Array(i.buffer, i.byteOffset, i.byteLength);
        for (let a = 0; a < i.byteLength; a += i.BYTES_PER_ELEMENT)
            for (let e = a + i.BYTES_PER_ELEMENT - 1, t = a; e > t; e--, t++) {
                var s = r[t];
                (r[t] = r[e]), (r[e] = s);
            }
        return i;
    }
    static createStringFromArray(e) {
        const t = [];
        for (let i = 0; i < e.length; i += 32768)
            t.push(String.fromCharCode.apply(void 0, e.subarray(i, i + 32768)));
        return t.join("");
    }
    readUCS2String(e, t) {
        return OriginalDataStream.createStringFromArray(this.readUint16Array(e, t));
    }
    writeUCS2String(e, t, i) {
        void 0 === i && (i = e.length);
        let r = 0;
        for (; r < e.length && r < i; r++)
            this.writeUint16(e.charCodeAt(r), t);
        for (; r < i; r++)
            this.writeUint16(0);
        return this;
    }
    readString(e, t) {
        return void 0 === t || "ASCII" === t
            ? OriginalDataStream.createStringFromArray(this.mapUint8Array(void 0 === e ? this.byteLength - this.position : e))
            : new TextDecoder(t).decode(this.mapUint8Array(e));
    }
    writeString(t, e, i) {
        if (void 0 === e || "ASCII" === e)
            if (void 0 !== i) {
                let e;
                var r = Math.min(t.length, i);
                for (e = 0; e < r; e++)
                    this.writeUint8(t.charCodeAt(e));
                for (; e < i; e++)
                    this.writeUint8(0);
            }
            else
                for (let e = 0; e < t.length; e++)
                    this.writeUint8(t.charCodeAt(e));
        else
            this.writeUint8Array(new TextEncoder().encode(t.substring(0, i)));
        return this;
    }
    writeUtf8WithLen(e) {
        var t = new TextEncoder().encode(e);
        return this.writeUint16(t.length).writeUint8Array(t);
    }
    readUtf8WithLen() {
        var e = this.readUint16();
        return new TextDecoder().decode(this.mapUint8Array(e));
    }
    readCString(e) {
        var t = this.byteLength - this.position, i = new Uint8Array(this._buffer, this._byteOffset + this.position);
        let r = t;
        void 0 !== e && (r = Math.min(e, t));
        let s = 0;
        for (; s < r && 0 !== i[s]; s++)
            ;
        var a = OriginalDataStream.createStringFromArray(this.mapUint8Array(s));
        return (void 0 !== e
            ? (this.position += r - s)
            : s !== t && (this.position += 1),
            a);
    }
    writeCString(t, i) {
        if (void 0 !== i) {
            let e;
            var r = Math.min(t.length, i);
            for (e = 0; e < r; e++)
                this.writeUint8(t.charCodeAt(e));
            for (; e < i; e++)
                this.writeUint8(0);
        }
        else {
            for (let e = 0; e < t.length; e++)
                this.writeUint8(t.charCodeAt(e));
            this.writeUint8(0);
        }
        return this;
    }
    toUint8Array() {
        return new Uint8Array(this.buffer, this.byteOffset, this.byteLength);
    }
}
OriginalDataStream.BIG_ENDIAN = !1;
OriginalDataStream.LITTLE_ENDIAN = !0;
OriginalDataStream.endianness = 0 < new Int8Array(new Int16Array([1]).buffer)[0];
