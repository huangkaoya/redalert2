export class ArchiveExtractionError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ArchiveExtractionError";
  }
} 