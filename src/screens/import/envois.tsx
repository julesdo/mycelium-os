import { Spinner } from '@cladd-ui/react';
import { FileUpIcon, TriangleAlertIcon } from 'lucide-react';
import { LigneBouton, LigneFixe, VignetteIcone } from '../../ui';

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
 * ⚠️ LES DEUX AUTRES SONT DES `LigneFixe`, PLUS DES `ListItem` (01/10/2026).
 * Elles ne mènent nulle part — il n'y a rien à ouvrir tant que le serveur ne
 * connaît pas le fichier —, et la rangée statique du kit rendait une sous-ligne
 * plus petite, sans vignette, à une autre hauteur que les dépôts du même groupe
 * « En cours ». Le fichier changeait de forme en passant de l'envoi à la
 * lecture ; il garde maintenant la même rangée, et seule sa vignette bouge.
 *
 * L'AVANCEMENT EN CHIFFRES, ET PAS EN BARRE : le kit ne fournit aucune barre de
 * progression, et le pourcentage tient dans la fente que toutes les rangées
 * utilisent pour leur valeur.
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
				icone={<VignetteIcone icone={<TriangleAlertIcon />} />}
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
		<LigneFixe
			genre="contenu"
			/*
			  ⚠️ `xs` POUR LE SPINNER, ET LA TAILLE EST MESURÉE. Sur l'échelle imbriquée
			  du produit, `2xs` rend 12 px et `xs` 20 px ; les glyphes des vignettes
			  voisines en font 16. Un anneau creux se lit toujours plus petit qu'un
			  glyphe de même boîte : `xs` tombe juste à l'œil.
			*/
			icone={
				<VignetteIcone icone={envoi.etat === 'ENVOI' ? <Spinner size="xs" /> : <FileUpIcon />} />
			}
			titre={envoi.nom}
			precision={precisionEnvoi(envoi)}
			{...(envoi.avancement === undefined
				? {}
				: { valeur: `${Math.round(envoi.avancement * 100)} %` })}
		/>
	);
}
