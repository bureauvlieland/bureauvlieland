import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { XMLParser } from 'npm:fast-xml-parser@4';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { file_path } = await req.json();
    if (!file_path || typeof file_path !== 'string') {
      return new Response(JSON.stringify({ error: 'file_path required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Verify caller is admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: userData } = await supabase.auth.getUser(token);
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data: roleData } = await supabase
      .from('user_roles').select('role')
      .eq('user_id', userData.user.id).eq('role', 'admin').maybeSingle();
    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Download file
    const { data: blob, error: dlErr } = await supabase.storage
      .from('bank-statements').download(file_path);
    if (dlErr || !blob) throw new Error(dlErr?.message || 'Download failed');

    const xml = await blob.text();
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      removeNSPrefix: true,
    });
    const parsed = parser.parse(xml);

    // CAMT.053: Document > BkToCstmrStmt > Stmt (kan array zijn)
    const doc = parsed?.Document?.BkToCstmrStmt;
    if (!doc) throw new Error('Geen geldig CAMT.053 bestand');
    const stmts = Array.isArray(doc.Stmt) ? doc.Stmt : [doc.Stmt];

    const createdStatements: string[] = [];

    for (const stmt of stmts) {
      const iban = stmt?.Acct?.Id?.IBAN ?? null;
      const accountName = stmt?.Acct?.Ownr?.Nm ?? null;
      const currency = stmt?.Acct?.Ccy ?? 'EUR';
      const messageId = stmt?.Id ?? null;
      const stmtDate = stmt?.CreDtTm?.slice(0, 10) ?? null;

      // Balances: pick OPBD/CLBD
      const bals = Array.isArray(stmt?.Bal) ? stmt.Bal : (stmt?.Bal ? [stmt.Bal] : []);
      const findBal = (code: string) => {
        const b = bals.find((x: any) => x?.Tp?.CdOrPrtry?.Cd === code);
        if (!b) return null;
        const amt = parseFloat(b?.Amt?.['#text'] ?? b?.Amt ?? 0);
        const sign = b?.CdtDbtInd === 'DBIT' ? -1 : 1;
        return amt * sign;
      };
      const opening = findBal('OPBD') ?? findBal('PRCD');
      const closing = findBal('CLBD');

      const entries = stmt?.Ntry
        ? (Array.isArray(stmt.Ntry) ? stmt.Ntry : [stmt.Ntry])
        : [];

      // Insert statement header
      const { data: stmtRow, error: stmtErr } = await supabase
        .from('bank_statements')
        .insert({
          file_path,
          file_name: file_path.split('/').pop() ?? null,
          iban,
          account_name: accountName,
          currency,
          statement_date: stmtDate,
          opening_balance: opening,
          closing_balance: closing,
          raw_message_id: messageId,
          uploaded_by: userData.user.id,
          line_count: entries.length,
        })
        .select('id')
        .single();
      if (stmtErr) throw stmtErr;

      // Insert lines
      const lines = entries.map((e: any) => {
        const amount = parseFloat(e?.Amt?.['#text'] ?? e?.Amt ?? 0);
        const direction = e?.CdtDbtInd === 'DBIT' ? 'out' : 'in';
        const signed = direction === 'out' ? -Math.abs(amount) : Math.abs(amount);
        const bookingDate = e?.BookgDt?.Dt ?? null;
        const valueDate = e?.ValDt?.Dt ?? null;

        // Entry details (can be nested under NtryDtls > TxDtls)
        const txd = e?.NtryDtls?.TxDtls ?? {};
        const td = Array.isArray(txd) ? txd[0] : txd;

        const relatedParties = td?.RltdPties ?? {};
        const counterparty = direction === 'in'
          ? (relatedParties?.Dbtr?.Nm ?? null)
          : (relatedParties?.Cdtr?.Nm ?? null);
        const counterpartyIban = direction === 'in'
          ? (relatedParties?.DbtrAcct?.Id?.IBAN ?? null)
          : (relatedParties?.CdtrAcct?.Id?.IBAN ?? null);
        const endToEnd = td?.Refs?.EndToEndId ?? null;

        // Remittance: Ustrd kan string of array zijn
        let remittance: string | null = null;
        const ustrd = td?.RmtInf?.Ustrd;
        if (ustrd) {
          remittance = Array.isArray(ustrd) ? ustrd.join(' ') : String(ustrd);
        }
        const addtlInfo = e?.AddtlNtryInf ?? null;
        const description = [remittance, addtlInfo].filter(Boolean).join(' | ') || null;

        return {
          statement_id: stmtRow.id,
          booking_date: bookingDate,
          value_date: valueDate,
          amount: signed,
          currency,
          direction,
          counterparty_name: counterparty,
          counterparty_iban: counterpartyIban,
          description,
          end_to_end_id: endToEnd,
          remittance_info: remittance,
        };
      });

      if (lines.length > 0) {
        const { error: linesErr } = await supabase
          .from('bank_statement_lines').insert(lines);
        if (linesErr) throw linesErr;
      }

      // Trigger matching
      try {
        await supabase.functions.invoke('match-bank-lines', {
          body: { statement_id: stmtRow.id },
        });
      } catch (matchErr) {
        console.error('match-bank-lines invoke error:', matchErr);
      }

      createdStatements.push(stmtRow.id);
    }

    return new Response(JSON.stringify({ ok: true, statement_ids: createdStatements }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('parse-bank-statement error:', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
