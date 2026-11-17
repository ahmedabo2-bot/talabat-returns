/**
 * PDF text extraction + Talabat return-slip field parser.
 * Uses pdfjs-dist loaded dynamically to avoid SSR issues.
 */

export interface ExtractedReturnData {
  returnNumber?: string
  supplierName?: string
  supplierAddress?: string
  storeCode?: string
  productName?: string
  skuCode?: string
  barcode?: string
  returnedQty?: number
  totalInclVat?: number
  amtExclVat?: number
  invoiceRef?: string
  poReference?: string
  returnDate?: string
}

function field(text: string, pattern: RegExp): string | undefined {
  return text.match(pattern)?.[1]?.trim() || undefined
}

export function parseReturnSlipText(text: string): ExtractedReturnData {
  // Normalise – collapse runs of whitespace but keep newlines
  const t = text.replace(/[ \t]+/g, ' ').replace(/\r\n/g, '\n')

  return {
    // Match "PO3622811-001" style return numbers
    returnNumber:   field(t, /Return\s*Number\s*[:\s]+([A-Z0-9][\w-]+)/i)
                 || field(t, /PO\s*Reference\s*[:\s]+([A-Z0-9][\w-]+)/i)
                 || field(t, /\b(PO\d{7,}-\d{3})\b/),
    supplierName:   field(t, /Supplier(?:\s+Name)?\s*[:\s]+([^\n,]+)/i),
    supplierAddress:field(t, /Supplier(?:\s+Name)?\s*[:\s]+[^\n,]+,\s*([^\n]+)/i),
    // Match "EG_Suez_DS_65" style store codes
    storeCode:      field(t, /Store(?:\s+Information)?\s*[:\s]+([A-Z]{2}_[A-Za-z0-9_ ()]+?)(?:,|\s*\n)/i)
                    ?.replace(/\s+/g, '_').replace(/[()]/g, '').toUpperCase()
                 || field(t, /\b(EG_[A-Za-z0-9_]+)\b/)?.[0],
    productName:    field(t, /Product(?:\s+Description)?\s*[:\s]+([^\n]+)/i),
    skuCode:        field(t, /\bSKU\s*[:\s]+(\w+)/i),
    barcode:        field(t, /Barcode\s*[:\s]+(\d+)/i),
    // Handle both "Returned Qty" and "Rtnd. Qt." formats
    returnedQty:    parseInt(
                      field(t, /R(?:eturned|tnd)\.?\s*Qt(?:y|\.)?\s*[:\s]+(\d+)/i) ??
                      field(t, /Quantity\s*[:\s]+(\d+)/i) ?? '0'
                    ) || undefined,
    totalInclVat:   parseFloat(field(t, /Total\s+Incl\.?\s*VAT\s*[:\s]+(?:EGP\s*)?(\d[\d,.]*)/i)?.replace(/,/g, '') ?? '0') || undefined,
    amtExclVat:     parseFloat(field(t, /(?:Amt|Amount)\.?\s*Excl\.?\s*VAT\s*[:\s]+(?:EGP\s*)?(\d[\d,.]*)/i)?.replace(/,/g, '') ?? '0') || undefined,
    invoiceRef:     field(t, /Invoice\s*[:\s]+(\w+)/i),
    poReference:    field(t, /PO\s*Reference\s*[:\s]+([A-Z0-9][\w-]+)/i),
    returnDate:     field(t, /Return\s*(?:Requested|Date)\s*[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i),
  }
}

export async function extractFromPdf(file: File): Promise<ExtractedReturnData> {
  const buffer = await file.arrayBuffer()

  // Dynamic import keeps pdfjs out of the SSR bundle
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfjs = (await import('pdfjs-dist' as string)) as any

  // Use unpkg CDN worker matching the installed pdfjs-dist version.
  // This avoids CORS and bundling issues that occur with empty workerSrc.
  if (pdfjs.GlobalWorkerOptions) {
    pdfjs.GlobalWorkerOptions.workerSrc =
      `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`
  }

  const pdf = await pdfjs.getDocument({ data: buffer }).promise

  let text = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    text += content.items.map((item: any) => item.str).join('\n') + '\n'
  }

  return parseReturnSlipText(text)
}
