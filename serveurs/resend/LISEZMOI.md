# Le domaine neutre des relances

Les relances que Plume envoie partent aujourd'hui de l'adresse commune (`RELANCES_EMAIL`, à défaut
`AUTH_EMAIL`, c'est-à-dire `bonjour@letikette.com`). Trois défauts : l'adresse nomme le logiciel ;
un client qui répond à l'expéditeur au lieu de l'adresse de réponse écrit à l'équipe (or Letikette
ne reçoit aucune réponse du débiteur, ligne rouge n° 1) ; et les signalements « indésirable » des
débiteurs pèsent sur le domaine qui envoie aussi les e-mails de compte.

**Le domaine neutre les règle.** Posé, chaque établissement relance depuis SON adresse, tirée de
son nom : « Durand BTP » écrit de `durand-btp@<domaine neutre>`. Aucune boîte n'existe derrière :
Resend envoie depuis n'importe quelle adresse d'un domaine vérifié, et les réponses vont à
l'adresse du gérant (`reply_to`). Rien n'est à recevoir chez nous.

Le code :

- `src/lib/verticales/recouvrement/expediteur.ts` : l'adresse tirée du nom (sans accents, sans
  forme juridique, quarante signes au plus), testée.
- `src/lib/convex/recouvrement/pilote.ts` : `adresseDEnvoiPour`, `expediteurPour`, lus par
  l'expédition (`expedition.ts`) et l'exemple de « Logo et couleurs » (`marque.ts`).
- `src/lib/support/conversation.ts` : la réception des e-mails du service client s'ouvre quand
  les relances partent d'un autre domaine que Letikette (un sous-domaine de letikette.com ne
  compte pas).

**En service depuis le 23/10/2026 sur `suivie-facture.com`** (vérifié chez Resend, DKIM, SPF et DMARC posés chez OVH). **Dormant sans `RELANCES_DOMAINE`.** Une valeur qui n'est pas un domaine ne s'utilise pas.

## Choisir le nom

- Banal et lisible : il apparaît sous le nom du créancier dans la messagerie du client.
- Jamais « recouvrement », « contentieux », « huissier », « justice », « tribunal », « impayé » :
  le nom ne doit évoquer ni un cabinet de recouvrement, ni une autorité.
- Jamais « letikette » : c'est tout l'objet.
- Un `.fr` (enregistrant dans l'Union européenne) ou un `.com`.

## La marche à suivre

1. **Acheter le domaine** chez un bureau d'enregistrement (OVHcloud, Gandi, Infomaniak…). Couper la
   page de stationnement publicitaire qu'il pose par défaut : un domaine qui affiche des publicités
   paraît douteux à qui va voir. Aucun site n'est nécessaire.
2. **Vérifier la formule Resend.** La formule gratuite n'autorise qu'un domaine d'envoi : si
   letikette.com l'occupe, il faut la formule Pro (dix domaines). Elle lève aussi le plafond de cent
   e-mails par jour, que la production dépasserait vite.
3. **Ajouter le domaine chez Resend** (Domains → Add Domain), le domaine lui-même, pas un
   sous-domaine. Resend affiche les enregistrements DNS à créer, et ce sont EUX qui font foi : la
   signature DKIM (TXT `resend._domainkey`) et le SPF, qui prend aujourd'hui la forme de deux CNAME
   (`send`, `rsend`, en octobre 2026 pour `suivie-facture.com`). Les recopier à l'identique dans la
   zone DNS du bureau d'enregistrement ; en mode texte, chaque cible de CNAME finit par un point.
4. **Ajouter une politique DMARC** : un enregistrement TXT `_dmarc` valant `v=DMARC1; p=none;`.
   La durcir (`p=quarantine`) après quelques semaines d'envois propres.
5. **Attendre « Verified »** chez Resend : de quelques minutes à quelques heures.
6. **Poser la variable en production** :

   ```bash
   npx convex env set RELANCES_DOMAINE votre-domaine.fr --prod
   ```

   Elle prend effet sans redéploiement.
7. **Vérifier** : Compte › Logo et couleurs dit « Elles partent de `<votre-nom>@votre-domaine.fr` ».
   « M'envoyer un exemple » : l'exemple arrive de cette adresse ; dans Gmail, « Afficher
   l'original » doit dire SPF, DKIM et DMARC « PASS ».
8. **Monter doucement.** Un domaine neuf n'a pas encore de réputation : les premiers jours,
   quelques dizaines d'envois, pas cinq cents d'un coup.

## Ce qu'il ne faut pas faire

- Créer une boîte, une redirection ou une adresse « attrape-tout » sur le domaine : rien ne doit y
  arriver. Le MX que le bureau d'enregistrement pose par défaut (OVH : `mx1/mx2/mx3.mail.ovh.net`)
  peut rester — un domaine d'expéditeur qui accepte le courrier paraît normal aux filtres — tant
  qu'aucune adresse n'existe derrière : un client qui tape l'adresse à la main reçoit « adresse
  inconnue » ; il a, dans chaque relance, l'adresse du gérant.
- Faire suivre ces messages au gérant : Letikette les recevrait au passage.
- Poser un site qui nomme Letikette sur ce domaine.
