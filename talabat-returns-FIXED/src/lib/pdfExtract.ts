/**
 * PDF text extraction + Talabat return-slip field parser.
 * Uses pdfjs-dist loaded dynamically to avoid SSR issues.
 */

export interface ExtractedSkuItem {
  skuCode: string        // 5-6 digit number (e.g. 910502)
  barcode: string        // 13-digit EAN (e.g. 6223002384051)
  productName: string    // "Danette Cream Caramel, 70g"
  quantity: number       // Rtnd. Qty
  unitCost: number       // Unit Cost per item
  totalAmtExclVat: number
  vatPct: number         // 0.00
  vatAmt: number
  totalAmtInclVat: number
  invoiceRef: string     // Invoice number
}

export interface ExtractedReturnData {
  returnNumber?: string
  supplierName?: string
  supplierAddress?: string
  storeCode?: string
  // Legacy single-item fields (kept for backward compat)
  productName?: string
  skuCode?: string
  barcode?: string
  returnedQty?: number
  totalInclVat?: number
  amtExclVat?: number
  invoiceRef?: string
  poReference?: string
  returnDate?: string
  // New multi-item extraction
  skuItems?: ExtractedSkuItem[]
}

function field(text: string, pattern: RegExp): string | undefined {
  return text.match(pattern)?.[1]?.trim() || undefined
}

/**
 * Extract supplier name from the two-column header layout.
 *
 * The Talabat return slip has two columns:
 *   Left col:  "Supplier Information:"  â  "Danone EG"  â  address
 *   Right col: "Store Information:"     â  "EG_Suez_DS_65"
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
    // Skip header lines or lines that look like labels
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
  // Look for store code after "Store Information:" label
  const afterLabel = field(
    text,
    /Store(?:\s+Information)?\s*[:\s]+\n?\s*(EG_[A-Za-z0-9_ ().-]+?)(?:,|\s*\n|$)/i,
  )
  if (afterLabel) return afterLabel.replace(/\s+/g, '_').replace(/[()]/g, '')

  // Fallback: find first EG_ pattern anywhere in the text
  return text.match(/\b(EG_[A-Za-z0-9_ ().-]+?)(?:\s|,|$|\n)/m)?.[1]?.trim()
}

/**
 * Extract SKU item rows from the return slip table.
 *
 * Table columns: No. | PO reference | SKU | Barcode | Product | Rtnd.Qty |
 *                Unit Cost | Disc.Amt. | Amt.Excl.VAT | VAT% | VAT Amt. | Amt.Incl.VAT | Invoices
 *
 * pdfjs output for a row like: 1 | PO3622811 | 910502 | 6223002384051 | Danette Cream Caramel, 70g | 1 | 11.00 | 11.00 | 11.00 | 0.00% | 0.00 | 11.00 | 8957
 */
function extractSkuItems(text: string): ExtractedSkuItem[] {
  const items: ExtractedSkuItem[] = []

  // Find all 13-digit EAN barcodes â these are anchors for each row
  const barcodeRegex = /\b(\d{13})\b/g
  let barcodeMatch: RegExpExecArray | null

  while ((barcodeMatch = barcodeRegex.exec(text)) !== null) {
    const barcodeIdx = barcodeMatch.index
    const barcode = barcodeMatch[1]

    // Context: 150 chars before and 300 chars after barcode
    const before = text.slice(Math.max(0, barcodeIdx - 150), barcodeIdx)
    const after = text.slice(barcodeIdx + barcode.length, Math.min(text.length, barcodeIdx + barcode.length + 300))

    // ââ SKU code: 5-6 digit number immediately before barcode ââââââââââ
    const skuMatch = before.match(/\b(\d{5,6})\s*[\n ]?$/)
                  || before.match(/\b(\d{5,6})\b(?!.*\d{5,6})/)
    const skuCode = skuMatch?.[1] ?? ''

    // ââ Product name: first segment of text (letters+spaces+commas+parens)
    //    right after the barcode, before we hit a standalone number  ââââââ
    // Strip leading whitespace/newlines
    const afterTrimmed = after.replace(/^[\s\n]+/, '')

    // Match product name: starts with a letter, ends before a standalone decimal or integer
    const productMatch = afterTrimmed.match(/^([A-Za-zØ-Û¿][^0-9\n%]*?)(?=\s+\d|\n\d|\s*\n|\s{2,}\d)/)
    const productName = productMatch?.[1]?.trim() ?? ''

    // ââ Numbers after product name ââââââââââââââââââââââââââââââââââââââââ
    // Order: Qty, UnitCost, DiscAmt, AmtExclVAT, VAT%, VATAmt, AmtInclVAT, Invoice
    const afterProduct = afterTrimmed.slice(productMatch?.[0]?.length ?? 0)
    const numPattern = /(\d+(?:\.\d+)?%?)/g
    const nums: string[] = []
    let nm: RegExpExecArray | null
    while ((nm = numPattern.exec(afterProduct)) !== null) {
      nums.push(nm[1])
      if (nums.length >= 8) break
    }

    // If we got less than 2 numbers but product name had none, the product
    // might have been empty and numbers come right after barcode
    const qty         = nums[0] ? parseInt(nums[0]) || 1 : 1
    const unitCost    = nums[1] ? parseFloat(nums[1]) || 0 : 0
    // nums[2] = Disc.Amt (often same as UnitCost for 100% disc)
    const amtExclVat  = nums[3] ? parseFloat(nums[3]) || 0 : 0
    const vatPct      = nums[4] ? parseFloat(nums[4].replace('%', '')) || 0 : 0
    const vatAmt      = nums[5] ? parseFloat(nums[5]) || 0 : 0
    const amtInclVat  = nums[6] ? parseFloat(nums[6]) || amtExclVat : amtExclVat
    const invoiceRef  = nums[7] ?? ''

    // Guard: skip if we couldn't extract anything meaningful
    if (!skuCode && !productName && qty === 1 && unitCost === 0) continue

    items.push({
      skuCode,
      barcode,
      productName,
      quantity: qty,
      unitCost: unitCost > 0 ? unitCost : amtInclVat,
      totalAmtExclVat: amtExclVat,
      vatPct,
      vatAmt,
      totalAmtInclVat: amtInclVat > 0 ? amtInclVat : amtExclVat,
      invoiceRef,
    })
  }

  return items
}

export function parseReturnSlipText(text: string): ExtractedReturnData {
  // Normalise â collapse runs of whitespace but keep newlines
  const t = text.replace(/[ \t]+/g, ' ').replace(/\r\n/g, '\n')

  // Extract SKU items from table
  const skuItems = extractSkuItems(t)
  const firstItem = skuItems[0]

  return {
    // ââ Return number âââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
    // PDF layout: "Return Number: Return Requested: Completion Date:\nPO3622811-001"
    // The PO number is on the NEXT line, so match the format directly first.
    returnNumber:
      // Direct PO format: PO<digits>-<digits>  e.g. PO3622811-001
      (t.match(/\b(PO\d{5,}-\d+)\b/)?.[1])
      // "Return Number:" followed (possibly on next line) by the number
      || field(t, /Return\s*Number\s*[:\s]*\n\s*([A-Z0-9][\w-]+)/i)
      // Generic fallback  (avoid matching "Return Requested")
      || field(t, /Return\s*Number\s*:\s*([A-Z0-9]\d[\w-]+)/i),

    // ââ Supplier name âââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
    supplierName: extractSupplierName(t),

    // ââ Supplier address ââââââââââââââââââââââââââââââââââââââââââââââââââââââ
    supplierAddress: field(t, /Supplier(?:\s+Information)?\s*[:\s]+[^\n]+\n([^\n]+(?:St|Rd|Ave|Blvd|Floor)[^\n]*)/i),

    // ââ Store code ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
    // Preserve original case to match DB records (EG_Suez_DS_65, not EG_SUEZ_DS_65)
    storeCode: extractStoreCode(t),

    // ââ SKU items (new multi-row extraction) ââââââââââââââââââââââââââââââââââ
    skuItems: skuItems.length > 0 ? skuItems : undefined,

    // ââ Legacy single-item fields (from first extracted row or fallback regex) â
    productName:  firstItem?.productName || field(t, /Product(?:\s+Description)?\s*[:\s]+([^\n]+)/i),
    skuCode:      firstItem?.skuCode     || field(t, /\bSKU\s*[:\s]+(\w+)/i),
    barcode:      firstItem?.barcode     || field(t, /Barcode\s*[:\s]+(\d+)/i),

    // Quantities & amounts from first item or fallback
    returnedQty: firstItem?.quantity || parseInt(
      field(t, /R(?:eturned|tnd)\.?\s*Qt(?:y|\.)\s*[:\s]+(\d+)/i)
        ?? field(t, /Quantity\s*[:\s]+(\d+)/i)
        ?? '0',
    ) || undefined,

    totalInclVat: firstItem?.totalAmtInclVat || parseFloat(
      field(t, /Total\s+(?:Amt\.?\s+)?Incl\.?\s*VAT\s*[:\s]+(?:EGP\s*)?([\d,.]+)/i)?.replace(/,/g, '')
        ?? field(t, /Total\s+Incl\.?\s*VAT\s*[:\s]+(?:EGP\s*)?([\d,.]+)/i)?.replace(/,/g, '')
        ?? '0',
    ) || undefined,

    amtExclVat: firstItem?.totalAmtExclVat || parseFloat(
      field(t, /(?:Total\s+)?(?:Amt|Amount)\.?\s*Excl\.?\s*VAT\s*[:\s]+(?:EGP\s*)?([\d,.]+)/i)?.replace(/,/g, '')
        ?? '0',
    ) || undefined,

    invoiceRef:   firstItem?.invoiceRef  || field(t, /Invoice(?:s)?\s*[:\s]+(\w+)/i),
    poReference:  field(t, /PO\s*[Rr]eference\s*[:\s]+([A-Z0-9][\w-]+)/i),
    returnDate:   field(t, /Return\s*(?:Requested|Date)\s*[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i),
  }
}

export async function extractFromPdf(file: File): Promise<ExtractedReturnData> {
  const buffer = await file.arrayBuffer()

  // Dynamic import keeps pdfjs out of the SSR bundle
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfjs = (await import('pdfjs-dist' as string)) as any

  // Use unpkg CDN worker matching the installed pdfjs-dist version.
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
