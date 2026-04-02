type TypedArray = Int8Array | Uint8Array | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | Float64Array;
export class DataStream {
    public static LITTLE_ENDIAN: boolean = true;
    public static BIG_ENDIAN: boolean = false;
    public static readonly endianness: boolean = new Int8Array(new Int16Array([1]).buffer)[0] > 0;
    private _buffer: ArrayBuffer;
    private _dataView: DataView;
    private _byteOffset: number;
    private _byteLength: number;
    private _dynamicSize: boolean;
    public position: number;
    public endianness: boolean;
    constructor(bufferOrSize: ArrayBuffer | DataView | TypedArray | number = 0, byteOffset: number = 0, endianness: boolean = DataStream.LITTLE_ENDIAN) {
        this.endianness = endianness;
        this.position = 0;
        this._dynamicSize = true;
        this._byteLength = 0;
        this._byteOffset = byteOffset || 0;
        if (bufferOrSize instanceof ArrayBuffer) {
            this.buffer = bufferOrSize;
        }
        else if (typeof bufferOrSize === 'object') {
            this.dataView = bufferOrSize as DataView | TypedArray;
            if (byteOffset) {
                this._byteOffset += byteOffset;
            }
        }
        else {
            this.buffer = new ArrayBuffer((bufferOrSize as number) || 0);
        }
    }
    get dynamicSize(): boolean {
        return this._dynamicSize;
    }
    set dynamicSize(value: boolean) {
        if (!value) {
            this._trimAlloc();
        }
        this._dynamicSize = value;
    }
    get byteLength(): number {
        return this._byteLength - this._byteOffset;
    }
    get buffer(): ArrayBuffer {
        this._trimAlloc();
        return this._buffer;
    }
    set buffer(newBuffer: ArrayBuffer) {
        this._buffer = newBuffer;
        this._dataView = new DataView(this._buffer, this._byteOffset);
        this._byteLength = this._buffer.byteLength;
    }
    get byteOffset(): number {
        return this._byteOffset;
    }
    set byteOffset(newOffset: number) {
        this._byteOffset = newOffset;
        this._dataView = new DataView(this._buffer, this._byteOffset);
    }
    get dataView(): DataView {
        return this._dataView;
    }
    set dataView(newDataView: DataView | TypedArray) {
        this._byteOffset = newDataView.byteOffset;
        this._buffer = newDataView.buffer as ArrayBuffer;
        this._dataView = new DataView(this._buffer, this._byteOffset);
        this._byteLength = this._byteOffset + newDataView.byteLength;
    }
    public bigEndian(): this {
        this.endianness = DataStream.BIG_ENDIAN;
        return this;
    }
    public littleEndian(): this {
        this.endianness = DataStream.LITTLE_ENDIAN;
        return this;
    }
    private _realloc(bytesNeededForOperation: number): void {
        const currentStreamPosRelativeToView = this.position;
        const requiredEffectivePos = currentStreamPosRelativeToView + bytesNeededForOperation;
        if (!this._dynamicSize) {
            if (requiredEffectivePos > this.byteLength) {
                throw new Error("DataStream buffer overflow: dynamicSize is false and operation exceeds buffer limit.");
            }
            return;
        }
        const requiredTotalAbsoluteOffset = this._byteOffset + requiredEffectivePos;
        if (requiredTotalAbsoluteOffset <= this._buffer.byteLength) {
            if (requiredTotalAbsoluteOffset > this._byteLength) {
                this._byteLength = requiredTotalAbsoluteOffset;
            }
            this._dataView = new DataView(this._buffer, this._byteOffset, this._byteLength - this._byteOffset);
            return;
        }
        let newCapacity = this._buffer.byteLength < 1 ? 1 : this._buffer.byteLength;
        while (requiredTotalAbsoluteOffset > newCapacity) {
            newCapacity *= 2;
        }
        const newBuffer = new ArrayBuffer(newCapacity);
        const oldUint8Array = new Uint8Array(this._buffer, 0, this._byteLength);
        const newUint8Array = new Uint8Array(newBuffer);
        newUint8Array.set(oldUint8Array);
        this._buffer = newBuffer;
        this._byteLength = requiredTotalAbsoluteOffset;
        this._dataView = new DataView(this._buffer, this._byteOffset, this._byteLength - this._byteOffset);
    }
    private _trimAlloc(): void {
        const viewLength = this.byteLength;
        if (this._byteOffset === 0 && this._buffer.byteLength === viewLength) {
            return;
        }
        const newBuffer = new ArrayBuffer(viewLength);
        const newUint8Array = new Uint8Array(newBuffer);
        const oldUint8Array = new Uint8Array(this._buffer, this._byteOffset, viewLength);
        newUint8Array.set(oldUint8Array);
        this._buffer = newBuffer;
        this._byteOffset = 0;
        this._byteLength = viewLength;
        this._dataView = new DataView(this._buffer, 0, this._byteLength);
    }
    public seek(offset: number): void {
        const newPosition = Math.max(0, Math.min(offset, this.byteLength));
        this.position = isNaN(newPosition) || !isFinite(newPosition) ? 0 : newPosition;
    }
    public isEof(): boolean {
        return this.position >= this.byteLength;
    }
    public readInt8(): number {
        const value = this._dataView.getInt8(this.position);
        this.position += 1;
        return value;
    }
    public readUint8(): number {
        const value = this._dataView.getUint8(this.position);
        this.position += 1;
        return value;
    }
    public readInt16(endianness?: boolean): number {
        const value = this._dataView.getInt16(this.position, endianness ?? this.endianness);
        this.position += 2;
        return value;
    }
    public readUint16(endianness?: boolean): number {
        const value = this._dataView.getUint16(this.position, endianness ?? this.endianness);
        this.position += 2;
        return value;
    }
    public readInt32(endianness?: boolean): number {
        const value = this._dataView.getInt32(this.position, endianness ?? this.endianness);
        this.position += 4;
        return value;
    }
    public readUint32(endianness?: boolean): number {
        const value = this._dataView.getUint32(this.position, endianness ?? this.endianness);
        this.position += 4;
        return value;
    }
    public readFloat32(endianness?: boolean): number {
        const value = this._dataView.getFloat32(this.position, endianness ?? this.endianness);
        this.position += 4;
        return value;
    }
    public readFloat64(endianness?: boolean): number {
        const value = this._dataView.getFloat64(this.position, endianness ?? this.endianness);
        this.position += 8;
        return value;
    }
    public writeInt8(value: number): void {
        this._realloc(1);
        this._dataView.setInt8(this.position, value);
        this.position += 1;
    }
    public writeUint8(value: number): void {
        this._realloc(1);
        this._dataView.setUint8(this.position, value);
        this.position += 1;
    }
    public writeInt16(value: number, endianness?: boolean): void {
        this._realloc(2);
        this._dataView.setInt16(this.position, value, endianness ?? this.endianness);
        this.position += 2;
    }
    public writeUint16(value: number, endianness?: boolean): void {
        this._realloc(2);
        this._dataView.setUint16(this.position, value, endianness ?? this.endianness);
        this.position += 2;
    }
    public writeInt32(value: number, endianness?: boolean): void {
        this._realloc(4);
        this._dataView.setInt32(this.position, value, endianness ?? this.endianness);
        this.position += 4;
    }
    public writeUint32(value: number, endianness?: boolean): void {
        this._realloc(4);
        this._dataView.setUint32(this.position, value, endianness ?? this.endianness);
        this.position += 4;
    }
    public writeFloat32(value: number, endianness?: boolean): void {
        this._realloc(4);
        this._dataView.setFloat32(this.position, value, endianness ?? this.endianness);
        this.position += 4;
    }
    public writeFloat64(value: number, endianness?: boolean): void {
        this._realloc(8);
        this._dataView.setFloat64(this.position, value, endianness ?? this.endianness);
        this.position += 8;
    }
    public mapInt32Array(count: number, endianness?: boolean): Int32Array {
        this._realloc(4 * count);
        const result = new Int32Array(this._buffer, this.byteOffset + this.position, count);
        DataStream.arrayToNative(result, endianness ?? this.endianness);
        this.position += 4 * count;
        return result;
    }
    public mapInt16Array(count: number, endianness?: boolean): Int16Array {
        this._realloc(2 * count);
        const result = new Int16Array(this._buffer, this.byteOffset + this.position, count);
        DataStream.arrayToNative(result, endianness ?? this.endianness);
        this.position += 2 * count;
        return result;
    }
    public mapInt8Array(count: number): Int8Array {
        this._realloc(count);
        const result = new Int8Array(this._buffer, this.byteOffset + this.position, count);
        this.position += count;
        return result;
    }
    public mapUint32Array(count: number, endianness?: boolean): Uint32Array {
        this._realloc(4 * count);
        const result = new Uint32Array(this._buffer, this.byteOffset + this.position, count);
        DataStream.arrayToNative(result, endianness ?? this.endianness);
        this.position += 4 * count;
        return result;
    }
    public mapUint16Array(count: number, endianness?: boolean): Uint16Array {
        this._realloc(2 * count);
        const result = new Uint16Array(this._buffer, this.byteOffset + this.position, count);
        DataStream.arrayToNative(result, endianness ?? this.endianness);
        this.position += 2 * count;
        return result;
    }
    public mapUint8Array(count: number): Uint8Array {
        this._realloc(count);
        const result = new Uint8Array(this._buffer, this.byteOffset + this.position, count);
        this.position += count;
        return result;
    }
    public mapFloat64Array(count: number, endianness?: boolean): Float64Array {
        this._realloc(8 * count);
        const result = new Float64Array(this._buffer, this.byteOffset + this.position, count);
        DataStream.arrayToNative(result, endianness ?? this.endianness);
        this.position += 8 * count;
        return result;
    }
    public mapFloat32Array(count: number, endianness?: boolean): Float32Array {
        this._realloc(4 * count);
        const result = new Float32Array(this._buffer, this.byteOffset + this.position, count);
        DataStream.arrayToNative(result, endianness ?? this.endianness);
        this.position += 4 * count;
        return result;
    }
    public readInt32Array(count?: number, endianness?: boolean): Int32Array {
        const actualCount = count === undefined ? this.byteLength - this.position / 4 : count;
        const result = new Int32Array(actualCount);
        DataStream.memcpy(result.buffer, 0, this.buffer, this.byteOffset + this.position, actualCount * result.BYTES_PER_ELEMENT);
        DataStream.arrayToNative(result, endianness ?? this.endianness);
        this.position += result.byteLength;
        return result;
    }
    public readInt16Array(count?: number, endianness?: boolean): Int16Array {
        const actualCount = count === undefined ? this.byteLength - this.position / 2 : count;
        const result = new Int16Array(actualCount);
        DataStream.memcpy(result.buffer, 0, this.buffer, this.byteOffset + this.position, actualCount * result.BYTES_PER_ELEMENT);
        DataStream.arrayToNative(result, endianness ?? this.endianness);
        this.position += result.byteLength;
        return result;
    }
    public readInt8Array(count?: number): Int8Array {
        const actualCount = count === undefined ? this.byteLength - this.position : count;
        const result = new Int8Array(actualCount);
        DataStream.memcpy(result.buffer, 0, this.buffer, this.byteOffset + this.position, actualCount * result.BYTES_PER_ELEMENT);
        this.position += result.byteLength;
        return result;
    }
    public readUint32Array(count?: number, endianness?: boolean): Uint32Array {
        const actualCount = count === undefined ? this.byteLength - this.position / 4 : count;
        const result = new Uint32Array(actualCount);
        DataStream.memcpy(result.buffer, 0, this.buffer, this.byteOffset + this.position, actualCount * result.BYTES_PER_ELEMENT);
        DataStream.arrayToNative(result, endianness ?? this.endianness);
        this.position += result.byteLength;
        return result;
    }
    public readUint16Array(count?: number, endianness?: boolean): Uint16Array {
        const actualCount = count === undefined ? this.byteLength - this.position / 2 : count;
        const result = new Uint16Array(actualCount);
        DataStream.memcpy(result.buffer, 0, this.buffer, this.byteOffset + this.position, actualCount * result.BYTES_PER_ELEMENT);
        DataStream.arrayToNative(result, endianness ?? this.endianness);
        this.position += result.byteLength;
        return result;
    }
    public readUint8Array(count?: number): Uint8Array {
        const actualCount = count === undefined ? this.byteLength - this.position : count;
        const result = new Uint8Array(actualCount);
        DataStream.memcpy(result.buffer, 0, this.buffer, this.byteOffset + this.position, actualCount * result.BYTES_PER_ELEMENT);
        this.position += result.byteLength;
        return result;
    }
    public readFloat64Array(count?: number, endianness?: boolean): Float64Array {
        const actualCount = count === undefined ? this.byteLength - this.position / 8 : count;
        const result = new Float64Array(actualCount);
        DataStream.memcpy(result.buffer, 0, this.buffer, this.byteOffset + this.position, actualCount * result.BYTES_PER_ELEMENT);
        DataStream.arrayToNative(result, endianness ?? this.endianness);
        this.position += result.byteLength;
        return result;
    }
    public readFloat32Array(count?: number, endianness?: boolean): Float32Array {
        const actualCount = count === undefined ? this.byteLength - this.position / 4 : count;
        const result = new Float32Array(actualCount);
        DataStream.memcpy(result.buffer, 0, this.buffer, this.byteOffset + this.position, actualCount * result.BYTES_PER_ELEMENT);
        DataStream.arrayToNative(result, endianness ?? this.endianness);
        this.position += result.byteLength;
        return result;
    }
    public writeUint8Array(array: Uint8Array): void {
        this._realloc(array.length);
        new Uint8Array(this._dataView.buffer, this._dataView.byteOffset + this.position).set(array);
        this.position += array.length;
    }
    public readString(length?: number, encoding?: string): string {
        if (encoding === undefined || encoding === 'ASCII') {
            return DataStream.createStringFromArray(this.mapUint8Array(length === undefined ? this.byteLength - this.position : length));
        }
        else {
            return new TextDecoder(encoding).decode(this.mapUint8Array(length!));
        }
    }
    public writeString(str: string, encoding?: string, fixedLength?: number): this {
        if (encoding === undefined || encoding === 'ASCII') {
            if (fixedLength !== undefined) {
                const actualLength = Math.min(str.length, fixedLength);
                let i = 0;
                for (; i < actualLength; i++) {
                    this.writeUint8(str.charCodeAt(i));
                }
                for (; i < fixedLength; i++) {
                    this.writeUint8(0);
                }
            }
            else {
                for (let i = 0; i < str.length; i++) {
                    this.writeUint8(str.charCodeAt(i));
                }
            }
        }
        else {
            this.writeUint8Array(new TextEncoder().encode(str.substring(0, fixedLength)));
        }
        return this;
    }
    public readCString(maxLength?: number): string {
        const remainingBytes = this.byteLength - this.position;
        const buffer = new Uint8Array(this._buffer, this._byteOffset + this.position);
        let searchLength = remainingBytes;
        if (maxLength !== undefined) {
            searchLength = Math.min(maxLength, remainingBytes);
        }
        let nullIndex = 0;
        while (nullIndex < searchLength && buffer[nullIndex] !== 0) {
            nullIndex++;
        }
        const result = DataStream.createStringFromArray(this.mapUint8Array(nullIndex));
        if (maxLength !== undefined) {
            this.position += searchLength - nullIndex;
        }
        else if (nullIndex !== remainingBytes) {
            this.position += 1;
        }
        return result;
    }
    public writeCString(str: string): void {
        for (let i = 0; i < str.length; i++) {
            this.writeUint8(str.charCodeAt(i) & 0xFF);
        }
        this.writeUint8(0);
    }
    public readUCS2String(length: number, endianness?: boolean): string {
        return DataStream.createStringFromArray(this.readUint16Array(length, endianness));
    }
    public writeUCS2String(str: string, endianness?: boolean, fixedLength?: number): this {
        const actualLength = fixedLength ?? str.length;
        let i = 0;
        for (; i < str.length && i < actualLength; i++) {
            this.writeUint16(str.charCodeAt(i), endianness);
        }
        for (; i < actualLength; i++) {
            this.writeUint16(0);
        }
        return this;
    }
    public writeUtf8WithLen(str: string): this {
        const encoded = new TextEncoder().encode(str);
        this.writeUint16(encoded.length);
        this.writeUint8Array(encoded);
        return this;
    }
    public readUtf8WithLen(): string {
        const length = this.readUint16();
        return new TextDecoder().decode(this.mapUint8Array(length));
    }
    public toUint8Array(): Uint8Array {
        this._trimAlloc();
        return new Uint8Array(this._dataView.buffer, this._dataView.byteOffset, this._dataView.byteLength);
    }
    public getBytes(): Uint8Array {
        return this.toUint8Array();
    }
    public static memcpy(dst: ArrayBuffer, dstOffset: number, src: ArrayBuffer, srcOffset: number, byteLength: number): void {
        if (byteLength === 0)
            return;
        const dstU8 = new Uint8Array(dst, dstOffset, byteLength);
        const srcU8 = new Uint8Array(src, srcOffset, byteLength);
        dstU8.set(srcU8);
    }
    public static flipArrayEndianness(array: TypedArray): TypedArray {
        const bytesPerElement = array.BYTES_PER_ELEMENT;
        if (bytesPerElement === 1)
            return array;
        const r = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
        for (let a = 0; a < array.byteLength; a += array.BYTES_PER_ELEMENT) {
            for (let e = a + array.BYTES_PER_ELEMENT - 1, t = a; e > t; e--, t++) {
                const s = r[t];
                r[t] = r[e];
                r[e] = s;
            }
        }
        return array;
    }
    public static arrayToNative(array: TypedArray, endianness: boolean): TypedArray {
        return endianness === this.endianness ? array : this.flipArrayEndianness(array);
    }
    public static nativeToEndian(array: TypedArray, endianness: boolean): TypedArray {
        return this.endianness === endianness ? array : this.flipArrayEndianness(array);
    }
    public static createStringFromArray(array: Uint8Array | Uint16Array): string {
        const chunks: string[] = [];
        for (let i = 0; i < array.length; i += 32768) {
            chunks.push(String.fromCharCode.apply(undefined, Array.from(array.subarray(i, i + 32768))));
        }
        return chunks.join("");
    }
}
