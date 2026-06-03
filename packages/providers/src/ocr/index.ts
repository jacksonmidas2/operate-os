export interface OCRReceiptFields {
  vendor?: string;
  totalCents?: number;
  date?: Date;
  categoryGuess?: string;
  rawText?: string;
}

export interface OCRProvider {
  readonly name: string;
  extractReceiptFields(args: {
    fileUrl: string;
    contentType: string;
  }): Promise<OCRReceiptFields>;
}

/**
 * Manual OCR — returns empty fields. The receipt is stored but the
 * operator fills in vendor/amount/category by hand. Phase 8 may swap
 * in an AI-based extractor using the AIProvider; Phase 14 can use
 * AWS Textract / Azure Document Intelligence.
 */
export class ManualOCRProvider implements OCRProvider {
  readonly name = "manual-ocr";

  async extractReceiptFields(): Promise<OCRReceiptFields> {
    return {};
  }
}
