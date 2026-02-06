

# Deploy: reset-partner-connections functie

## Probleem

De `reset-partner-connections` backend functie bestaat in de codebase maar is nooit succesvol gedeployed naar productie. Dit komt doordat edge functions automatisch deployen bij code-wijzigingen, maar als die initiële deploy mislukt of wordt overgeslagen, wordt de functie niet opnieuw geprobeerd bij latere sessies.

De "Publish" knop deployt alleen frontend code -- backend functies worden apart beheerd.

## Oplossing

De bestaande functie deployen. Er zijn geen codewijzigingen nodig.

## Stappen

1. Deploy `reset-partner-connections` edge function naar productie
2. Test de functie door de endpoint aan te roepen
3. Verifieer dat de admin "Reset koppelingen" actie werkt

