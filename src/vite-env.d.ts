/// <reference types="vite/client" />

declare const __APP_VERSION__: string;
declare const __APP_COMMIT_SHA__: string;
declare const __APP_COMMIT_LONG__: string;

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
