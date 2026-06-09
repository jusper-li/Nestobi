/// <reference types="vite/client" />

declare interface BarcodeDetectorOptions {
  formats?: string[];
}

declare interface BarcodeDetectorResult {
  rawValue: string;
}

declare class BarcodeDetector {
  constructor(options?: BarcodeDetectorOptions);
  detect(image: ImageBitmapSource): Promise<BarcodeDetectorResult[]>;
}
