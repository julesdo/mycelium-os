import { useState } from 'react';
import { Input, Segmented, SegmentedButton } from '@cladd-ui/react';
import { SearchIcon } from 'lucide-react';
import {
	BoutonPrincipal,
	BoutonSecondaire,
	CarteBouton,
	FeuillePleinEcran,
	ListeDeCartes,
	MessageErreur,
	ZoneDeTexte
} from '../../ui';
import { BlocDeFiche } from '../../ui/admin';
import { CIBLES, LIBELLES_DES_CIBLES, type Cible } from '../../lib/crm/statuts';
import { parcoursParDefaut, type Parcours } from '../../lib/crm/parcours';
import { ChoixDuParcours } from './choix-du-parcours';

/**
 * AJOUTER OU MODIFIER UN PROSPECT (16/10/2026), en page pleine.
 *
 * Le SIREN se cherche au registre par le nom, comme à l'inscription : un toucher sur
 * un candidat remplit l'entreprise, le SIREN et la ville. Rien n'est choisi pour
 * vous, et rien ne s'écrit avant « Enregistrer ».
 *
 * « Trouvé où » est la source légale du contact : un annuaire public, un salon, une
 * recommandation. Il se garde avec le prospect.
 *
 * Le parcours se choisit ici (lot pilote du 27/10/2026) : proposé d'après la cible et
 * l'activité tant qu'on n'en a pas choisi un, et un fournisseur public ou un pilote ne
 * se proposent jamais, ils se décident.
 */

const CHAMPS_TEXTE = [
	'entreprise',
	'siren',
	'activite',
	'effectif',
	'ville',
	'dirigeant',
	'fonction',
	'email',
	'telephone',
	'site',
	'trouveOu',
	'prochaineAction',
	'notes'
] as const;
type ChampTexte = (typeof CHAMPS_TEXTE)[number];

/** Ce que le formulaire saisit, prêt pour le serveur : un texte vide efface, `null` efface la date. */
export type ChampsProspect = Record<ChampTexte, string> & {
	readonly cible: Cible;
	readonly parcours: Parcours;
	readonly prochaineActionLe: number | null;
};

export interface CandidatDuRegistre {
	readonly siren: string;
	readonly denomination: string;
	readonly formeJuridique?: string;
	readonly ville?: string;
}

/** Le message d'un refus du serveur, sans l'enveloppe technique qui l'entoure. */
export function messageDeRefus(erreur: unknown): string {
	if (erreur instanceof Error) {
		const donnee = (erreur as Error & { data?: unknown }).data;
		return typeof donnee === 'string' ? donnee : erreur.message;
	}
	return 'L’enregistrement a échoué. Réessayez.';
}

/** « 2026-10-16 » (champ de date) ↔ midi UTC de ce jour. */
function versInstant(jour: string): number | null {
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(jour);
	return m === null ? null : Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
}
function versJour(instant: number | undefined): string {
	return instant === undefined ? '' : new Date(instant).toISOString().slice(0, 10);
}

export type ProspectInitial = Partial<Record<ChampTexte, string>> & {
	readonly cible?: Cible;
	readonly parcours?: Parcours;
	readonly prochaineActionLe?: number;
};

export function FeuilleProspect({
	ouverte,
	onFermer,
	titre,
	initial,
	onEnregistrer,
	onChercherAuRegistre
}: {
	readonly ouverte: boolean;
	readonly onFermer: () => void;
	readonly titre: string;
	readonly initial?: ProspectInitial;
	readonly onEnregistrer: (champs: ChampsProspect) => Promise<void>;
	readonly onChercherAuRegistre?: (nom: string) => Promise<readonly CandidatDuRegistre[]>;
}) {
	const [valeurs, setValeurs] = useState<Record<ChampTexte, string>>(
		() =>
			Object.fromEntries(CHAMPS_TEXTE.map((c) => [c, initial?.[c] ?? ''])) as Record<
				ChampTexte,
				string
			>
	);
	const [cible, setCible] = useState<Cible>(initial?.cible ?? 'PME');
	// Choisi, il tient ; sinon il suit la cible et l'activité.
	const [parcoursChoisi, setParcoursChoisi] = useState<Parcours | null>(initial?.parcours ?? null);
	const [jour, setJour] = useState(versJour(initial?.prochaineActionLe));
	const [candidats, setCandidats] = useState<readonly CandidatDuRegistre[] | null>(null);
	const [recherche, setRecherche] = useState<'repos' | 'en-cours' | 'echec'>('repos');
	const [erreur, setErreur] = useState<string | null>(null);
	const [enCours, setEnCours] = useState(false);

	const changer = (champ: ChampTexte) => (valeur: string) =>
		setValeurs((v) => ({ ...v, [champ]: valeur }));

	async function chercher() {
		if (onChercherAuRegistre === undefined || valeurs.entreprise.trim() === '') return;
		setRecherche('en-cours');
		try {
			setCandidats(await onChercherAuRegistre(valeurs.entreprise.trim()));
			setRecherche('repos');
		} catch {
			setRecherche('echec');
		}
	}

	function choisir(c: CandidatDuRegistre) {
		setValeurs((v) => ({
			...v,
			entreprise: c.denomination,
			siren: c.siren,
			...(c.ville === undefined ? {} : { ville: c.ville })
		}));
		setCandidats(null);
	}

	const parcours = parcoursChoisi ?? parcoursParDefaut(cible, valeurs.activite);

	async function enregistrer() {
		setErreur(null);
		setEnCours(true);
		try {
			await onEnregistrer({ ...valeurs, cible, parcours, prochaineActionLe: versInstant(jour) });
			onFermer();
		} catch (e) {
			setErreur(messageDeRefus(e));
		} finally {
			setEnCours(false);
		}
	}

	const champ = (
		cle: ChampTexte,
		libelle: string,
		options: { type?: string; placeholder?: string } = {}
	) => (
		<label className="flex flex-col gap-1.5">
			<span className="px-1 text-cladd-2xs text-cladd-fg-soft">{libelle}</span>
			<Input
				size="lg"
				value={valeurs[cle]}
				onChange={changer(cle)}
				{...(options.type === undefined ? {} : { type: options.type })}
				{...(options.placeholder === undefined ? {} : { placeholder: options.placeholder })}
			/>
		</label>
	);

	return (
		<FeuillePleinEcran
			ouverte={ouverte}
			onFermer={onFermer}
			titre={titre}
			pied={
				<BoutonPrincipal
					pleineLargeur
					disabled={enCours || valeurs.entreprise.trim() === ''}
					onClick={() => void enregistrer()}
				>
					Enregistrer
				</BoutonPrincipal>
			}
		>
			<div className="flex flex-col gap-cladd-sm">
				<BlocDeFiche titre="L’entreprise">
					<div className="flex flex-col gap-cladd-2xs">
						<div className="flex items-end gap-2">
							<div className="min-w-0 flex-1">{champ('entreprise', 'Nom')}</div>
							{onChercherAuRegistre === undefined ? null : (
								<BoutonSecondaire
									disabled={valeurs.entreprise.trim() === '' || recherche === 'en-cours'}
									onClick={() => void chercher()}
								>
									<SearchIcon aria-hidden />
									Au registre
								</BoutonSecondaire>
							)}
						</div>
						{recherche === 'echec' ? (
							<MessageErreur>
								Le registre ne répond pas. Le SIREN se saisit aussi à la main.
							</MessageErreur>
						) : null}
						{candidats === null ? null : candidats.length === 0 ? (
							<p className="px-1 text-cladd-2xs text-cladd-fg-soft">
								Le registre ne connaît aucune entreprise à ce nom.
							</p>
						) : (
							<ListeDeCartes>
								{candidats.map((c) => (
									<CarteBouton
										key={c.siren}
										titre={c.denomination}
										ligne={[c.formeJuridique, c.ville, `SIREN ${c.siren}`]
											.filter(Boolean)
											.join(' · ')}
										chevron={false}
										onClick={() => choisir(c)}
									/>
								))}
							</ListeDeCartes>
						)}
						{champ('siren', 'SIREN', { placeholder: '9 chiffres' })}
						{champ('activite', 'Activité')}
						<div className="grid grid-cols-2 gap-cladd-2xs">
							{champ('ville', 'Ville')}
							{champ('effectif', 'Effectif')}
						</div>
						<div className="flex flex-col gap-1.5">
							<span className="px-1 text-cladd-2xs text-cladd-fg-soft">Cible</span>
							<Segmented activeColor="brand" activeVariant="solid-fill" className="w-full">
								{CIBLES.map((c) => (
									<SegmentedButton key={c} active={cible === c} onClick={() => setCible(c)}>
										{LIBELLES_DES_CIBLES[c]}
									</SegmentedButton>
								))}
							</Segmented>
						</div>
						<div className="flex flex-col gap-1.5">
							<span className="px-1 text-cladd-2xs text-cladd-fg-soft">Parcours</span>
							<ChoixDuParcours
								parcours={parcours}
								onChoisir={setParcoursChoisi}
								pleineLargeur
								popoverPosition="bottom-start"
							/>
						</div>
					</div>
				</BlocDeFiche>

				<BlocDeFiche titre="Le contact">
					<div className="flex flex-col gap-cladd-2xs">
						<div className="grid grid-cols-2 gap-cladd-2xs">
							{champ('dirigeant', 'Nom')}
							{champ('fonction', 'Fonction')}
						</div>
						{champ('email', 'E-mail', { type: 'email' })}
						<div className="grid grid-cols-2 gap-cladd-2xs">
							{champ('telephone', 'Téléphone', { type: 'tel' })}
							{champ('site', 'Site')}
						</div>
						{champ('trouveOu', 'Trouvé où', {
							placeholder: 'Annuaire public, salon, recommandation'
						})}
					</div>
				</BlocDeFiche>

				<BlocDeFiche titre="La suite">
					<div className="flex flex-col gap-cladd-2xs">
						<div className="grid grid-cols-2 gap-cladd-2xs">
							{champ('prochaineAction', 'Prochaine action', { placeholder: 'Appeler' })}
							<label className="flex flex-col gap-1.5">
								<span className="px-1 text-cladd-2xs text-cladd-fg-soft">Le</span>
								<Input size="lg" type="date" value={jour} onChange={setJour} />
							</label>
						</div>
						<label className="flex flex-col gap-1.5">
							<span className="px-1 text-cladd-2xs text-cladd-fg-soft">Notes</span>
							<ZoneDeTexte
								nom="Notes"
								size="lg"
								value={valeurs.notes}
								onChange={changer('notes')}
							/>
						</label>
					</div>
				</BlocDeFiche>

				{erreur === null ? null : <MessageErreur>{erreur}</MessageErreur>}
			</div>
		</FeuillePleinEcran>
	);
}
