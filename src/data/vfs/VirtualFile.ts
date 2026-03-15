import { DataStream } from '../DataStream'; // Adjusted path based on common structure
import { IOError } from './IOError';

export class VirtualFile {
  public stream: DataStream;
  public filename: string;

  /**
   * Creates a VirtualFile from a browser File object.
   * @param realFile The browser File object.
   * @returns A Promise resolving to a VirtualFile instance.
   * @throws IOError if the file cannot be read.
   */
  public static async fromRealFile(realFile: File): Promise<VirtualFile> {
    try {
      const arrayBuffer = await realFile.arrayBuffer();
      const dataStream = new DataStream(arrayBuffer);
      return new VirtualFile(dataStream, realFile.name);
    } catch (error) {
      if (error instanceof DOMException) {
        throw new IOError(
          `File "${realFile.name}" could not be read (${error.name})`,
          // Consider adding `cause` if error constructor supports it and target env does too
          // { cause: error } 
        );
      }
      throw error; // Re-throw other types of errors
    }
  }

  /**
   * Creates a VirtualFile from a Uint8Array of bytes.
   * @param bytes The binary file data.
   * @param filename The name of the file.
   * @returns A VirtualFile instance.
   */
  public static fromBytes(bytes: ArrayBuffer | ArrayBufferView, filename: string): VirtualFile {
    const view = bytes instanceof ArrayBuffer
      ? new DataView(bytes)
      : new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const dataStream = new DataStream(view); // Pass the DataView directly
    return new VirtualFile(dataStream, filename);
  }

  /**
   * Factory method to create a VirtualFile from a part of an existing DataView or ArrayBuffer.
   * This is useful for creating virtual files that are slices of a larger archive file.
   * @param buffer The source ArrayBuffer or DataView's buffer.
   * @param filename The name for the virtual file.
   * @param byteOffset The offset in the source buffer where this file's data begins.
   * @param byteLength The length of this file's data in bytes.
   * @returns A VirtualFile instance.
   */
  public static factory(
    buffer: ArrayBuffer | ArrayBufferView,
    filename: string,
    byteOffset: number = 0,
    byteLength?: number
  ): VirtualFile {
    let view: DataView;
    if (buffer instanceof ArrayBuffer) {
      view = new DataView(buffer, byteOffset, byteLength);
    } else { // ArrayBufferView (e.g. Uint8Array, DataView itself)
      view = new DataView(buffer.buffer, buffer.byteOffset + byteOffset, byteLength ?? buffer.byteLength - byteOffset);
    }
    const dataStream = new DataStream(view);
    return new VirtualFile(dataStream, filename);
  }

  constructor(stream: DataStream, filename: string) {
    this.stream = stream;
    this.filename = filename;
  }

  /**
   * Reads the entire file content as a string.
   * @param encoding Optional character encoding (e.g., 'utf-8', 'windows-1252'). Defaults to system/browser default.
   * @returns The file content as a string.
   */
  readAsString(encoding?: string): string {
    this.stream.seek(0);
    // Assuming DataStream's readString handles encoding or we use TextDecoder separately
    return this.stream.readString(this.stream.byteLength, encoding);
  }

  /**
   * Gets the raw bytes of the file as a Uint8Array.
   * This returns a view of the underlying DataStream's buffer, not a copy.
   * @returns A Uint8Array representing the file's content.
   */
  getBytes(): Uint8Array {
    // Ensure stream position doesn't affect this; we want the whole buffer part for this file.
    // The DataStream constructor already takes care of byteOffset and byteLength for the view.
    return new Uint8Array(
      this.stream.buffer,
      this.stream.byteOffset,
      this.stream.byteLength,
    );
  }

  /**
   * Gets the size of the file in bytes.
   * @returns The size of the file.
   */
  getSize(): number {
    return this.stream.byteLength;
  }

  /**
   * Converts the VirtualFile to a browser File object.
   * @param mimeType Optional MIME type for the File object.
   * @returns A File object.
   */
  asFile(mimeType?: string): File {
    return new File([this.getBytes()], this.filename, { type: mimeType });
  }
} 
