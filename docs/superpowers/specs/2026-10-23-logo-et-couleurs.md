# Logo et couleurs : l'image des courriers que reçoit le client

_23/10/2026. Demande du fondateur : « la personnalisation des emails dans l'app, pouvoir mettre son
logo, changer la couleur etc […] qui partent ensuite chez le client qui nous doit de l'argent ! […]
la meilleure UX possible, qu'elle soit plaisante et simple à utiliser »._

## Pourquoi

Le client qui reçoit une relance doit reconnaître son fournisseur **avant** de lire un montant. Une
lettre grise, « au nom de » une entreprise, sans son logo, ressemble à un hameçonnage, et c'est la
fin : la page de paiement le disait déjà (`screens/paiement.tsx`). Aujourd'hui le gérant ne peut rien
y mettre de lui.

Geste supprimé : aucun, la chose était impossible. Ce que ça change pour celui qui paie : ses relances
lui ressemblent, et un client qui reconnaît l'expéditeur ouvre et paie. La règle anti-dérive est
renseignée par la commande du fondateur.

## Références (Mobbin)

- **Square**, « Add logo and color » puis « Preview and adjust » : UNE image (logo + couleur) qui vaut
  pour l'e-mail ET la page de paiement, et l'aperçu bascule de l'un à l'autre.
- **Shopify**, « Customize email templates » : logo, couleur d'accent, et l'aperçu qui passe d'un
  courriel à l'autre.
- **Xero** et **PandaDoc** : des pastilles plutôt qu'une roue chromatique ; la roue reste derrière
  « Autre ».
- **Substack** (iOS), « Edit branding » : deux réglages, rien d'autre.
- **Photoroom** : les couleurs se lisent dans ce que la marque a déjà.
- **Outseta** demande au client de vérifier le contraste lui-même ; ici le logiciel le fait.

## Ce qu'on construit

1. **Une page pleine « Logo et couleurs »**, ouverte par une rangée du Compte (première carte, celle
   de ce que voient vos clients) et par `?ouvrir=marque` :
   - en tête, **l'aperçu exact** de ce que reçoit le client, rendu par le MÊME générateur que
     l'envoi, avec un segment « L'e-mail · La page de paiement » ;
   - la carte du **logo** (vignette, dimensions, Ajouter / Changer, Retirer) ;
   - le **nuancier** : d'abord les couleurs tirées du logo (trois au plus), puis huit couleurs
     sobres, puis « Autre » (le sélecteur du système) ; dessous, le nom de la couleur, et la phrase
     qui dit quand une couleur trop claire prend une nuance plus foncée pour le texte ;
   - **un seul bouton plein**, qui suit l'état : « Enregistrer » quand quelque chose a changé,
     sinon « M'envoyer un exemple » (à l'adresse de la personne connectée), puis la confirmation ;
   - au-delà de 1024 px, deux volets : les réglages à gauche, l'aperçu à droite ;
   - un administrateur modifie ; un membre voit l'aperçu.
2. **Le logo se prépare dans le navigateur** : les marges vides rognées, ramené à 600 × 200 au plus,
   converti en PNG (Outlook ne lit pas le WebP, Gmail ne lit pas le SVG). La première couleur tirée
   du logo est proposée quand aucune n'est posée ; rien ne s'écrit avant « Enregistrer ».
3. **Dans l'e-mail** : le logo en tête à la place du nom, une fine bande de la couleur au haut de la
   lettre, les liens et la signature du pied dans la couleur (assombrie jusqu'à un contraste de
   4,5 pour 1 sur le blanc), le relevé des factures teinté. **Le texte ne change pas d'un mot.**
4. **Le logo voyage DANS l'e-mail** (pièce jointe en ligne, `cid:`) : aucune image hébergée, donc
   aucun pixel et aucun « afficher les images » chez Outlook. Le composant Resend envoie par lots et
   ne porte aucune pièce jointe : la relance part donc par l'API de Resend directement, avec une clé
   d'idempotence par relance, des reprises sur 429 et 5xx, et un échec définitif qui se DIT au gérant
   (la relance redevient un courrier à valider, comme quand l'envoi n'est pas configuré).
5. **Sur la page de paiement** : le logo remplace les initiales, la couleur passe sur la bande d'en-tête.

## Lignes tenues

- Aucune des trois surfaces ne nomme le logiciel ; l'exemple envoyé au gérant non plus.
- Les couleurs de seuil restent celles du produit : la couleur du gérant ne vit que dans SES
  courriers et sa page, jamais dans l'interface de Letikette.
- La purge RGPD efface le logo des courriers avec le profil.

## Hors champ

- Le texte des relances (les gabarits restent sous leurs barrières).
- L'envoi depuis la messagerie du gérant (Gmail, Outlook) : lot suivant, sur décision.
- Le logo sur la lettre PDF imprimée.
