import { useEffect, useState, type ReactNode } from 'react';
import { Chip, Segmented, SegmentedButton, SurfaceCut } from '@cladd-ui/react';
import {
	BellIcon,
	CalendarCheckIcon,
	CheckIcon,
	MessageCircleIcon,
	UnlockIcon
} from 'lucide-react';
import {
	DUREE_ESSAI_JOURS,
	FORMULES,
	GRILLE,
	JOURS_DE_REMBOURSEMENT,
	LIMITES,
	RAPPELS_AVANT_PRELEVEMENT_JOURS,
	moisOfferts,
	montantDuRythme,
	type Formule,
	type Rythme
} from '../lib/config/tarifs';
import { BoutonPrincipal, BoutonTexte } from './bouton';
import { cn } from './cn';
import { prixAffiche } from './format';
import { FeuillePleinEcran } from './plein-ecran';
import { INSECABLE, ceQuiEstPreleve, montantCourt } from './montants-abonnement';

/**
 * CHOISIR SA FORMULE — la page où l'on souscrit, la même partout : Compte ›
 * Abonnement et l'étape « Les relances » des premiers pas.
 *
 * Relevé sur Mobbin le 14/10/2026 (`docs/superpowers/specs/2026-10-14-pricing-abonnements.md`) :
 *
 *   · LA FRISE DE L'ESSAI, comme Duolingo, Brilliant et Confluence : ce qui se
 *     passe aujourd'hui, quand on vous prévient, quand vous êtes prélevé. Le
 *     prélèvement ne surprend jamais : sa date et son montant sont écrits avant
 *     qu'on donne sa carte ;
 *   · LE RYTHME EN BASCULE, l'année d'abord, ses mois offerts écrits dessus
 *     (HoneyBook, Everyday Rewards, Cleo) ;
 *   · TROIS CARTES À COCHER, la recommandée marquée et déjà cochée : elle se
 *     change d'un toucher. Le prix de l'année se lit ramené au mois, et son
 *     total dessous ;
 *   · UN SEUL BOUTON PLEIN, qui dit ce qu'il coûte aujourd'hui : « 0 € », et
 *     sous lui la date et le montant du premier prélèvement (Coinbase, Givingli).
 *
 * Ni compte à rebours, ni offre « dernière chance » : le fondateur veut une
 * expérience fiable, pas « cheap ».
 *
 * ⚠️ LE MONTANT PRÉLEVÉ EST ÉCRIT TTC, À CÔTÉ DU PRIX HT (21/10/2026). La grille est
 * hors taxes, et Paddle fait accepter au client le montant TVA comprise : « 12 € »
 * sur notre page, « 14,40 €/mois » dans sa case à cocher, et le fondateur : « c'est
 * pas clair pour l'utilisateur ». Le montant TTC vient de Paddle lui-même
 * (`PricePreview`, la TVA du pays du client) : aucun taux n'est écrit ici. Tant
 * qu'il n'est pas lu, la page dit « TVA en plus ».
 */
export function ChoixDeFormule({
	ouverte,
	onFermer,
	recommandee,
	essaiDisponible,
	enCours,
	maintenant,
	onChoisir,
	plusTard,
	retour = false,
	utilisateurs = 1,
	actuelle,
	bienvenue,
	ttc,
	onVoirLesPrix,
	contexte,
	titre
}: {
	readonly ouverte: boolean;
	readonly onFermer: () => void;
	/** Cochée à l'ouverture, marquée « Recommandée ». */
	readonly recommandee: Formule;
	/** Trente jours offerts, ou un abonnement prélevé tout de suite. */
	readonly essaiDisponible: boolean;
	/** Le paiement Paddle est en train de s'ouvrir. */
	readonly enCours: boolean;
	/** L'heure lue une fois par l'écran : les dates de la frise en dépendent. */
	readonly maintenant: number;
	readonly onChoisir: (formule: Formule, rythme: Rythme) => void;
	/** Un geste en texte sous le bouton, quand on peut remettre à plus tard. */
	readonly plusTard?: { readonly libelle: string; readonly onClick: () => void };
	/** La feuille est une étape d'un parcours : un retour au lieu de la croix. */
	readonly retour?: boolean;
	/** Les personnes qui ont déjà accès : une formule qui en compte moins le dit. */
	readonly utilisateurs?: number;
	/**
	 * La formule souscrite : la page sert à en CHANGER. Pas de frise, la formule
	 * actuelle est marquée, et le bouton mène à la confirmation chiffrée.
	 */
	readonly actuelle?: { readonly formule: Formule; readonly rythme: Rythme };
	/** L'offre de bienvenue après un diagnostic : sa remise s'applique aux formules au mois. */
	readonly bienvenue?: {
		readonly pourcent: number;
		readonly mois: number;
		readonly dernierJour: string;
	};
	/** Les montants TVA comprise, en centimes, tels que Paddle les prélèvera. */
	readonly ttc?: MontantsTTC | null;
	/** Demande ces montants à Paddle : la page vient de s'ouvrir. */
	readonly onVoirLesPrix?: () => void;
	/** Pourquoi la page s'ouvre, en tête : « Pour inviter marie@… ». */
	readonly contexte?: string;
	/** Le titre de la page, quand elle sert un geste : « Suivre Garage Martin ». */
	readonly titre?: string;
}) {
	// Paddle.js est un système extérieur : la page ouverte, on lui demande ses montants.
	useEffect(() => {
		if (ouverte) onVoirLesPrix?.();
	}, [ouverte, onVoirLesPrix]);

	const [formule, setFormule] = useState<Formule>(actuelle?.formule ?? recommandee);
	const [rythme, setRythme] = useState<Rythme>(actuelle?.rythme ?? 'annuel');
	const inchangee =
		actuelle !== undefined && actuelle.formule === formule && actuelle.rythme === rythme;

	const montant = montantDuRythme(formule, rythme);
	const montantTTC = ttc?.[`${formule}-${rythme}`];
	const premierPrelevement = maintenant + DUREE_ESSAI_JOURS * JOUR;
	const offerts = moisOfferts(formule);

	return (
		<FeuillePleinEcran
			ouverte={ouverte}
			onFermer={onFermer}
			retour={retour}
			titre={titre ?? (actuelle === undefined ? 'Choisir votre formule' : 'Changer de formule')}
			pied={
				<>
					<BoutonPrincipal
						pleineLargeur
						loading={enCours}
						disabled={enCours || inchangee}
						onClick={() => onChoisir(formule, rythme)}
					>
						{actuelle !== undefined
							? inchangee
								? 'C’est votre formule'
								: 'Continuer'
							: essaiDisponible
								? 'Commencer l’essai, 0 € aujourd’hui'
								: montantTTC === undefined
									? `M’abonner, ${prixAffiche(montant * 100)} HT`
									: `M’abonner, ${montantCourt(montant * 100, montantTTC)}`}
					</BoutonPrincipal>
					<p className="text-center text-cladd-2xs leading-relaxed text-cladd-fg-soft">
						{actuelle !== undefined
							? 'Vous voyez ce que le changement coûte avant de le confirmer.'
							: essaiDisponible
								? `Premier prélèvement le ${dateEnLettres(premierPrelevement)} : ${ceQuiEstPreleve(montant * 100, montantTTC)}, puis ${rythme === 'annuel' ? 'chaque année' : 'chaque mois'}. Annulable jusqu’à la veille.`
								: `${montantTTC === undefined ? 'TVA en plus, puis' : `Soit ${prixAffiche(montant * 100)} HT, puis`} ${rythme === 'annuel' ? 'chaque année' : 'chaque mois'}. Résiliable à tout moment depuis Compte › Abonnement.`}
					</p>
					{plusTard ? (
						<BoutonTexte className="self-center" onClick={plusTard.onClick}>
							{plusTard.libelle}
						</BoutonTexte>
					) : null}
				</>
			}
		>
			{contexte === undefined ? null : (
				<p className="px-1 text-cladd-xs leading-relaxed text-cladd-fg-soft">{contexte}</p>
			)}
			{essaiDisponible && actuelle === undefined ? (
				<FriseDeLEssai maintenant={maintenant} montant={montant} montantTTC={montantTTC} />
			) : null}

			<SurfaceCut
				outline
				className="w-fit max-w-full self-center rounded-full"
				contentClassName="p-1"
			>
				<Segmented activeColor="brand" activeVariant="solid-fill">
					<SegmentedButton active={rythme === 'annuel'} onClick={() => setRythme('annuel')}>
						À l’année · {offerts} mois offerts
					</SegmentedButton>
					<SegmentedButton active={rythme === 'mensuel'} onClick={() => setRythme('mensuel')}>
						Au mois
					</SegmentedButton>
				</Segmented>
			</SurfaceCut>

			{bienvenue === undefined || actuelle !== undefined ? null : (
				<p className="px-1 text-center text-cladd-2xs leading-relaxed text-cladd-fg-soft">
					{`Votre offre de bienvenue : ${bienvenue.pourcent} % sur vos ${MOIS_EN_LETTRES[bienvenue.mois] ?? bienvenue.mois} premiers mois${rythme === 'annuel' ? ', en formule au mois' : ''}, jusqu’au ${dateEnLettres(Date.parse(`${bienvenue.dernierJour}T12:00:00Z`))}.`}
				</p>
			)}

			<div role="radiogroup" aria-label="Votre formule" className="flex flex-col gap-2">
				{FORMULES.map((f) => (
					<CarteDeFormule
						key={f}
						formule={f}
						rythme={rythme}
						choisie={f === formule}
						recommandee={actuelle === undefined && f === recommandee}
						actuelle={actuelle?.formule === f}
						utilisateurs={utilisateurs}
						montantTTC={ttc?.[`${f}-${rythme}`]}
						onChoisir={() => setFormule(f)}
					/>
				))}
			</div>

			<p className="px-1 text-cladd-2xs leading-relaxed text-cladd-fg-softer">
				Prix hors taxes ; le montant TTC est celui que Paddle prélève, avec la TVA de votre pays.
				Paddle, notre revendeur, encaisse le paiement et émet la facture. Votre carte ne passe
				jamais par nos serveurs. Un paiement se rembourse sur demande dans les{' '}
				{JOURS_DE_REMBOURSEMENT} jours.
			</p>
		</FeuillePleinEcran>
	);
}

/** Les montants TVA comprise, par formule et par rythme (et l'offre fondateurs), en centimes. */
export type MontantsTTC = Readonly<Partial<Record<`${Formule}-${Rythme}` | 'fondateurs', number>>>;

const JOUR = 24 * 60 * 60 * 1000;
const MOIS_EN_LETTRES = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six'];

/** « 1er novembre », « 14 novembre » : `Intl` écrit « 1 novembre », le premier prend son « er ». */
function dateEnLettres(ms: number): string {
	return new Date(ms)
		.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
		.replace(/^1 /, '1er ');
}

/** Une formule, cochable. Le prix suit le rythme choisi au-dessus. */
function CarteDeFormule({
	formule,
	rythme,
	choisie,
	recommandee,
	actuelle,
	utilisateurs,
	montantTTC,
	onChoisir
}: {
	readonly formule: Formule;
	readonly rythme: Rythme;
	readonly choisie: boolean;
	readonly recommandee: boolean;
	readonly actuelle: boolean;
	readonly utilisateurs: number;
	/** Le même prix TVA comprise, en centimes, quand Paddle l'a donné. */
	readonly montantTTC: number | undefined;
	readonly onChoisir: () => void;
}) {
	const grille = GRILLE[formule];
	const limites = LIMITES[formule];
	// À l'année, le prix de l'année : rond. Ramené au mois, il tombait sur des centimes.
	const prix = rythme === 'annuel' ? grille.annuel * 100 : grille.mensuel * 100;

	return (
		<button
			type="button"
			role="radio"
			aria-checked={choisie}
			onClick={onChoisir}
			className={cn(
				'verre-carte verre-bouton flex w-full items-start gap-3 rounded-cladd-xl px-3.5 py-3 text-left',
				choisie && 'outline-2 outline-cladd-primary'
			)}
		>
			<span className="flex min-w-0 flex-1 flex-col gap-1">
				<span className="flex flex-wrap items-center gap-2">
					<span className="text-cladd-sm font-bold">{grille.nom}</span>
					{recommandee ? (
						<Chip color="brand" size="sm">
							Recommandée
						</Chip>
					) : null}
					{actuelle ? (
						<Chip color="neutral" size="sm">
							Votre formule
						</Chip>
					) : null}
				</span>
				<span className="text-cladd-2xs text-cladd-fg-soft">{grille.pour}</span>
				<span className="flex flex-wrap items-baseline gap-x-1.5 pt-0.5">
					<span className="text-cladd-md font-extrabold tabular-nums">{prixAffiche(prix)}</span>
					<span className="text-cladd-2xs text-cladd-fg-soft">
						{rythme === 'annuel'
							? `HT par an${montantTTC === undefined ? '' : ` (${prixAffiche(montantTTC)}${INSECABLE}TTC)`}, soit ${moisOfferts(formule)} mois offerts`
							: `HT par mois${montantTTC === undefined ? '' : ` (${prixAffiche(montantTTC)}${INSECABLE}TTC)`}, sans engagement`}
					</span>
				</span>
				<span className="text-cladd-2xs text-cladd-fg-soft">
					{limites.clientsSuivis === null
						? 'Clients en retard sans limite'
						: `${limites.clientsSuivis} clients en retard suivis`}
					{' · '}
					{limites.utilisateurs === 1 ? '1 utilisateur' : `${limites.utilisateurs} utilisateurs`}
				</span>
				{utilisateurs > limites.utilisateurs ? (
					<span className="text-cladd-2xs font-medium">
						Vous êtes {utilisateurs} à y avoir accès :{' '}
						{limites.utilisateurs === 1 ? 'un seul accès' : `${limites.utilisateurs} accès`} avec{' '}
						{grille.nom}.
					</span>
				) : null}
			</span>
			<span
				aria-hidden
				className={cn(
					'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2',
					choisie ? 'border-cladd-primary bg-cladd-primary text-white' : 'border-cladd-fg/25'
				)}
			>
				{choisie ? <CheckIcon className="size-3" strokeWidth={3} /> : null}
			</span>
		</button>
	);
}

/**
 * La frise : aujourd'hui, les deux rappels, le premier prélèvement. Chaque date
 * est calculée, aucune n'est approximative : c'est la promesse qu'on tient.
 */
function FriseDeLEssai({
	maintenant,
	montant,
	montantTTC
}: {
	readonly maintenant: number;
	readonly montant: number;
	readonly montantTTC: number | undefined;
}) {
	const [premier, second] = RAPPELS_AVANT_PRELEVEMENT_JOURS;
	const fin = maintenant + DUREE_ESSAI_JOURS * JOUR;
	const etapes: readonly { icone: ReactNode; quand: string; quoi: string }[] = [
		{
			icone: <UnlockIcon />,
			quand: 'Aujourd’hui',
			quoi: 'Tout s’ouvre : les relances partent, à votre nom. 0 € prélevé.'
		},
		{
			icone: <MessageCircleIcon />,
			quand: dateEnLettres(fin - premier * JOUR),
			quoi: 'Plume fait le point : ce qui est parti, ce qui est rentré.'
		},
		{
			icone: <BellIcon />,
			quand: dateEnLettres(fin - second * JOUR),
			quoi: 'On vous prévient par e-mail avant le prélèvement.'
		},
		{
			icone: <CalendarCheckIcon />,
			quand: dateEnLettres(fin),
			quoi: `Premier prélèvement de ${ceQuiEstPreleve(montant * 100, montantTTC)}, sauf si vous annulez avant.`
		}
	];

	return (
		<ol className="verre-carte flex flex-col rounded-cladd-xl px-3.5 py-3">
			{etapes.map((e, i) => (
				<li key={e.quand} className="flex gap-3">
					<span className="flex flex-col items-center">
						<span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-cladd-primary/12 text-cladd-primary [&_svg]:size-3.5">
							{e.icone}
						</span>
						{i < etapes.length - 1 ? (
							<span aria-hidden className="w-px flex-1 bg-cladd-fg/15" />
						) : null}
					</span>
					<span className={cn('flex flex-col', i < etapes.length - 1 && 'pb-3')}>
						<span className="text-cladd-xs font-semibold first-letter:uppercase">{e.quand}</span>
						<span className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">{e.quoi}</span>
					</span>
				</li>
			))}
		</ol>
	);
}
