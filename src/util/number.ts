export function int32ToFloat32(value: number): number {
    const buffer = new DataView(new ArrayBuffer(4));
    buffer.setInt32(0, value);
    return buffer.getFloat32(0);
}
