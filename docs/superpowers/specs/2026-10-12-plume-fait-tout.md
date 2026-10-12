# Plume fait tout, et on peut lui joindre des documents (12/10/2026)

## La demande

Le fondateur : « il faut qu'on fasse en sorte que Plume soit capable de tout faire dans
l'application, toutes les nouvelles features, qu'on puisse aussi lui upload des fichiers
directement ! Et il faut clairement améliorer l'UX, s'inspirer des meilleurs flows ».

## Ce qui manquait

- La conversation hors dossier (`/app/pilote`) ne répondait pas : elle cherchait un nom de
  client dans la question et renvoyait vers son dossier, ou demandait « De quel client
  parlez-vous ? ».
- Aucun document ne se donnait à Plume : il fallait passer par le coffre, puis revenir.
- Les gestes ignoraient les fonctions arrivées depuis le 08/10 : le paiement reçu, le
  coffre, le choix des professionnels, le démarrage, l'activation des relances.
- Une proposition de Plume se confirmait ou s'écartait, sans se corriger : un jour faux
  obligeait à tout redire.

## Les références (Mobbin)

- **Pièces jointes** : Claude, Manus, Copilot, DeepSeek. Un « + » dans le compositeur, le
  document en carte au-dessus du champ avec sa croix, puis au-dessus de la bulle, à droite.
- **Travail visible** : v0, Zapier, Fireflies, Linear. Les étapes se cochent dans le fil ;
  la réponse porte les objets dont elle parle (les tickets de Linear, ici des dossiers).
- **Propositions à confirmer** : Structured (« Add, Edit, Discard », « Accept all »), Me+
  (l'aperçu de ce qui sera créé, « Help me edit it »), Telegram (la suggestion en carte).
- **Historique** : Perplexity (les tâches récentes sur l'accueil), Fireflies.

## Ce qui est livré, en cinq lots

1. **On joint des documents à Plume** (`0e2308f`). Le « + », le glisser-déposer et le collage
   d'une capture ; vérifiés avant l'envoi comme au parcours de dépôt ; envoyés par Uppy au
   coffre, scellés, lus. Dans un dossier, ils se rangent avec les pièces du client ; hors
   dossier, ce sont des factures à lire. Plume attend la lecture (deux minutes et demie au
   plus) et le contexte lui donne ce qu'elle a relevé, avec l'identifiant de la pièce à
   citer. Deux étapes vraies s'ajoutent à son travail : l'arrivée au coffre, la lecture.
2. **Plume répond sur tout l'établissement** (`6df9e35`). `repondreSurLEtablissement` lit les
   dossiers ouverts avec les chiffres de l'écran Dossiers (`lignesDesDossiers`), les clients
   en retard hors dossier, ce qui part bientôt, le référentiel et le fil. Plume n'écrit aucun
   montant : il cite des dossiers, dessinés en cartes avec leurs chiffres. Ses gestes visent
   un dossier nommé, relus contre l'état de CE dossier (`lireLEtatDuDossier`, partagé avec la
   conversation d'un dossier) ; une cible inconnue fait tomber le geste.
3. **De nouveaux gestes** (`f22ce2a`). Le paiement reçu (`REGLEMENT`), rapproché comme sous
   « Virement reçu » ; « Me joindre le document » ; depuis un dossier, choisir qui fait
   l'acte, démarrer, et tout écran de l'établissement.
4. **Des cartes qui se corrigent** (`6da1ab0`). « Modifier » sur la carte, la valeur relue par
   le serveur (`ajuster`) ; l'aperçu de ce qui sera écrit (calendrier d'un échéancier,
   factures qu'un paiement solde) ; « Tout confirmer ».
5. **L'historique et les suggestions**. Les cinq dernières conversations sur un dossier se
   reprennent depuis la page de Plume ; les suggestions montrent ce qu'il sait faire.

## Ce qui ne change pas

- Le catalogue reste fermé, et rien ne se fait sans « Confirmer ». Aucun geste ne saisit une
  juridiction, ne mandate personne ni ne choisit une voie ; « choisir qui fait l'acte » ouvre
  la liste, le gérant choisit.
- Les filtres avant rendu s'appliquent phrase par phrase, dans les deux conversations, et le
  plafond mensuel est le même.
- Un document joint suit le chemin du coffre : rien de ce que Plume lit n'a contourné le
  scellement.

## Ce qui n'a pas été vérifié avec une vraie session

Aucune connexion à l'application : les écrans ont été vus dans la salle d'exposition, le
serveur vérifié par les types, les tests et le déploiement de développement. Le premier
échange réel dira si le modèle cite bien ses dossiers et respecte l'absence de montant.
