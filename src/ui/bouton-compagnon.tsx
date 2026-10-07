import { Button } from '@cladd-ui/react';
import { MessageCircleIcon } from 'lucide-react';
import { cn } from './cn';
import { PastilleDeRappel } from './barre-du-bas';

/**
 * LE BOUTON DU COMPAGNON — dans la rangée de la barre du bas, à sa droite.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ IL FLOTTAIT AU-DESSUS DE LA BARRE, ET IL CACHAIT LE CONTENU (07/10/2026)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La capsule « Demander » était posée à 96 px du bord bas, à droite, par-dessus
 * ce qui défile. Relevé à 375 px sur tous les écrans : elle couvrait la colonne
 * des montants des cartes qui passaient dessous — « 31 200,50 € » se lisait
 * « 31 2… » derrière elle. Les applications qui ont un assistant ne le posent
 * jamais sur un montant : Cleo en fait un onglet, et iOS 26 comme Telegram
 * posent un bouton ROND dans la même rangée que la barre des onglets, à sa
 * droite. C'est ce qu'il est devenu : il ne recouvre plus rien que la barre ne
 * recouvre déjà, et le contenu dégage les deux d'un seul rembourrage.
 *
 * Il garde ce qui faisait la capsule : son verbe unique, sa portée (dans
 * `aria-label`, la place manque sur un bouton rond), son halo qui respire, sa
 * pastille de compte, et la phrase qui dit qu'il est indisponible AVANT qu'on
 * tape une question.
 */

export type EtatCompagnon =
	| { readonly genre: 'REPOS' }
	| { readonly genre: 'A_DIRE'; readonly compte: number }
	| { readonly genre: 'INDISPONIBLE'; readonly phrase: string };

export function BoutonCompagnon({
	portee,
	etat,
	onOuvrir
}: {
	readonly portee: string | null;
	readonly etat: EtatCompagnon;
	readonly onOuvrir: () => void;
}) {
	const indisponible = etat.genre === 'INDISPONIBLE';

	return (
		/*
		  `relative flex` : la barre aligne ses enfants en hauteur (`items-stretch`),
		  et ce conteneur transmet cette hauteur au bouton — il fait exactement la
		  hauteur de la pilule des onglets, sans qu'un chiffre la recopie.
		*/
		<span className="relative flex shrink-0">
			{/*
			  LA PHRASE, ET SEULEMENT QUAND ELLE APPREND QUELQUE CHOSE : sur l'état
			  indisponible, au-dessus du bouton, calée sur son bord droit pour ne pas
			  déborder de l'écran. `verre-dense` : le seul verre assez opaque pour
			  qu'un texte de cette taille tienne au-dessus d'une carte.
			  `pointer-events-none` : elle ne vole pas les touchers de la carte
			  dessous ; `aria-hidden` : son texte est déjà l'`aria-label` du bouton.
			*/}
			{indisponible ? (
				<span
					aria-hidden
					className="verre-dense pointer-events-none absolute right-0 bottom-full mb-2 w-max max-w-56 rounded-cladd-2xs px-2.5 py-1 text-right text-cladd-3xs leading-snug text-cladd-fg-soft"
				>
					{etat.phrase}
				</span>
			) : null}

			{/*
			  LE HALO, DERRIÈRE le bouton. Pas de halo quand c'est indisponible : une
			  lueur qui respire est une invitation, et l'adresser à un bouton qui va
			  répondre « pas ce mois-ci » dirait le contraire.
			*/}
			{indisponible ? null : (
				<span
					aria-hidden
					className={cn('halo-compagnon', etat.genre === 'A_DIRE' && 'halo-compagnon-vif')}
				/>
			)}

			{/*
			  LA MÊME ANATOMIE QU'UN ONGLET — l'icône, le libellé dessous, puis à côté
			  au-delà de 768 px — pour qu'il se lise comme un objet de la barre, et
			  le même verre que la pilule. `w-16` : 64 px, la largeur d'un onglet à
			  375 px. `min-h-cladd-md` repose le plancher tactile que `h-auto` annule.

			  ⚠️ « DEMANDER », ET AUCUN AUTRE VERBE. Il parle AU LOGICIEL : on ne
			  relance jamais le débiteur au nom du client (première ligne rouge). Un
			  « Envoyer » ici laisserait croire le contraire.
			*/}
			<Button
				size="md"
				rounded
				variant="transparent"
				outline={false}
				hoverable={false}
				className="verre-dense verre-bouton h-auto min-h-cladd-md w-16 md:w-auto"
				contentClassName="flex-col gap-1 px-1 md:flex-row md:gap-2 md:px-3"
				aria-label={
					indisponible
						? etat.phrase
						: portee === null
							? 'Demander au logiciel. Ce fil est borné à un dossier : ouvrez-en un dans la file.'
							: `Demander au logiciel, sur ${portee}.`
				}
				onClick={onOuvrir}
			>
				<MessageCircleIcon size={20} aria-hidden />
				<span className="text-cladd-4xs leading-none font-medium md:text-cladd-2xs">
					{indisponible ? 'Indisponible' : 'Demander'}
				</span>
			</Button>

			{/* Le compte de ce qu'il a à dire, à cheval sur le bord : la même pastille
			    que celle des onglets, affichée seulement au-dessus de zéro. */}
			{etat.genre === 'A_DIRE' ? (
				<span className="absolute -top-1 -right-1">
					<PastilleDeRappel compte={etat.compte} />
				</span>
			) : null}
		</span>
	);
}
