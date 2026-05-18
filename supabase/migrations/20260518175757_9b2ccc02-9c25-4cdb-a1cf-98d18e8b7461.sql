UPDATE public.email_templates
SET
  subject = 'Welkom bij het Bureau Vlieland Partner Portaal — stel je wachtwoord in',
  body_html = $body$<h2 style="color:#0F4C5C;margin:0 0 20px;font-size:20px;">Beste {{partner_name}},</h2>

<p style="margin:0 0 18px;color:#374151;">
  We zijn verheugd je te verwelkomen bij het nieuwe <strong>Bureau Vlieland Partner Portaal</strong>.
  Dit digitale platform is ontwikkeld om onze jarenlange samenwerking nog efficiënter en transparanter te maken.
</p>

<p style="margin:0 0 25px;color:#374151;">
  Het portaal is een evolutie van hoe we samenwerken — geen vervanging van de persoonlijke relatie die we waarderen,
  maar een aanvulling die het administratieve werk verlicht en de communicatie verbetert. In principe brengen we vraag en aanbod bij elkaar voor groepen.
</p>

<div style="background:#f0f4ff;border:2px solid #0F4C5C;border-radius:8px;padding:25px;margin:0 0 25px;">
  <h3 style="color:#0F4C5C;margin:0 0 15px;font-size:17px;">🔑 Account activeren</h3>
  <table style="width:100%;border-collapse:collapse;">
    <tr>
      <td style="padding:8px 0;color:#6b7280;font-size:14px;width:120px;">E-mailadres:</td>
      <td style="padding:8px 0;color:#0F4C5C;font-weight:600;font-size:14px;">{{partner_email}}</td>
    </tr>
  </table>
  <div style="text-align:center;margin:20px 0 5px;">
    <a href="{{set_password_link}}" style="background:#0F4C5C;color:#ffffff;padding:16px 36px;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;display:inline-block;">Wachtwoord instellen &amp; inloggen</a>
  </div>
  <p style="margin:15px 0 0;color:#6b7280;font-size:12px;text-align:center;">
    Werkt de knop niet? Kopieer deze link in je browser:<br>
    <span style="word-break:break-all;color:#0F4C5C;">{{set_password_link}}</span>
  </p>
</div>

<div style="background:#e8f0f8;border-radius:8px;padding:25px;margin:0 0 25px;">
  <h3 style="color:#0F4C5C;margin:0 0 15px;font-size:17px;">📋 Hoe werkt het?</h3>
  <p style="margin:0 0 12px;color:#374151;font-size:14px;">
    <strong>1. Klanten stellen hun programma samen</strong><br>
    Via onze online configurator kiezen gasten activiteiten, catering en logies voor hun verblijf op Vlieland.
  </p>
  <p style="margin:0 0 12px;color:#374151;font-size:14px;">
    <strong>2. Je ontvangt automatisch een aanvraag</strong><br>
    Wanneer een klant jouw diensten selecteert, krijg je direct bericht met alle relevante details: datum, tijd, aantal personen en speciale wensen.
  </p>
  <p style="margin:0;color:#374151;font-size:14px;">
    <strong>3. Je reageert via het portaal</strong><br>
    Met één klik bevestig je de aanvraag, stel je een alternatief voor, of geef je aan dat je niet beschikbaar bent.
  </p>
</div>

<div style="background:#e8f0f8;border-radius:8px;padding:20px 25px;margin:0 0 25px;">
  <p style="margin:0;color:#374151;font-size:14px;">
    <strong>💡 Goed om te weten:</strong> Naast programma's die klanten zelf samenstellen, gebruiken wij het portaal
    ook voor maatwerk programma's die we op verzoek van de klant uitwerken. Wij verwerken jouw aanbod dan in programma's, stellen dat voor aan de klant en als ze interesse hebben starten we de aanvraag richting jou. De werkwijze voor aanvragen en facturatie blijft hetzelfde.
  </p>
</div>

<div style="background:#fef9e7;border-left:4px solid #f59e0b;padding:20px 25px;margin:0 0 25px;border-radius:0 8px 8px 0;">
  <h3 style="color:#92400e;margin:0 0 12px;font-size:16px;">💼 Facturatie &amp; Commissie</h3>
  <p style="margin:0 0 12px;color:#374151;font-size:14px;">
    Bureau Vlieland verzorgt <strong>centraal de facturatie aan de klant</strong>. Jij stuurt jouw factuur (voor de geoffreerde prijs) naar <a href="mailto:facturatie@bureauvlieland.nl">facturatie@bureauvlieland.nl</a> — niet rechtstreeks naar de klant. Bureau Vlieland brengt vervolgens commissie in rekening over de gerealiseerde omzet:
  </p>
  <ul style="margin:0;padding-left:20px;color:#374151;font-size:14px;">
    <li style="margin-bottom:6px;"><strong>Activiteiten/catering:</strong> {{commission_activity}}% commissie (excl. BTW)</li>
    <li><strong>Logies:</strong> {{commission_accommodation}}% commissie (excl. BTW)</li>
  </ul>
  <p style="margin:12px 0 0;color:#6b7280;font-size:13px;font-style:italic;">
    Deze commissie dekt de acquisitie, coördinatie en klantenservice die Bureau Vlieland voor jou verzorgt.
  </p>
</div>

<p style="color:#374151;font-size:13px;text-align:center;margin:0 0 25px;">
  Je vindt het portaal op:<br>
  <a href="{{partner_portal_link}}" style="color:#0F4C5C;">{{partner_portal_link}}</a>
</p>

<hr style="border:none;border-top:1px solid #e5e7eb;margin:25px 0;">

<p style="margin:0 0 15px;color:#374151;">
  Dit is het eerste jaar dat we met dit nieuwe systeem werken. Jouw feedback is daarom bijzonder waardevol.
  Heb je vragen, opmerkingen of suggesties? Laat het ons weten — we ontwikkelen dit platform samen.
</p>

<p style="margin:16px 0 0;color:#374151;">Met vriendelijke groet,<br><strong style="color:#0F4C5C;">Erwin Soolsma</strong></p>$body$,
  updated_at = now()
WHERE id = 'partner_invitation';