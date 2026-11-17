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

/**
 * Extract supplier name from the two-column header layout.
 *
 * The Talabat return slip has two columns:
 *   Left col:  "Supplier Information:"  →  "Danone EG"  →  address
 *   Right col: "Store Information:"     →  "EG_Suez_DS_65"
 *
 * With pdfjs text extraction these may appear as:
 *   Case A (same line): "Danone EG EG_Suez_DS_65"
 *   Case B (sep lines): "Danone EG\nEG_Suez_DS_65"
 */
function extractSupplierName(text: string): string | undefined {
  // Case A: supplier and store code on same line "Danone EG EG_Suez_DS_65"
  const sameLineMatch = text.match(/^([^\n:]+?)\s+EG_[A-Za-z0-9_ ().-]+/m)
  if (sameLineMatch?.[1]?.trim()) {
    const candidate = sameLineMatch[1].trim()
    if (!/Information|Number|Date|Amount|VAT|Incl|Excl|Return|SKU|Product|Barcode|Invoices?/i.test(candidate)) {
      return candidate
    }
  }

  // Case B: supplier name on the line just before the EG_ store code
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const storeIdx = lines.findIndex(l => /^EG_[A-Za-z0-9]/.test(l))
  if (storeIdx > 0) {
    const prevLine = lines[storeIdx - 1]
    if (!/Information|Number|Date|Amount|VAT|:/i.test(prevLine)) {
      return prevLine
    }
  }

  // Case C: text directly after "Supplier Information:" section header
  const afterHeader = field(text, /Supplier\s+Information\s*:\s*\n([^\n]+)/i)
  if (afterHeader && !/Store/i.test(afterHeader)) return afterHeader

  return undefined
}

/**
 * Extract the store code from the PDF text.
 * Preserves original casing (e.g. "EG_Suez_DS_65") to match DB records.
 */
function extractStoreCode(text: string): string | undefined {
  const afterLabel = field(
    text,
    /Store(?:\s+Information)?\s*[:\s]+\n?\s*(EG_[A-Za-z0-9_ ().-]+?)(?:,|\s*\n|$)/i,
  )
  if (afterLabel) return afterLabel.replace(/\s+/g, '_').replace(/[()]/g, '')

  return text.match(/\b(EG_[A-Za-z0-9_ ().-]+?)(?:\s|,|$|\n)/m)?.[1]?.trim()
}

export function parseReturnSlipText(text: string): ExtractedReturnData {
  const t = text.replace(/[ \t]+/g, ' ').replace(/\r\n/g, '\n')

  return {
    returnNumber:
      (t.match(/\b(PO\d{5,}-\d+)\b/)?.[1])
      || field(t, /Return\s*Number\s*[:\s]*\n\s*([A-Z0-9][\w-]+)/i)
      || field(t, /Return\s*Number\s*:\s*([A-Z0-9]\d[\w-]+)/i),

    supplierName: extractSupplierName(t),

    supplierAddress: field(t, /Supplier(?:\s+Information)?\s*[:\s]+[^\n]+\n([^\n]+(?:St|Rd|Ave|Blvd|Floor)[^\n]*)/i),

    storeCode: extractStoreCode(t),

    productName:  field(t, /Product(?:\s+Description)?\s*[:\s]+([^\n]+)/i),
    skuCode:      field(t, /\bSKU\s*[:\s]+(\w+)/i),
    barcode:      field(t, /Barcode\s*[:\s]+(\d+)/i),

    returnedQty: parseInt(
      field(t, /R(?:eturned|tnd)\.?\s*Qt(?:y|\.)[:\s]+(\d+)/i)
        ?? field(t, /Quantity\s*[:\s]+(\d+)/i)
        ?? '0',
    ) || undefined,

    totalInclVat: parseFloat(
      field(t, /Total\s+(?:Amt\.?\s+)?Incl\.?\s*VAT\s*[:\s]+(?:EGP\s*)?([\d,.]+)/i)?.replace(/,/g, '')
        ?? '0',
    ) || undefined,

    amtExclVat: parseFloat(
      field(t, /(?:Total\s+)?(?:Amt|Amount)\.?\s*Excl\.?\s*VAT\s*[:\s]+(?:EGP\s*)?([\d,.]+)/i)?.replace(/,/g, '')
        ?? '0',
    ) || undefined,

    invoiceRef:   field(t, /Invoice(?:s)?\s*[:\s]+(\w+)/i),
    poReference:  field(t, /PO\s*[Rr]eference\s*[:\s]+([A-Z0-9][\w-]+)/i),
    returnDate:   field(t, /Return\s*(?:Requested|Date)\s*[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i),
  }
}

export async function extractFromPdf(file: File): Promise<ExtractedReturnData> {
  const buffer = await file.arrayBuffer()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfjs = (await import('pdfjs-dist' as string)) as any

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
