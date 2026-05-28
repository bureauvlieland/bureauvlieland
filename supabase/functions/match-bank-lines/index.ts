import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { statement_id } = await req.json();
    if (!statement_id) {
      return new Response(JSON.stringify({ error: 'statement_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: lines, error: linesErr } = await supabase
      .from('bank_statement_lines')
      .select('*')
      .eq('statement_id', statement_id)
      .in('status', ['unmatched', 'suggested', 'ambiguous']);
    if (linesErr) throw linesErr;
    if (!lines || lines.length === 0) {
      return new Response(JSON.stringify({ ok: true, matched: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Preload sales + purchase invoices + payment batches (unpaid)
    const { data: salesInvoices } = await supabase
      .from('bureau_invoices')
      .select('id, invoice_number, amount_incl_vat, customer_name, paid_at')
      .is('bank_line_id', null);
    const { data: purchaseInvoices } = await supabase
      .from('partner_purchase_invoices')
      .select('id, invoice_number, amount_incl_vat, partner_id, status')
      .is('bank_line_id', null)
      .neq('status', 'paid');
    const { data: batches } = await supabase
      .from('payment_batches')
      .select('id, batch_reference, total_amount, status')
      .is('bank_line_id', null);

    let matchedCount = 0;

    for (const line of lines) {
      const desc = `${line.description ?? ''} ${line.end_to_end_id ?? ''} ${line.remittance_info ?? ''}`.toUpperCase();
      const amount = Math.abs(Number(line.amount));
      const suggestions: any[] = [];

      if (line.direction === 'in') {
        for (const inv of salesInvoices ?? []) {
          const num = (inv.invoice_number ?? '').toUpperCase();
          const amtMatch = Math.abs(Number(inv.amount_incl_vat ?? 0) - amount) < 0.01;
          const refMatch = num && desc.includes(num);
          if (refMatch && amtMatch) {
            suggestions.push({ type: 'sales', id: inv.id, label: inv.invoice_number, amount: inv.amount_incl_vat, confidence: 0.98 });
          } else if (refMatch) {
            suggestions.push({ type: 'sales', id: inv.id, label: inv.invoice_number, amount: inv.amount_incl_vat, confidence: 0.7 });
          } else if (amtMatch) {
            suggestions.push({ type: 'sales', id: inv.id, label: inv.invoice_number, amount: inv.amount_incl_vat, confidence: 0.5 });
          }
        }
      } else {
        // Outgoing — first try batches
        for (const b of batches ?? []) {
          const ref = (b.batch_reference ?? '').toUpperCase();
          const amtMatch = Math.abs(Number(b.total_amount ?? 0) - amount) < 0.01;
          const refMatch = ref && desc.includes(ref);
          if (refMatch && amtMatch) {
            suggestions.push({ type: 'batch', id: b.id, label: b.batch_reference, amount: b.total_amount, confidence: 0.98 });
          } else if (refMatch) {
            suggestions.push({ type: 'batch', id: b.id, label: b.batch_reference, amount: b.total_amount, confidence: 0.7 });
          }
        }
        for (const inv of purchaseInvoices ?? []) {
          const num = (inv.invoice_number ?? '').toUpperCase();
          const amtMatch = Math.abs(Number(inv.amount_incl_vat ?? 0) - amount) < 0.01;
          const refMatch = num && desc.includes(num);
          if (refMatch && amtMatch) {
            suggestions.push({ type: 'purchase', id: inv.id, label: inv.invoice_number, amount: inv.amount_incl_vat, confidence: 0.95 });
          } else if (refMatch) {
            suggestions.push({ type: 'purchase', id: inv.id, label: inv.invoice_number, amount: inv.amount_incl_vat, confidence: 0.6 });
          } else if (amtMatch) {
            suggestions.push({ type: 'purchase', id: inv.id, label: inv.invoice_number, amount: inv.amount_incl_vat, confidence: 0.4 });
          }
        }
      }

      suggestions.sort((a, b) => b.confidence - a.confidence);
      const top = suggestions[0];

      let status: string = 'unmatched';
      let matchedType: string | null = null;
      let matchedId: string | null = null;
      let confidence: number | null = null;

      if (top && top.confidence >= 0.95 && suggestions.filter(s => s.confidence >= 0.95).length === 1) {
        status = 'suggested';
        matchedType = top.type;
        matchedId = top.id;
        confidence = top.confidence;
        matchedCount++;
      } else if (suggestions.length > 1) {
        status = 'ambiguous';
      } else if (top) {
        status = 'suggested';
        matchedType = top.type;
        matchedId = top.id;
        confidence = top.confidence;
      }

      await supabase
        .from('bank_statement_lines')
        .update({
          status,
          matched_invoice_type: matchedType,
          matched_invoice_id: matchedId,
          confidence,
          suggestions: suggestions.slice(0, 5),
        })
        .eq('id', line.id);
    }

    await supabase
      .from('bank_statements')
      .update({ matched_count: matchedCount })
      .eq('id', statement_id);

    return new Response(JSON.stringify({ ok: true, matched: matchedCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('match-bank-lines error:', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
