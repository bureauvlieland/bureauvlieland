UPDATE email_templates 
SET body_html = '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color: #16a34a; padding: 30px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">Bureau Vlieland</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Goed nieuws!</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h2 style="color: #16a34a; margin-top: 0;">Uw offerte is geaccepteerd!</h2>
              
              <p style="color: #4a5568; font-size: 16px; line-height: 1.6;">
                Uw offerte voor <strong>{{accommodation_name}}</strong> is geaccepteerd door Bureau Vlieland.
              </p>
              
              <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #22c55e;">
                <h3 style="margin-top: 0; color: #166534;">Gastgegevens</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr><td style="padding: 5px 0; color: #666;">Gast:</td><td style="padding: 5px 0;"><strong>{{guest_name}}</strong></td></tr>
                  <tr><td style="padding: 5px 0; color: #666;">Aankomst:</td><td style="padding: 5px 0;"><strong>{{arrival_date}}</strong></td></tr>
                  <tr><td style="padding: 5px 0; color: #666;">Vertrek:</td><td style="padding: 5px 0;"><strong>{{departure_date}}</strong></td></tr>
                  <tr><td style="padding: 5px 0; color: #666;">Aantal gasten:</td><td style="padding: 5px 0;"><strong>{{number_of_guests}}</strong></td></tr>
                  <tr><td style="padding: 5px 0; color: #666;">Totaalprijs:</td><td style="padding: 5px 0;"><strong style="font-size: 18px; color: #16a34a;">{{price_total}}</strong></td></tr>
                </table>
              </div>
              
              <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #2d3748;">Facturatie</h3>
                <p style="color: #4a5568; margin: 0 0 10px 0;">Factureer het verblijf aan <strong>Bureau Vlieland</strong>. U ontvangt hierover apart bericht via het partnerportaal.</p>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr><td style="padding: 5px 0; color: #666;">Email:</td><td style="padding: 5px 0;"><a href="mailto:hallo@bureauvlieland.nl" style="color: #0066cc;">hallo@bureauvlieland.nl</a></td></tr>
                  <tr><td style="padding: 5px 0; color: #666;">Telefoon:</td><td style="padding: 5px 0;"><a href="tel:0562700208" style="color: #0066cc;">0562 700 208</a></td></tr>
                </table>
              </div>
              
              <p style="color: #4a5568; font-size: 16px; line-height: 1.6;">
                Bureau Vlieland neemt contact met u op over de verdere afhandeling.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{partner_portal_link}}" style="display: inline-block; padding: 14px 32px; background-color: #1a365d; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 6px;">
                  Open Partner Portal →
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f7fafc; padding: 20px 40px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; color: #a0aec0; font-size: 12px; text-align: center;">
                © 2026 Bureau Vlieland
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
subject = 'Logiesofferte geaccepteerd — {{accommodation_name}}',
updated_at = now()
WHERE id = 'accommodation_selected_partner';