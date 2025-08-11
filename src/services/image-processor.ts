export class ImageProcessor {
  validateImage(imageBuffer: Buffer): boolean {
    return imageBuffer.byteLength > 0 && imageBuffer.byteLength < 10 * 1024 * 1024;
  }

  optimizeImage(imageBuffer: Buffer): Buffer {
    return imageBuffer;
  }

  cleanMetadata(imageBuffer: Buffer): Buffer {
    return imageBuffer;
  }

  convertToBase64(imageBuffer: Buffer): string {
    return imageBuffer.toString('base64');
  }
}
