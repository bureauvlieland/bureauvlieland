export type CommunicationType = 'email_in' | 'email_out' | 'phone' | 'note';
export type CommunicationDirection = 'inbound' | 'outbound' | 'internal';
export type CommunicationSource = 'manual' | 'email_log';

export interface ProjectCommunication {
  id: string;
  request_id: string | null;
  accommodation_id: string | null;
  communication_type: CommunicationType;
  direction: CommunicationDirection;
  subject: string | null;
  content: string;
  contact_name: string | null;
  contact_email: string | null;
  logged_by: string | null;
  logged_at: string;
  communication_date: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  source?: CommunicationSource;
  email_type?: string;
}

export const COMMUNICATION_TYPE_OPTIONS = [
  { value: 'email_in', label: 'Inkomende email', icon: 'mail' },
  { value: 'email_out', label: 'Uitgaande email', icon: 'send' },
  { value: 'phone', label: 'Telefoongesprek', icon: 'phone' },
  { value: 'note', label: 'Notitie', icon: 'file-text' },
] as const;

export const COMMUNICATION_TYPE_CONFIG: Record<CommunicationType, { 
  label: string; 
  icon: string;
  color: string;
}> = {
  email_in: { label: 'Inkomende email', icon: 'mail', color: 'text-blue-600' },
  email_out: { label: 'Uitgaande email', icon: 'send', color: 'text-green-600' },
  phone: { label: 'Telefoongesprek', icon: 'phone', color: 'text-amber-600' },
  note: { label: 'Notitie', icon: 'file-text', color: 'text-slate-600' },
};

export const EMAIL_TYPE_LABELS: Record<string, string> = {
  partner_quote_request: 'Offerteaanvraag partner',
  partner_reminder: 'Herinnering partner',
  customer_confirmation: 'Bevestiging klant',
  customer_quote: 'Offerte klant',
  customer_program: 'Programma klant',
  partner_notification: 'Melding partner',
  accommodation_quote_request: 'Logies offerteaanvraag',
  accommodation_selected: 'Logies geselecteerd',
  customer_accommodation_message: 'Bericht aan klant (logies)',
  partner_accommodation_message: 'Bericht aan partner (logies)',
  admin_notification: 'Admin melding',
  terms_request: 'Voorwaarden verzoek',
  partner_invite: 'Partner uitnodiging',
  proforma_invoice: 'Proforma factuur',
  project_email: 'Project e-mail',
};
