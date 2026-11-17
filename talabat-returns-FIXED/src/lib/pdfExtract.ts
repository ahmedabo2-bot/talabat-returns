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
  const t = text.replace(/[ \t]+/g, ' ').replace(/\r\n/g, '\n')

  return {
    returnNumber:   field(t, /Return\s*Number\s*[:\s]+([A-Z0-9][\w-]+)/i)
                 || field(t, /PO\s*Reference\s*[:\s]+([A-Z0-9][\w-]+)/i),
    supplierName:   field(t, /Supplier\s*[:\s]+([^\n,]+)/i),
    supplierAddress:field(t, /Supplier\s*[:\s]+[^\n,]+,\s*([^\n]+)/i),
    storeCode:      field(t, /Store\s*[:\s]+([A-Z]{2}_[A-Za-z0-9_ ()]+?)(?:,|\s*\n)/i)
                    ?.replace(/\s+/g, '_').replace(/[()]/g, '').toUpperCase(),
    productName:    field(t, /Product\s*[:\s]+([^\n]+)/i),
    skuCode:        field(t, /\bSKU\s*[:\s]+(\w+)/i),
    barcode:        field(t, /Barcode\s*[:\s]+(\d+)/i),
    returnedQty:    parseInt(field(t, /Returned\s*Qty\s*[:\s]+(\d+)/i) ?? '0') || undefined,
    totalInclVat:   parseFloat(field(t, /Total\s+Incl\.?\s*VAT\s*[:\s]+(?:EGP\s*)?([\d.]+)/i) ?? '0') || undefined,
    amtExclVat:     parseFloat(field(t, /Amt\.?\s*Excl\.?\s*VAT\s*[:\s]+(?:EGP\s*)?([\d.]+)/i) ?? '0') || undefined,
    invoiceRef:     field(t, /Invoice\s*[:\s]+(\w+)/i),
    poReference:    field(t, /PO\s*Reference\s*[:\s]+([A-Z0-9][\w-]+)/i),
    returnDate:     field(t, /Return\s*Requested\s*[:\s]+(\d{1,2}\/\d{1,2}\/\d{4})/i),
  }
}

export async function extractFromPdf(file: File): Promise<ExtractedReturnData> {
  const buffer = await file.arrayBuffer()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfjs = (await import('pdfjs-dist' as string)) as any

  if (pdfjs.GlobalWorkerOptions) {
    pdfjs.GlobalWorkerOptions.workerSrc = ''
  }

  const pdf = await pdfjs.getDocument({ data: buffer, useWorkerFetch: false }).promise

  let text = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    text += content.items.map((item: any) => item.str).join('\n') + '\n'
  }

  return parseReturnSlipText(text)
}
