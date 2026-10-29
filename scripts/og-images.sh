#!/usr/bin/env bash
#
# Maakt de deelplaatjes in `public/og/`: het plaatje dat WhatsApp, Facebook,
# LinkedIn en iMessage tonen als iemand een adres van de site deelt (`og:image`).
#
# Waarom aparte bestanden: WhatsApp voert geen JavaScript uit, kent geen webp,
# toont bij een plaatje boven ~300 kB vaak niets en wil het liefst 1200 × 630.
# De hero-foto's in `src/assets` zijn daar te groot voor en krijgen bij het
# bouwen een hash in de naam, dus die zijn niet geschikt als vaste deel-URL.
#
# Gebruik: `bash scripts/og-images.sh` (vereist ImageMagick). De uitkomst
# wordt meegecommit; dit script hoeft alleen opnieuw te draaien als een foto
# wisselt of een pagina erbij komt. Voeg dan hieronder een regel toe en
# verwijs ernaar met `socialImageMeta("/og/<naam>.jpg")` (src/lib/socialImage.tsx).
#
# Per regel: <naam> <bronfoto in src/assets> [zwaartepunt in % van boven, standaard 50]
# Het zwaartepunt telt alleen voor staande foto's: 30 houdt een gezicht bovenin
# in beeld, 60 kiest het onderste deel.
set -euo pipefail
cd "$(dirname "$0")/.."

W=1200; H=630; MAX_BYTES=290000

MAP="
bedrijfsuitje-ideeen-vlieland    beach-activity.jpg
bedrijfsuitje-vlieland           team-beach.jpg
familieweekend-vlieland          dunes-group.jpg
groepsreizen-vlieland            rmd-beach-group.jpg
groepsweekend-vlieland           vlieland-group.jpg                    56
heisessie-vlieland               dunes-group.jpg
incentive-reis-vlieland          speedboat-group.jpg
jubileum-vlieland                outdoor-dining.jpg
meerdaags-bedrijfsuitje-vlieland vlieland-group.jpg                    56
personeelsuitje-vlieland         beach-event.jpg
teamuitje-vlieland               cycling-group.jpg
wadlopen-vlieland                wadexcursie-vlieland-wad-schelpen.webp
zakelijk-evenement-vlieland      event-outdoor.jpg
zeehondentochten-vlieland        zeehondentocht-vlieland-zandbank.jpg
onze-werkwijze                   districon-vlieland-22.jpg
voor-wie                         speedboat-group.jpg
samenwerken                      rmd-beach-training.jpg
bouwstenen                       vlieland-activity.jpg
activiteiten-vlieland            beach-activity.jpg
activiteiten-boeken              surf-activity.jpg
voorbeeldprogrammas              cycling-group.jpg
referenties                      vandermost-12.jpg
veelgestelde-vragen              hero-speedboot.jpg
catering                         hero-vlieland.jpg
catering-aanvragen               food-platters.jpg
over-ons                         lighthouse-vlieland.jpg
evenementen                      amuse-tour.jpg
contact                          erwin-profile.jpg                     32
programma-samenstellen           kite-flying.jpg
programma-op-maat                sunset-dinner.jpg
partners                         vlieland-landscape.jpg
"

tmp=$(mktemp --suffix=.png); trap 'rm -f "$tmp"' EXIT
echo "$MAP" | while read -r name src focus; do
  [ -z "${name:-}" ] && continue
  out="public/og/$name.jpg"
  # Eerst schalen tot het kader gevuld is, dan bijsnijden rond het zwaartepunt.
  convert "src/assets/$src" -auto-orient -strip -resize "${W}x${H}^" "$tmp"
  dims=$(identify -format "%w %h" "$tmp"); sw=${dims% *}; sh=${dims#* }
  y=$(( sh * ${focus:-50} / 100 - H / 2 )); [ "$y" -lt 0 ] && y=0; [ "$y" -gt $((sh - H)) ] && y=$((sh - H))
  x=$(( (sw - W) / 2 ))
  q=82
  while :; do
    convert "$tmp" -crop "${W}x${H}+${x}+${y}" +repage \
      -sampling-factor 4:2:0 -interlace Plane -quality "$q" "$out"
    size=$(stat -c %s "$out")
    [ "$size" -le "$MAX_BYTES" ] && break
    q=$((q - 6))
    [ "$q" -lt 50 ] && { echo "!! $out blijft te groot ($size B)"; break; }
  done
  printf '%-34s %-42s q=%s %6d kB\n' "$name" "$src" "$q" "$((size / 1024))"
done
