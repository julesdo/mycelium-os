# Demande de paiement des intérêts moratoires et de l'indemnité forfaitaire

**Destinataire** : l'acheteur public qui a réglé les factures en retard, à l'attention de son
ordonnateur (le service qui mandate les dépenses). Pour un établissement public de santé, sa
direction des finances.
**Canal** : choisi et utilisé par le gérant : le dépôt d'une sollicitation sur Chorus Pro, un
courrier, ou un e-mail au service facturier. Le logiciel prépare, il n'envoie pas.
**Quand** : après le paiement du principal. Les intérêts et l'indemnité se paient dans les
quarante-cinq jours de la mise en paiement du principal (R2192-36) ; ils restent dus au-delà.

## Ce que lit le gérant avant de valider

Cette lettre demande à votre client public de payer les intérêts de retard et les frais de
recouvrement que la loi ajoute aux factures qu'il a réglées après le délai.
Elle liste chaque facture : son échéance, la date du paiement, les jours de retard, le taux et les
sommes ; le calcul détaillé est joint.
Envoyée avant le 31 décembre, une demande écrite interrompt le délai de quatre ans pour les droits
de l'année qui se prescrit (loi n° 68-1250, article 2) : c'est une lecture, dite comme telle.
Votre client vous paie directement, sur votre compte. Rien ne part avant votre accord. Aucun avocat
ne l'a relue.

## Texte du modèle

```text
{{creancier.denomination}} {{creancier.mentionForme}}
Siège : {{creancier.adresseSiege}}
SIREN {{creancier.siren}}
{{creancier.email}}{{#if creancier.telephone}} – {{creancier.telephone}}{{/if}}

{{acheteur.denomination}}
{{#if acheteur.siren}}SIREN {{acheteur.siren}}
{{/if}}À l'attention de l'ordonnateur
{{acheteur.adresse}}

{{envoi.ville}}, le {{envoi.date}}

Objet : demande de paiement des intérêts moratoires et de l'indemnité forfaitaire pour frais de recouvrement – {{#if factures.plusieurs}}{{factures.nombre}} factures{{else}}facture n° {{factures.premiere.reference}}{{/if}}

Madame, Monsieur,

{{#if factures.plusieurs}}Les factures suivantes ont été réglées après l'expiration du délai de paiement{{else}}La facture suivante a été réglée après l'expiration du délai de paiement{{/if}} :

{{#each factures}}– facture n° {{reference}}{{#if dateEmission}} du {{dateEmission}}{{/if}}, de {{montantTTC}} € TTC : échue le {{echeance}}, réglée le {{payeeLe}}, soit {{jours}} jours de retard ; intérêts moratoires {{interets}} € au taux de {{taux}} ; indemnité forfaitaire pour frais de recouvrement {{indemnite}} €.
{{/each}}
Intérêts moratoires : {{totaux.interets}} €
Indemnités forfaitaires pour frais de recouvrement : {{totaux.nombreIndemnites}} × {{param.indemniteForfaitairePublique}}, soit {{totaux.indemnites}} €
Total demandé : {{totaux.total}} €

Le retard de paiement fait courir, de plein droit et sans autre formalité, des intérêts moratoires dès le lendemain de l'expiration du délai de paiement ou de l'échéance prévue par le marché, et donne lieu au versement d'une indemnité forfaitaire pour frais de recouvrement ({{param.interetsMoratoiresDePleinDroit.source}}). Le taux des intérêts moratoires est celui que fixe l'{{param.tauxInteretsMoratoiresPublics.source}}, pour chaque facture ci-dessus ; le montant de l'indemnité forfaitaire est de {{param.indemniteForfaitairePublique}} ({{param.indemniteForfaitairePublique.source}}). Les intérêts moratoires et l'indemnité forfaitaire sont payés dans un délai de quarante-cinq jours suivant la mise en paiement du principal ({{param.paiementAccessoiresPublics.source}}).

Nous vous remercions de bien vouloir procéder au mandatement de la somme de {{totaux.total}} €, par virement sur le compte {{creancier.iban}} ouvert au nom de {{creancier.denomination}}, en rappelant les numéros des factures concernées.

Si l'un de vos paiements comprenait déjà tout ou partie de ces sommes, ou si vous relevez une erreur, nous vous remercions de nous le faire savoir par écrit, à l'adresse {{creancier.email}}, en précisant la facture concernée.

Le décompte joint détaille le calcul facture par facture : principal, date d'échéance, date de paiement, nombre de jours, taux et base annuelle.

Nous vous prions d'agréer, Madame, Monsieur, l'expression de nos salutations distinguées.

{{creancier.signataire.nom}}
{{creancier.signataire.qualite}}, pour {{creancier.denomination}}

Pièces jointes :
– copie {{#if factures.plusieurs}}des factures{{else}}de la facture{{/if}} n° {{factures.references}} ;
– justificatifs des dates de paiement (avis de paiement ou relevés de compte) ;
– décompte détaillé des intérêts moratoires.

[Valeurs dérivées, jamais rédigées par l'agent :
{{taux}} : le taux de la facture, lu sur sa période de décompte (BCE du semestre de départ, majoré).
{{creancier.mentionForme}} : comme pour la lettre de relance officielle ; une forme non relue refuse.]
```
