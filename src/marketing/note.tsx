import { LEGAL_CONFIG } from '../lib/config/legal';
import { SectionMarketing } from './section';

/**
 * LA NOTE — la seule voix de la page.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QUI MANQUAIT N'ÉTAIT NI UNE IMAGE NI UN TON, C'ÉTAIT QUELQU'UN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Verdict du terrain : « ça manque beaucoup beaucoup trop d'humanité ». La
 * tentation était l'illustration — un dessin, une photographie d'agence, des
 * visages achetés. Relevé sur Mobbin le 24 septembre 2026 : ce qui humanise
 * vraiment une page B2B n'est jamais ça. C'est une NOTE DE FONDATEUR, à la
 * première personne, trois paragraphes courts, SIGNÉE. KÖPPEN, incident.io,
 * Daylight, Ada, Kalstore font exactement la même chose, et aucune ne dépasse
 * cent vingt mots.
 *
 * ⚠️ AUCUNE PHOTOGRAPHIE, ET C'EST UNE LIGNE À NE PAS FRANCHIR. Il n'existe
 * pas de portrait du fondateur dans le dépôt. En prendre un dans une banque
 * d'images, ou en fabriquer un, ce serait inventer une personne sur la page
 * même où elle s'engage. Le jour où une photographie de travail existe — prise
 * au téléphone, dans le vrai bureau, sans pose — elle se pose à droite de ce
 * texte et la note n'a rien d'autre à changer.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * POURQUOI ICI, ENTRE LES LIMITES ET LE PRIX
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La section qui précède énumère trois refus. Sans personne derrière, un refus
 * se lit comme une clause de protection ; signé, il se lit comme un choix.
 *
 * Et c'est le dernier écran avant qu'on demande de l'argent : celui qui le
 * demande s'est présenté d'abord.
 *
 * ⚠️ PAS DE RAIL TECHNIQUE EN TÊTE, contrairement à toutes les autres sections.
 * Les rails ouvrent ce qui EXPLIQUE ; une note ne s'explique pas. Pas de
 * pictogramme non plus, pas de grille, pas de chiffre : c'est le seul endroit
 * de la page où il n'y a rien à mesurer.
 *
 * ⚠️ ET ELLE NE VAUT QUE PARCE QUE LE RESTE A MAIGRI. Une note signée ajoutée
 * à une page déjà trop longue rend la page plus humaine ET toujours trop
 * longue. Elle est arrivée avec la suppression de la section « preuve », le
 * dégraissage des quatorze puces et la fin du doublon veilleur/abonnement —
 * pas avant.
 */

/**
 * ⚠️ LA DERNIÈRE PHRASE ENGAGE UNE PERSONNE RÉELLE, ET ELLE ATTEND SON ACCORD.
 *
 * « Le numéro en bas de cette page est le mien » est un FAIT : il est publié
 * dans les mentions légales, comme la loi l'exige. « Et c'est moi qui réponds »
 * est un ENGAGEMENT, et c'est un portable qui sonnera.
 *
 * Elle est écrite ici parce qu'elle est vraie aujourd'hui — entreprise
 * individuelle, un seul exploitant — et parce que c'est la phrase qui fait
 * toute la différence entre une note et une plaquette. Elle se retire en
 * coupant six mots si son auteur préfère.
 */
const NOTE = [
	'Je n’ai pas écrit Letikette pour vous vendre une procédure. Je l’ai écrit pour le calcul : l’échéance, le taux du semestre, le nombre de jours, et tout recommencer à la facture suivante. À la main, personne ne va au bout, et ce qui n’est pas calculé ne se réclame pas.',
	'Alors le logiciel compte, il date, il prévient. Il ne fera rien à votre place, et vous venez de lire tout ce qu’il refuse de faire.',
	'Letikette est écrit à Bordeaux, dans une entreprise individuelle qui porte mon nom. Le numéro en bas de cette page est le mien, et c’est moi qui réponds.'
] as const;

export function Note() {
	return (
		<SectionMarketing>
			<div className="flex max-w-2xl flex-col gap-cladd-2xs">
				{NOTE.map((paragraphe) => (
					<p
						key={paragraphe.slice(0, 24)}
						className="apparait text-chapeau leading-relaxed font-normal text-craie-douce"
					>
						{paragraphe}
					</p>
				))}

				{/*
				  LA SIGNATURE. C'est la fonte du logotype — déjà chargée, aucun fichier
				  à produire — et surtout ce n'est PAS un paraphe scanné : reproduire la
				  main de quelqu'un demanderait un fichier que personne n'a fourni, et
				  l'inventer serait un faux au sens propre.

				  ⚠️ LA LIGNE D'IMMATRICULATION SOUS LE NOM N'EST PAS DE L'ADMINISTRATIF.
				  C'est ce qui rend la personne vérifiable en trente secondes sur un
				  registre public — et sur une page qui demande de confier sa
				  comptabilité à un inconnu, c'est le fait le plus rassurant qu'elle
				  puisse porter. Elle est LUE sur `LEGAL_CONFIG`, jamais recopiée : deux
				  numéros qui divergent seraient pires que pas de numéro du tout.
				*/}
				<div className="flex flex-col gap-1 pt-cladd-2xs">
					<span className="signature-note text-titre-section leading-none text-craie-claire">
						{LEGAL_CONFIG.directeurPublication}
					</span>
					<span className="text-cladd-2xs font-medium tracking-widest text-craie-sourde uppercase">
						{LEGAL_CONFIG.legalForm} · SIRET {LEGAL_CONFIG.siret}
					</span>
				</div>
			</div>
		</SectionMarketing>
	);
}
