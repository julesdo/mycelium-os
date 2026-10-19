# Signalement pour mandatement d'office des intérêts moratoires

**Destinataire** : pour une collectivité territoriale ou l'un de ses établissements publics, le
représentant de l'État dans le département (le préfet), au titre de l'article L1612-18 du code
général des collectivités territoriales. Pour un établissement public de santé, le directeur
général de l'agence régionale de santé, au titre de l'article L6145-5 du code de la santé publique.
Pour tout autre acheteur, le modèle ne se compose pas : la démarche n'a pas été relue.
**Quand** : seulement si les intérêts moratoires et l'indemnité n'ont pas été mandatés dans les
trente jours suivant le paiement du principal. Seul le gérant décide de l'envoyer ; le logiciel ne
le propose pas de lui-même.
**Ce qu'il n'est pas** : un recours devant une juridiction. La chambre régionale des comptes, qui en
est une, n'est jamais proposée.

## Ce que lit le gérant avant de valider

Ce courrier signale au préfet (ou à l'agence régionale de santé) que votre client public n'a pas
payé les intérêts de retard dans les trente jours qui ont suivi le paiement des factures, et lui
demande d'adresser à ce client la mise en demeure de les mandater que prévoit la loi.
C'est une démarche administrative, pas une action en justice. Rien ne part avant votre accord.
Aucun avocat ne l'a relu.

## Texte du modèle

```text
{{creancier.denomination}} {{creancier.mentionForme}}
Siège : {{creancier.adresseSiege}}
SIREN {{creancier.siren}}
{{creancier.email}}

{{autorite.libelle}}
{{autorite.adresse}}

{{envoi.ville}}, le {{envoi.date}}

Objet : signalement – intérêts moratoires non mandatés par {{acheteur.denomination}}

{{autorite.appel}},

{{acheteur.denomination}}{{#if acheteur.siren}} (SIREN {{acheteur.siren}}){{/if}} a réglé le principal {{#if factures.plusieurs}}des factures suivantes{{else}}de la facture suivante{{/if}} après l'expiration du délai de paiement, sans mandater les intérêts moratoires et l'indemnité forfaitaire pour frais de recouvrement dus de plein droit ({{param.interetsMoratoiresDePleinDroit.source}}) :

{{#each factures}}– facture n° {{reference}} : principal réglé le {{payeeLe}} ; intérêts moratoires {{interets}} € ; indemnité forfaitaire {{indemnite}} €.
{{/each}}
Total non mandaté : {{totaux.total}} €.

Plus de {{param.mandatementDOffice.apresPaiementDuPrincipalJours}} jours se sont écoulés depuis le paiement du principal. {{#if demandeAnterieure}}Notre demande du {{demandeAnterieure.date}} est restée sans suite. {{/if}}Nous vous signalons cette situation et vous demandons de bien vouloir adresser à l'ordonnateur la mise en demeure de mandatement prévue par {{autorite.fondement}}.

Nous tenons à votre disposition les factures, les justificatifs de paiement et le décompte détaillé, joints au présent courrier.

Nous vous prions d'agréer, {{autorite.appel}}, l'expression de notre haute considération.

{{creancier.signataire.nom}}
{{creancier.signataire.qualite}}, pour {{creancier.denomination}}

Pièces jointes :
– copie {{#if factures.plusieurs}}des factures{{else}}de la facture{{/if}} n° {{factures.references}} ;
– justificatifs des dates de paiement ;
– décompte détaillé des intérêts moratoires ;
{{#if demandeAnterieure}}– copie de notre demande du {{demandeAnterieure.date}} ;
{{/if}}

[Valeurs fermées :
{{autorite}} : COLLECTIVITE = libellé « Préfecture du département », appel « Madame la Préfète, Monsieur le Préfet », fondement « l'article L1612-18 du code général des collectivités territoriales » ; SANTE = libellé « Agence régionale de santé, à l'attention du directeur général », appel « Madame la Directrice générale, Monsieur le Directeur général », fondement « l'article L6145-5 du code de la santé publique ».
Les renvois de ces deux articles à des textes abrogés ne sont jamais recopiés.]
```
