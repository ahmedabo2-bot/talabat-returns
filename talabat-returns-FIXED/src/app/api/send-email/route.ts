import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { returnId, supplierEmail, returnDetails } = body

    if (!returnId || !supplierEmail) {
      return NextResponse.json({ error: 'Missing required fields: returnId, supplierEmail' }, { status: 400 })
    }

    // Log the attempt regardless of outcome
    const { data: logData } = await supabase
      .from('email_log')
      .insert({
        return_id: returnId,
        sent_by: user.id,
        recipient_email: supplierEmail,
        subject: `Return Confirmation - ${returnDetails?.returnNumber ?? returnId.slice(0, 8)}`,
        status: 'pending',
      })
      .select()
      .single()

    // If no Resend key configured, return graceful message
    if (
      !process.env.RESEND_API_KEY ||
      process.env.RESEND_API_KEY === 're_your_api_key_here'
    ) {
      if (logData?.id) {
        await supabase
          .from('email_log')
          .update({ status: 'failed', error_message: 'No email provider configured' })
          .eq('id', logData.id)
      }
      return NextResponse.json(
        {
          success: false,
          message:
            'Email provider not configured. Add RESEND_API_KEY to your environment variables. The return approval has been recorded.',
          logId: logData?.id,
        },
        { status: 200 }
      )
    }

    const resend = new Resend(process.env.RESEND_API_KEY)
    const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'

    const emailHtml = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Return Confirmation</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Inter,system-ui,sans-serif;">
  <div style="max-width:600px;margin:40px auto;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#ff6b2b,#e55520);padding:32px 28px;">
      <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;letter-spacing:-0.3px;">Return Confirmation</h1>
      <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:14px;">Talabat Store Returns Portal</p>
    </div>
    <div style="background:#fff;padding:28px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 16px 16px;">
      <p style="color:#374151;margin:0 0 16px;">Dear Supplier,</p>
      <p style="color:#374151;margin:0 0 20px;">This is to confirm that the following return has been <strong style="color:#059669;">approved</strong> by our area manager:</p>

      <table style="width:100%;border-collapse:collapse;margin:0 0 20px;">
        <tr style="background:#f9fafb;">
          <td style="padding:10px 14px;border:1px solid #e5e7eb;font-weight:600;color:#374151;font-size:14px;width:40%;">Return Number</td>
          <td style="padding:10px 14px;border:1px solid #e5e7eb;color:#1f2937;font-size:14px;font-family:monospace;">${returnDetails?.returnNumber ?? '—'}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;border:1px solid #e5e7eb;font-weight:600;color:#374151;font-size:14px;">Store</td>
          <td style="padding:10px 14px;border:1px solid #e5e7eb;color:#1f2937;font-size:14px;">${returnDetails?.storeName ?? '—'}</td>
        </tr>
        <tr style="background:#f9fafb;">
          <td style="padding:10px 14px;border:1px solid #e5e7eb;font-weight:600;color:#374151;font-size:14px;">Return Date</td>
          <td style="padding:10px 14px;border:1px solid #e5e7eb;color:#1f2937;font-size:14px;">${returnDetails?.returnDate ?? '—'}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;border:1px solid #e5e7eb;font-weight:600;color:#374151;font-size:14px;">Return Reason</td>
          <td style="padding:10px 14px;border:1px solid #e5e7eb;color:#1f2937;font-size:14px;">${returnDetails?.returnReason ?? '—'}</td>
        </tr>
        <tr style="background:#f9fafb;">
          <td style="padding:10px 14px;border:1px solid #e5e7eb;font-weight:600;color:#374151;font-size:14px;">Items Returned</td>
          <td style="padding:10px 14px;border:1px solid #e5e7eb;color:#1f2937;font-size:14px;">${returnDetails?.skuCount ?? 0} SKU(s)</td>
        </tr>
      </table>

      <p style="color:#6b7280;font-size:14px;margin:0 0 24px;">Please process this return at your earliest convenience. The proof of return documents have been verified and recorded in our system.</p>

      <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;padding:12px 16px;margin-bottom:20px;">
        <p style="color:#065f46;font-size:13px;margin:0;font-weight:500;">✅ This return has been officially approved by Talabat's area management team.</p>
      </div>

      <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />
      <p style="color:#9ca3af;font-size:12px;margin:0;">This email was sent automatically from the Talabat Returns Portal. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>`

    const { data: emailResult, error: emailError } = await resend.emails.send({
      from: fromEmail,
      to: [supplierEmail],
      subject: `Return Confirmation — ${returnDetails?.returnNumber ?? returnId.slice(0, 8)} | ${returnDetails?.storeName ?? 'Talabat'}`,
      html: emailHtml,
    })

    if (emailError) {
      if (logData?.id) {
        await supabase
          .from('email_log')
          .update({ status: 'failed', error_message: emailError.message })
          .eq('id', logData.id)
      }
      return NextResponse.json({ success: false, error: emailError.message }, { status: 200 })
    }

    if (logData?.id) {
      await supabase.from('email_log').update({ status: 'sent' }).eq('id', logData.id)
    }

    return NextResponse.json({ success: true, messageId: emailResult?.id })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
