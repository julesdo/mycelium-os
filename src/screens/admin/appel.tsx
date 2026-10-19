import { useState } from 'react';
import { List, ListButton, ListTitle, Segmented, SegmentedButton, Textarea } from '@cladd-ui/react';
import { CheckIcon, PhoneIcon } from 'lucide-react';
import { BoutonPrincipal, BoutonSecondaire, EnTeteDeGroupe, FeuillePleinEcran } from '../../ui';
import { dateCourteDeParis, jourDeParis } from '../../lib/admin/dates';
import { LIBELLES_DES_ISSUES, type IssueAppel } from '../../lib/crm/appels';
import { prenomDe } from '../../lib/crm/modeles';
import type { Parcours } from '../../lib/crm/parcours';
import { scriptDuParcours } from '../../lib/crm/scripts';
import { sourceDuContact } from '../../lib/crm/source';
import { valeursDeLaLoi, valeursPubliques } from '../../lib/crm/valeurs-loi';

/**
 * LA FEUILLE D'APPEL (19/10/2026, audit stratégique : « le téléphone passe en premier »).
 *
 * Tout ce qu'il faut pendant l'appel, sur une page : le numéro à toucher, ce qu'on
 * sait avant de décrocher (l'estimation d'un fournisseur public), le script de son
 * parcours, puis l'issue en un toucher et ce qui s'est dit. Le seul bouton plein note
 * l'appel ; l'issue fait le reste (statut, prochaine action, étape, « Stop »).
 */

export interface ProspectAAppeler {
	readonly entreprise: string;
	readonly telephone: string;
	readonly parcours: Parcours;
	readonly dirigeant?: string;
	readonly trouveOu?: string;
	readonly montantEstimeCentimes?: bigint;
	readonly dateButoir?: string;
}

export type DansJours = 1 | 3 | 7;

/** Les issues, dans l'ordre où l'appel les rencontre : pas joint, puis joint. */
const PAS_JOINT: readonly IssueAppel[] = ['PAS_DE_REPONSE', 'MESSAGE_LAISSE', 'BARRAGE'];
const JOINT: readonly IssueAppel[] = [
	'A_RAPPELER',
	'RDV',
	'EMAIL_ACCEPTE',
	'INTERESSE',
	'PAS_INTERESSE',
	'STOP'
];

/** Les issues qui demandent quand reprendre. */
const AVEC_UNE_DATE: readonly IssueAppel[] = ['A_RAPPELER', 'RDV'];

function eurosRonds(centimes: bigint): string {
	return `${new Intl.NumberFormat('fr-FR').format(Number(centimes / 100n))} €`;
}

function Paragraphe({ children }: { readonly children: string }) {
	return (
		<p className="verre-carte rounded-cladd-xl px-3.5 py-3 text-cladd-2xs leading-relaxed">
			{children}
		</p>
	);
}

export function FeuilleDAppel({
	ouverte,
	onFermer,
	prospect,
	appelant,
	maintenant,
	onNoter
}: {
	readonly ouverte: boolean;
	readonly onFermer: () => void;
	readonly prospect: ProspectAAppeler;
	/** Le prénom de qui appelle, dit à l'ouverture. */
	readonly appelant: string;
	readonly maintenant: number;
	readonly onNoter: (issue: IssueAppel, texte: string, dansJours?: DansJours) => Promise<void>;
}) {
	const [issue, setIssue] = useState<IssueAppel | null>(null);
	const [dans, setDans] = useState<DansJours>(1);
	const [texte, setTexte] = useState('');
	const [enCours, setEnCours] = useState(false);

	const jour = jourDeParis(maintenant);
	const prenom = prenomDe(prospect.dirigeant);
	const source = sourceDuContact(prospect.trouveOu);
	const script = scriptDuParcours(prospect.parcours, {
		appelant,
		entreprise: prospect.entreprise,
		...(prenom === undefined ? {} : { prenom }),
		source,
		loi: valeursDeLaLoi(jour),
		publiques: valeursPubliques(jour)
	});

	async function noter() {
		if (issue === null) return;
		setEnCours(true);
		try {
			await onNoter(issue, texte, AVEC_UNE_DATE.includes(issue) ? dans : undefined);
			setIssue(null);
			setTexte('');
			onFermer();
		} catch {
			// Le refus est dit par l'appelant ; la feuille reste ouverte, l'issue gardée.
		} finally {
			setEnCours(false);
		}
	}

	const estimation =
		prospect.montantEstimeCentimes === undefined
			? null
			: [
					`Au plus ${eurosRonds(prospect.montantEstimeCentimes)}`,
					prospect.dateButoir === undefined
						? null
						: `date butoir le ${dateCourteDeParis(Date.parse(`${prospect.dateButoir}T12:00:00Z`))}`
				]
					.filter(Boolean)
					.join(', ');

	const rangee = (i: IssueAppel) => (
		// La taille par défaut de la liste (`lg`, 44 px) : le plancher tactile d'une rangée.
		// La teinte ne marque que l'issue choisie.
		<ListButton
			key={i}
			selected={issue === i}
			{...(issue === i ? { color: 'brand' as const } : {})}
			after={issue === i ? <CheckIcon /> : undefined}
			onClick={() => setIssue(i)}
		>
			{LIBELLES_DES_ISSUES[i]}
		</ListButton>
	);

	return (
		<FeuillePleinEcran
			ouverte={ouverte}
			onFermer={onFermer}
			titre="Appeler"
			sousTitre={prospect.entreprise}
			pied={
				<BoutonPrincipal
					pleineLargeur
					disabled={enCours || issue === null}
					onClick={() => void noter()}
				>
					{issue === null ? 'Choisissez comment ça s’est passé' : 'Noter l’appel'}
				</BoutonPrincipal>
			}
		>
			<div className="flex flex-col gap-cladd-sm">
				<div className="flex flex-col gap-1.5">
					<BoutonSecondaire as="a" href={`tel:${prospect.telephone}`} pleineLargeur>
						<PhoneIcon />
						{prospect.telephone}
					</BoutonSecondaire>
					{estimation === null ? null : (
						<p className="px-1 text-center text-cladd-3xs text-cladd-fg-soft">{estimation}</p>
					)}
					{source === null ? (
						<p className="px-1 text-center text-cladd-3xs text-cladd-fg-soft">
							« Trouvé où » n’est pas renseigné : la personne a le droit de savoir d’où vient son
							numéro.
						</p>
					) : null}
				</div>

				<section className="flex flex-col gap-cladd-3xs">
					<EnTeteDeGroupe libelle="Le script" />
					<Paragraphe>{script.ouverture}</Paragraphe>
					<ul className="verre-carte flex list-disc flex-col gap-1 rounded-cladd-xl py-3 pr-3.5 pl-8 text-cladd-2xs">
						{script.questions.map((q) => (
							<li key={q}>{q}</li>
						))}
					</ul>
					<Paragraphe>{script.phrase}</Paragraphe>
					<Paragraphe>{script.demande}</Paragraphe>
				</section>

				<section className="flex flex-col gap-cladd-3xs">
					<EnTeteDeGroupe libelle="S’il répond" />
					{script.objections.map((o) => (
						<div
							key={o.objection}
							className="verre-carte flex flex-col gap-1 rounded-cladd-xl px-3.5 py-3 text-cladd-2xs"
						>
							<span className="font-medium">{o.objection}</span>
							<span className="text-cladd-fg-soft">{o.reponse}</span>
						</div>
					))}
					<Paragraphe>{script.sortie}</Paragraphe>
				</section>

				<section className="flex flex-col gap-cladd-3xs">
					<EnTeteDeGroupe libelle="Comment ça s’est passé" />
					<div className="verre-carte rounded-cladd-xl">
						<List>
							<ListTitle>Pas joint</ListTitle>
							{PAS_JOINT.map(rangee)}
							<ListTitle>Joint</ListTitle>
							{JOINT.map(rangee)}
						</List>
					</div>
				</section>

				{issue !== null && AVEC_UNE_DATE.includes(issue) ? (
					<div className="flex flex-col gap-1.5">
						<span className="px-1 text-cladd-2xs text-cladd-fg-soft">
							{issue === 'RDV' ? 'Le rendez-vous' : 'Le rappeler'}
						</span>
						<Segmented activeColor="brand" activeVariant="solid-fill" className="w-full">
							<SegmentedButton active={dans === 1} onClick={() => setDans(1)}>
								Demain
							</SegmentedButton>
							<SegmentedButton active={dans === 3} onClick={() => setDans(3)}>
								Dans 3 j
							</SegmentedButton>
							<SegmentedButton active={dans === 7} onClick={() => setDans(7)}>
								Dans 7 j
							</SegmentedButton>
						</Segmented>
					</div>
				) : null}

				{issue === 'STOP' ? (
					<p className="px-1 text-cladd-2xs text-cladd-fg-soft">
						Ses coordonnées seront effacées et son adresse mise sur la liste des adresses à ne plus
						contacter. Cela ne se défait pas.
					</p>
				) : null}

				<label className="flex flex-col gap-1.5">
					<span className="px-1 text-cladd-2xs text-cladd-fg-soft">
						Ce qui s’est dit (facultatif)
					</span>
					<Textarea
						size="lg"
						value={texte}
						onChange={(v) => setTexte(v)}
						placeholder="Paie l’hôpital à 90 jours, rappeler après le 3…"
					/>
				</label>
			</div>
		</FeuillePleinEcran>
	);
}
