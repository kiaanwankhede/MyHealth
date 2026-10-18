import { requireNativeModule } from 'expo';

/** A line of recognised text and its box on the image, in pixels. */
export type OcrLine = { text: string; left: number; top: number; right: number; bottom: number };

type SehatPdfModule = {
  renderPages(uri: string, scale: number, maxPages: number): Promise<string[]>;
  recognizeText(uri: string): Promise<OcrLine[]>;
};

/** Loaded on first use, so a problem here can never stop the app from opening. */
export function sehatPdf(): SehatPdfModule {
  return requireNativeModule<SehatPdfModule>('SehatPdf');
}
