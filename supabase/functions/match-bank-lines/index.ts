import { createClient } from 'npm:@supabase/supabase-js@2';
import { decideMatch, suggestionsForLine, type MatchCandidates } from '../_shared/bankMatching.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Openstaande kandidaten: verkoop- en commissiefacturen (inkomend),
    // betaalbatches en inkoopfacturen (uitgaand). De matchregels zelf staan
    // in _shared/bankMatching.ts.
    const { data: salesInvoices, error: salesErr } = await supabase
      .from('bureau_invoices')
      .select('id, invoice_number, amount_incl_vat, customer_name, paid_at')
      .is('bank_line_id', null);
    if (salesErr) throw new Error(`Verkoopfacturen laden mislukt: ${salesErr.message}`);
    const { data: commissionInvoices, error: commissionErr } = await supabase
      .from('commission_invoices')
      .select('id, invoice_number, amount_incl_vat, status, credits_invoice_id')
      .is('bank_line_id', null)
      .is('credits_invoice_id', null)
      .in('status', ['sent', 'forwarded']);
    if (commissionErr) throw new Error(`Commissiefacturen laden mislukt: ${commissionErr.message}`);
    const { data: purchaseInvoices, error: purchaseErr } = await supabase
      .from('partner_purchase_invoices')
      .select('id, invoice_number, amount_incl_vat, partner_id, status')
      .is('bank_line_id', null)
      .neq('status', 'paid');
    if (purchaseErr) throw new Error(`Inkoopfacturen laden mislukt: ${purchaseErr.message}`);
    const { data: batches, error: batchErr } = await supabase
      .from('payment_batches')
      .select('id, batch_reference, total_amount, status')
      .is('bank_line_id', null);
    if (batchErr) throw new Error(`Betaalbatches laden mislukt: ${batchErr.message}`);

    const candidates: MatchCandidates = {
      sales: (salesInvoices ?? []).map((inv) => ({ type: 'sales', id: inv.id, reference: inv.invoice_number, amount: inv.amount_incl_vat })),
      commission: (commissionInvoices ?? []).map((inv) => ({ type: 'commission', id: inv.id, reference: inv.invoice_number, amount: inv.amount_incl_vat })),
      purchase: (purchaseInvoices ?? []).map((inv) => ({ type: 'purchase', id: inv.id, reference: inv.invoice_number, amount: inv.amount_incl_vat })),
      batch: (batches ?? []).map((b) => ({ type: 'batch', id: b.id, reference: b.batch_reference, amount: b.total_amount })),
    };

    let matchedCount = 0;

    for (const line of lines) {
      const suggestions = suggestionsForLine(line, candidates);
      const decision = decideMatch(suggestions);
      if (decision.automatic) matchedCount++;

      const { error: updErr } = await supabase
        .from('bank_statement_lines')
        .update({
          status: decision.status,
          matched_invoice_type: decision.matchedType,
          matched_invoice_id: decision.matchedId,
          confidence: decision.confidence,
          suggestions: suggestions.slice(0, 5),
        })
        .eq('id', line.id);
      if (updErr) throw new Error(`Regel bijwerken mislukt: ${updErr.message}`);
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
