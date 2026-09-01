<#
.SYNOPSIS
  Registreert de Mailjet event-webhook van Bureau Vlieland via de Mailjet API.

.DESCRIPTION
  Mailjet stuurt delivery/open/click/bounce-events naar onze edge function.
  Die function eist een token; staat dat token niet in de URL, dan geeft ze
  401 en verdwijnt alle terugkoppeling stilzwijgend (dat gebeurde tussen
  8 juli en 1 september 2026).

  Dit script zet per event-type de juiste callback-URL — inclusief token —
  en ruimt oude/foute registraties op.

.EXAMPLE
  .\mailjet-webhook-setup.ps1 -MailjetApiKey "xxx" -MailjetSecretKey "yyy" -WebhookToken "zzz"

.EXAMPLE
  # Alleen tonen wat er nu geregistreerd staat, niets wijzigen:
  .\mailjet-webhook-setup.ps1 -MailjetApiKey "xxx" -MailjetSecretKey "yyy" -WebhookToken "zzz" -ListOnly
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string] $MailjetApiKey,
    [Parameter(Mandatory = $true)][string] $MailjetSecretKey,
    [Parameter(Mandatory = $true)][string] $WebhookToken,

    [string] $WebhookBaseUrl = "https://blhspuifehausilnzwio.supabase.co/functions/v1/mailjet-event-webhook",

    # Toon alleen de huidige registraties, wijzig niets.
    [switch] $ListOnly,

    # Verwijder registraties die naar een andere URL wijzen (bijv. zonder token).
    [switch] $RemoveStale = $true
)

$ErrorActionPreference = "Stop"

# --- Auth header -----------------------------------------------------------
$pair    = "{0}:{1}" -f $MailjetApiKey, $MailjetSecretKey
$basic   = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($pair))
$headers = @{ Authorization = "Basic $basic"; "Content-Type" = "application/json" }

$apiRoot    = "https://api.mailjet.com/v3/REST/eventcallbackurl"
$targetUrl  = "{0}?token={1}" -f $WebhookBaseUrl, $WebhookToken

# Deze event-types verwerkt onze webhook (zie EVENT_TO_STATUS in de function).
$eventTypes = @("sent", "open", "click", "bounce", "blocked", "spam", "unsub")

function Get-Callbacks {
    (Invoke-RestMethod -Uri $apiRoot -Headers $headers -Method Get).Data
}

Write-Host "Huidige registraties bij Mailjet:" -ForegroundColor Cyan
$existing = Get-Callbacks
if (-not $existing) {
    Write-Host "  (geen)" -ForegroundColor DarkGray
} else {
    foreach ($cb in $existing) {
        $hasToken = if ($cb.Url -like "*token=*") { "met token" } else { "ZONDER TOKEN" }
        $colour   = if ($cb.Url -like "*token=*") { "Green" } else { "Red" }
        Write-Host ("  [{0}] {1,-8} v{2}  {3}  ({4})" -f $cb.ID, $cb.EventType, $cb.Version, $cb.Url, $hasToken) -ForegroundColor $colour
    }
}

if ($ListOnly) {
    Write-Host "`n-ListOnly opgegeven: er is niets gewijzigd." -ForegroundColor Yellow
    return
}

Write-Host "`nDoel-URL: $($targetUrl -replace [regex]::Escape($WebhookToken), '***')" -ForegroundColor Cyan

# --- Opruimen: registraties met een afwijkende URL -------------------------
if ($RemoveStale) {
    foreach ($cb in $existing) {
        if ($cb.Url -ne $targetUrl) {
            Write-Host ("Verwijderen verouderde registratie [{0}] {1}" -f $cb.ID, $cb.EventType) -ForegroundColor Yellow
            Invoke-RestMethod -Uri "$apiRoot/$($cb.ID)" -Headers $headers -Method Delete | Out-Null
        }
    }
    $existing = Get-Callbacks
}

# --- Aanmaken/bijwerken per event-type -------------------------------------
foreach ($type in $eventTypes) {
    $current = $existing | Where-Object { $_.EventType -eq $type }

    if ($current -and $current.Url -eq $targetUrl) {
        Write-Host ("OK      {0,-8} stond al goed" -f $type) -ForegroundColor Green
        continue
    }

    $body = @{
        EventType = $type
        Url       = $targetUrl
        Version   = 2          # groepeert events in een JSON-array
        Status    = "alive"
        IsBackup  = $false
    } | ConvertTo-Json

    if ($current) {
        Invoke-RestMethod -Uri "$apiRoot/$($current.ID)" -Headers $headers -Method Put -Body $body | Out-Null
        Write-Host ("UPDATE  {0,-8} bijgewerkt" -f $type) -ForegroundColor Cyan
    } else {
        Invoke-RestMethod -Uri $apiRoot -Headers $headers -Method Post -Body $body | Out-Null
        Write-Host ("NIEUW   {0,-8} aangemaakt" -f $type) -ForegroundColor Cyan
    }
}

# --- Controle --------------------------------------------------------------
Write-Host "`nEindstand:" -ForegroundColor Cyan
foreach ($cb in Get-Callbacks) {
    Write-Host ("  {0,-8} -> {1}" -f $cb.EventType, ($cb.Url -replace [regex]::Escape($WebhookToken), '***')) -ForegroundColor Green
}

Write-Host "`nControleer nu in de app: Admin > E-mail gezondheid > Webhook-status (knop 'Zelftest')." -ForegroundColor Yellow
