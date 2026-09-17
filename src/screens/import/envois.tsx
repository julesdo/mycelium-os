import { ListItem, Spinner } from '@cladd-ui/react';
import { FileUpIcon, TriangleAlertIcon } from 'lucide-react';
import { LigneBouton } from '../../ui';

/**
 * L'ENVOI D'UN FICHIER — le seul moment du produit que le gérant PASSE À
 * ATTENDRE, et le seul qui ne s'affichait nulle part.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LE TROU QUE CE FICHIER BOUCHE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Entre le geste — un FEC lâché sur la zone — et la première rangée de dépôt,
 * il s'écoule le temps d'un envoi réseau. Rien ne le montrait : la zone
 * remplaçait « Déposez vos fichiers ici » par « Envoi en cours… », se grisait,
 * et c'était tout. Sur cinq fichiers, le gérant voyait UNE phrase pour cinq
 * envois, ne savait pas lequel était parti, et si l'un échouait il apprenait
 * seulement que « l'envoi de X a échoué » — sans savoir ce qu'étaient devenus
 * les quatre autres.
 *
 * C'est la règle d'écran n° 2 prise en défaut au seul endroit où elle coûte :
 * « tout traitement se voit sans qu'on le demande ». Un fichier qui n'arrive
 * pas est une facture qu'on ne réclamera jamais, et il partait en silence.
 *
 * ⚠️ UNE RANGÉE PAR FICHIER, DÈS LE LÂCHER. La rangée existe avant que le
 * réseau ait commencé — c'est ce qui rend le lâcher irréversible à l'œil :
 * cinq fichiers lâchés, cinq rangées, on les compte. C'est le traitement des
 * références (Dropbox, Linktree, Revolut Business) : l'en-tête compte, les
 * rangées portent l'état, chacune le sien.
 *
 * ⚠️ ET ELLES VIVENT DANS LA MÊME LISTE QUE LES DÉPÔTS. Une seconde liste,
 * « envois en cours », ferait sauter chaque fichier d'une liste à l'autre en
 * cours de route. Ce sont les mêmes objets à deux instants de leur vie.
 */

/** Ce qu'un fichier traverse entre le geste du gérant et sa première ligne en base. */
export type EtatEnvoi =
	/** Lâché, pas encore parti : les fichiers d'un même lot partent l'un après l'autre. */
	| 'ATTENTE'
	/** En cours d'envoi. La seule rangée dont `avancement` bouge. */
	| 'ENVOI'
	/** L'envoi a échoué. La rangée RESTE, avec sa raison et son geste. */
	| 'ECHEC';

export interface EnvoiAffiche {
	/**
	 * L'identité de la rangée.
	 *
	 * ⚠️ PAS LE NOM DU FICHIER. Déposer deux fois `export.csv` — le premier
	 * refusé, le second corrigé — donnerait deux rangées de même clé, et React
	 * en réutiliserait une pour l'autre : l'avancement du second s'afficherait
	 * sur l'échec du premier.
	 */
	readonly cle: string;
	readonly nom: string;
	/** En octets, tel que le navigateur le rend. */
	readonly taille: number;
	readonly etat: EtatEnvoi;
	/**
	 * La part envoyée, entre 0 et 1.
	 *
	 * ⚠️ FACULTATIF, ET CE N'EST PAS UNE COQUETTERIE. Un envoi dont la taille
	 * n'est pas connue du navigateur (`lengthComputable` faux) n'a pas
	 * d'avancement : en fabriquer un ferait bouger une barre qui ne mesure rien.
	 * Sans lui, la rangée dit « envoi… » et tourne, ce qui est vrai.
	 */
	readonly avancement?: number;
	/** Écrit sur `ECHEC` seulement, et affiché TEL QUEL : c'est le message d'écran. */
	readonly erreur?: string;
}

const PALIERS = [
	{ seuil: 1024 * 1024 * 1024, unite: 'Go' },
	{ seuil: 1024 * 1024, unite: 'Mo' },
	{ seuil: 1024, unite: 'ko' }
] as const;

/**
 * Le poids d'un fichier, comme un système d'exploitation l'écrit.
 *
 * Il n'est pas là pour décorer : c'est lui qui distingue « c'est long parce que
 * le fichier fait 40 Mo » de « c'est bloqué ». Sans lui, les deux se
 * ressemblent, et seul le second demande un geste.
 */
export function poidsLisible(octets: number): string {
	for (const { seuil, unite } of PALIERS) {
		if (octets >= seuil) {
			const valeur = octets / seuil;
			// Une décimale sous 10, aucune au-dessus : « 1,9 Mo », « 42 Mo ».
			return `${valeur.toFixed(valeur < 10 ? 1 : 0).replace('.', ',')} ${unite}`;
		}
	}
	return `${octets} o`;
}

/** Ce que la rangée dit sous le nom du fichier. */
function precisionEnvoi(envoi: EnvoiAffiche): string {
	const poids = poidsLisible(envoi.taille);
	if (envoi.etat === 'ECHEC') return envoi.erreur ?? 'L’envoi a échoué.';
	if (envoi.etat === 'ATTENTE') return `${poids} · en file d’attente`;
	// Pas d'ellipse : c'est le pourcentage, à droite, qui dit que ça bouge.
	return `${poids} · envoi en cours`;
}

/**
 * La rangée d'un envoi.
 *
 * ⚠️ L'ÉCHEC EST LA SEULE À PORTER UN GESTE, et c'est ce qui la distingue à
 * l'œil autant qu'au doigt. `LigneBouton` est la rangée du produit : même
 * apparence que celles des dépôts au pixel près, cible tactile et anneau de
 * focus compris. Un `<div>` cliquable perdrait les trois.
 *
 * Les deux autres ne mènent nulle part — il n'y a rien à ouvrir tant que le
 * serveur ne connaît pas le fichier — donc `ListItem`, la rangée statique du
 * kit, montée comme le veilleur monte les siennes.
 */
export function LigneEnvoi({
	envoi,
	onReessayer
}: {
	envoi: EnvoiAffiche;
	/** Relance CE fichier-là, celui que la rangée nomme. */
	onReessayer: (cle: string) => void;
}) {
	if (envoi.etat === 'ECHEC') {
		return (
			<LigneBouton
				onClick={() => onReessayer(envoi.cle)}
				icone={<TriangleAlertIcon />}
				titre={envoi.nom}
				precision={precisionEnvoi(envoi)}
				valeur="Réessayer"
				// Un envoi qui n'est pas arrivé attend une réponse : le point, jamais
				// une couleur de seuil. Voir `navigation.tsx`.
				attention
			/>
		);
	}

	return (
		<ListItem className="gap-cladd-3xs">
			{/*
			  ⚠️ `2xs`, ET C'EST LA TAILLE JUSTE ICI. La documentation réserve `2xs`
			  et `xs` à ce qui vit DANS un conteneur plus dense — ce qu'est la fente
			  d'icône d'une rangée — et son avertissement (« 8 px, illisible ») porte
			  sur l'échelle d'origine du kit. `tokens.css` décale la nôtre pour que
			  `md` tombe sur 48 px : `2xs` y vaut 20 px, soit la taille des glyphes
			  des rangées voisines.
			*/}
			{envoi.etat === 'ENVOI' ? <Spinner size="2xs" /> : <FileUpIcon size={18} />}
			<span className="flex min-w-0 flex-col gap-0.5">
				<span className="truncate">{envoi.nom}</span>
				<span className="text-cladd-2xs leading-snug text-cladd-fg-softer">
					{precisionEnvoi(envoi)}
				</span>
			</span>
			{/*
			  L'AVANCEMENT EN CHIFFRES, ET PAS EN BARRE.

			  Le kit ne fournit aucune barre de progression, et une barre bâtie à la
			  main ici serait exactement le composant réinventé que le projet
			  interdit. Le pourcentage dit la même chose, se lit d'un coup d'œil, et
			  tient dans la fente que toutes les autres rangées utilisent pour leur
			  valeur — donc la liste garde un seul rythme.
			*/}
			{envoi.avancement === undefined ? null : (
				<span className="ml-auto shrink-0 text-cladd-xs text-cladd-fg-softer tabular-nums">
					{Math.round(envoi.avancement * 100)} %
				</span>
			)}
		</ListItem>
	);
}

/**
 * Ce que la zone de dépôt annonce pendant qu'elle travaille.
 *
 * ⚠️ ELLE COMPTE, elle ne dit pas « en cours ». « Envoi de 2 fichiers sur 5 »
 * se vérifie contre les rangées juste dessous ; « Envoi en cours… » ne se
 * vérifie contre rien et ne bouge jamais, ce qui est la définition d'un écran
 * dont on finit par douter.
 */
export function libelleZone(envois: readonly EnvoiAffiche[]): string | null {
	/**
	 * ⚠️ ON NE COMPTE QUE CE QUI EST ENCORE EN ROUTE, jamais « le 3ᵉ sur 5 ».
	 * Les envois réussis quittent la liste dès que le serveur connaît le dépôt,
	 * et les échecs y restent : un rang calculé sur ce qui reste aurait reculé
	 * quand un fichier échoue, et compté un total qui ne veut plus rien dire.
	 * Ce qui reste à envoyer, lui, est toujours vrai.
	 */
	const restants = envois.filter((envoi) => envoi.etat !== 'ECHEC').length;
	if (restants === 0) return null;
	if (restants === 1) return 'Envoi d’un fichier…';
	return `Envoi de ${restants} fichiers…`;
}
