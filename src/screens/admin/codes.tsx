import { useState, type ReactNode } from 'react';
import { Input, Segmented, SegmentedButton } from '@cladd-ui/react';
import { BadgePercentIcon, InfinityIcon, ShieldAlertIcon } from 'lucide-react';
import {
	BoutonPrincipal,
	BoutonSecondaire,
	BoutonTexte,
	EnTeteDeGroupe,
	FeuillePleinEcran,
	LigneCopiable,
	ListeDeCartes,
	ListeDeRangees,
	MessageErreur,
	PageEcran,
	VignetteIcone,
	type Lecture
} from '../../ui';
import { FORMULES, GRILLE, type Formule } from '../../lib/config/tarifs';
import {
	MOIS_PROPOSES,
	NOMBRES_DE_CODES,
	POURCENTS_PROPOSES,
	VALIDITES_PROPOSEES,
	libelleDeLAvantage,
	type AvantagePrivilege,
	type EtatDuCode
} from '../../lib/paiement/codes-privilege';
import { dateCourteDeParis } from '../../lib/admin/dates';
import { messageDeRefus } from './formulaire-prospect';

/**
 * LES CODES PRIVILÈGES (27/10/2026), pour le fondateur seul. Relevé sur Mobbin : la
 * création en une feuille chez Stripe, Whop et Luma (le type en cartes chez Klaviyo et
 * Wix), le code montré UNE fois chez Vercel, Coinbase et Gamma (« vous ne le reverrez
 * plus »), la révocation derrière une confirmation qui dit ce qu'elle coupe chez Vercel
 * et fal.
 *
 * ⚠️ AUCUN CODE N'EST RELU ICI. La liste montre le libellé, l'avantage et les quatre
 * derniers signes ; le code entier n'existe qu'à l'écran de sa création.
 */

export interface CodeAffiche {
	readonly id: string;
	readonly fin: string;
	readonly libelle: string;
	readonly avantage: AvantagePrivilege;
	readonly titre: string;
	readonly etat: EtatDuCode;
	readonly creePar: string;
	readonly creeLe: number;
	readonly expireLe?: number;
	readonly utiliseLe?: number;
	readonly utiliseParNom?: string;
	readonly revoqueLe?: number;
}

export interface CreationDeCodes {
	readonly libelle: string;
	readonly avantage: AvantagePrivilege;
	readonly nombre: number;
	readonly validiteJours: number | null;
}

/** « 3 codes », « un code ». */
function codes(n: number): string {
	return n > 1 ? `${n} codes` : 'le code';
}

/** Où en est le code, en entier : qui l'a utilisé ne se coupe jamais. */
function etatEnClair(c: CodeAffiche): string {
	if (c.etat === 'REVOQUE' && c.revoqueLe !== undefined) {
		return `Révoqué le ${dateCourteDeParis(c.revoqueLe)}`;
	}
	if (c.etat === 'UTILISE' && c.utiliseLe !== undefined) {
		return `Utilisé le ${dateCourteDeParis(c.utiliseLe)}${c.utiliseParNom ? ` par ${c.utiliseParNom}` : ''}`;
	}
	if (c.etat === 'EXPIRE' && c.expireLe !== undefined) {
		return `Expiré le ${dateCourteDeParis(c.expireLe)}, jamais utilisé`;
	}
	return c.expireLe === undefined
		? 'Valable sans limite'
		: `Valable jusqu’au ${dateCourteDeParis(c.expireLe)}`;
}

export function EcranCodes({
	lecture,
	onCreer,
	onRevoquer
}: {
	readonly lecture: Lecture<readonly CodeAffiche[]>;
	/** Rend les codes en clair, une seule fois. */
	readonly onCreer: (creation: CreationDeCodes) => Promise<readonly string[]>;
	readonly onRevoquer: (id: string) => Promise<void>;
}) {
	const [creationOuverte, setCreationOuverte] = useState(false);
	const [ouvertures, setOuvertures] = useState(0);
	const [crees, setCrees] = useState<{
		readonly libelle: string;
		readonly codes: readonly string[];
	} | null>(null);
	const [aRevoquer, setARevoquer] = useState<CodeAffiche | null>(null);
	const [erreur, setErreur] = useState<string | null>(null);
	const [enCours, setEnCours] = useState(false);

	const entete = { genre: 'onglet' as const, titre: 'Codes privilèges' };
	if (lecture.etat !== 'pret') return <PageEcran entete={entete} etat={lecture.etat} />;

	const disponibles = lecture.valeur.filter((c) => c.etat === 'DISPONIBLE');
	const utilises = lecture.valeur.filter((c) => c.etat === 'UTILISE');
	const fermes = lecture.valeur.filter((c) => c.etat === 'REVOQUE' || c.etat === 'EXPIRE');

	const carte = (c: CodeAffiche) => (
		<div
			key={c.id}
			className="verre-carte flex min-h-17 flex-col gap-2 rounded-cladd-xl px-3.5 py-2.5 sm:flex-row sm:items-center sm:gap-2.5 sm:py-2"
		>
			<span className="flex min-w-0 flex-1 items-center gap-2.5">
				<VignetteIcone
					icone={c.avantage.genre === 'A_VIE' ? <InfinityIcon /> : <BadgePercentIcon />}
				/>
				<span className="flex min-w-0 flex-1 flex-col gap-0.5">
					<span className="truncate text-cladd-xs font-semibold">{c.libelle}</span>
					<span className="truncate text-cladd-2xs text-cladd-fg-soft">
						{c.titre} · …{c.fin}
					</span>
					<span className="text-cladd-2xs text-cladd-fg-soft">{etatEnClair(c)}</span>
				</span>
			</span>
			{c.etat === 'DISPONIBLE' || c.etat === 'UTILISE' ? (
				<span className="flex shrink-0 justify-end">
					<BoutonTexte onClick={() => setARevoquer(c)} aria-label={`Révoquer ${c.libelle}`}>
						Révoquer
					</BoutonTexte>
				</span>
			) : null}
		</div>
	);

	return (
		<PageEcran entete={entete}>
			<div className="flex flex-col gap-cladd-sm">
				<section className="verre-carte flex flex-col gap-cladd-2xs rounded-cladd-xl p-cladd-2xs lg:flex-row lg:items-center">
					<p className="min-w-0 flex-1 text-cladd-xs leading-relaxed text-cladd-fg-soft">
						Une remise sur un ou plusieurs mois, ou l’accès à vie. Chaque code ne sert qu’une fois,
						se montre une seule fois, et se révoque d’un geste.
					</p>
					<BoutonPrincipal
						onClick={() => {
							setOuvertures((n) => n + 1);
							setCreationOuverte(true);
						}}
					>
						Créer un code
					</BoutonPrincipal>
				</section>

				{erreur === null ? null : <MessageErreur>{erreur}</MessageErreur>}

				{lecture.valeur.length === 0 ? (
					<p className="px-1 text-cladd-xs text-cladd-fg-soft">
						Aucun code pour l’instant. Le premier se crée en trente secondes.
					</p>
				) : null}

				{disponibles.length === 0 ? null : (
					<section className="flex flex-col gap-cladd-3xs">
						<EnTeteDeGroupe libelle="Disponibles" nombre={disponibles.length} />
						<ListeDeCartes>{disponibles.map(carte)}</ListeDeCartes>
					</section>
				)}
				{utilises.length === 0 ? null : (
					<section className="flex flex-col gap-cladd-3xs">
						<EnTeteDeGroupe libelle="Utilisés" nombre={utilises.length} />
						<ListeDeCartes>{utilises.map(carte)}</ListeDeCartes>
					</section>
				)}
				{fermes.length === 0 ? null : (
					<section className="flex flex-col gap-cladd-3xs">
						<EnTeteDeGroupe libelle="Révoqués ou expirés" nombre={fermes.length} />
						<ListeDeCartes>{fermes.map(carte)}</ListeDeCartes>
					</section>
				)}
			</div>

			<FeuilleDeCreation
				key={ouvertures}
				ouverte={creationOuverte}
				onFermer={() => setCreationOuverte(false)}
				onCreer={async (creation) => {
					const resultat = await onCreer(creation);
					setCreationOuverte(false);
					setCrees({ libelle: creation.libelle, codes: resultat });
				}}
			/>

			<FeuillePleinEcran
				ouverte={crees !== null}
				onFermer={() => setCrees(null)}
				titre="Gardez-le en lieu sûr"
				{...(crees === null ? {} : { sousTitre: crees.libelle })}
				pied={
					<BoutonPrincipal pleineLargeur onClick={() => setCrees(null)}>
						{crees !== null && crees.codes.length > 1
							? 'J’ai copié les codes'
							: 'J’ai copié le code'}
					</BoutonPrincipal>
				}
			>
				<div className="flex flex-col gap-cladd-xs">
					<div className="verre-carte flex items-start gap-2.5 rounded-cladd-xl p-cladd-2xs">
						<ShieldAlertIcon aria-hidden className="mt-0.5 size-5 shrink-0 text-cladd-fg-soft" />
						<p className="text-cladd-xs leading-relaxed">
							Vous ne {crees !== null && crees.codes.length > 1 ? 'les' : 'le'} reverrez plus :
							Letikette n’en garde qu’une empreinte. Copiez maintenant, puis envoyez à qui c’est
							destiné, par un canal privé.
						</p>
					</div>
					<ListeDeRangees>
						{(crees?.codes ?? []).map((code, i) => (
							<LigneCopiable
								key={code}
								etiquette={crees !== null && crees.codes.length > 1 ? `Code ${i + 1}` : 'Code'}
								affichage={code}
								valeur={code}
							/>
						))}
					</ListeDeRangees>
					{crees !== null && crees.codes.length > 1 ? (
						<BoutonSecondaire
							className="self-start"
							onClick={() =>
								void navigator.clipboard.writeText(crees.codes.join('\n')).catch(() => undefined)
							}
						>
							Tout copier
						</BoutonSecondaire>
					) : null}
				</div>
			</FeuillePleinEcran>

			<FeuillePleinEcran
				ouverte={aRevoquer !== null}
				onFermer={() => setARevoquer(null)}
				titre="Révoquer ce code ?"
				{...(aRevoquer === null ? {} : { sousTitre: `${aRevoquer.libelle} · …${aRevoquer.fin}` })}
				pied={
					<BoutonPrincipal
						pleineLargeur
						disabled={enCours}
						onClick={() => {
							const cible = aRevoquer;
							if (cible === null) return;
							setErreur(null);
							setEnCours(true);
							onRevoquer(cible.id)
								.then(() => setARevoquer(null))
								.catch((e: unknown) => setErreur(messageDeRefus(e)))
								.finally(() => setEnCours(false));
						}}
					>
						Révoquer
					</BoutonPrincipal>
				}
			>
				<p className="text-cladd-xs leading-relaxed">
					{aRevoquer === null
						? null
						: aRevoquer.etat === 'UTILISE'
							? aRevoquer.avantage.genre === 'A_VIE'
								? `${aRevoquer.utiliseParNom ?? 'L’établissement'} perd tout de suite son accès ${GRILLE[aRevoquer.avantage.formule].nom} offert : sans formule payée, il revient à Découverte. Ses données restent.`
								: `La remise de ${aRevoquer.utiliseParNom ?? 'l’établissement'} s’arrête : retirée de son abonnement, ou effacée si elle attendait encore.`
							: 'Il ne pourra plus être utilisé.'}{' '}
					C’est définitif, et noté au journal.
				</p>
			</FeuillePleinEcran>
		</PageEcran>
	);
}

/** La feuille de création : ce qu'il offre, pour qui, combien de temps, combien. */
function FeuilleDeCreation({
	ouverte,
	onFermer,
	onCreer
}: {
	readonly ouverte: boolean;
	readonly onFermer: () => void;
	readonly onCreer: (creation: CreationDeCodes) => Promise<void>;
}) {
	const [genre, setGenre] = useState<AvantagePrivilege['genre']>('REMISE');
	const [pourcent, setPourcent] = useState<number>(50);
	const [mois, setMois] = useState<number>(3);
	const [formule, setFormule] = useState<Formule>('pro');
	const [libelle, setLibelle] = useState('');
	const [validite, setValidite] = useState<number | null>(30);
	const [nombre, setNombre] = useState<number>(1);
	const [erreur, setErreur] = useState<string | null>(null);
	const [enCours, setEnCours] = useState(false);

	const avantage: AvantagePrivilege =
		genre === 'A_VIE' ? { genre, formule } : { genre, pourcent, mois };
	const pret = libelle.trim().length >= 2 && !enCours;

	const choix = (titre: string, contenu: ReactNode, aide?: string) => (
		<div className="flex flex-col gap-1.5">
			<span className="px-1 text-cladd-2xs text-cladd-fg-soft">{titre}</span>
			{contenu}
			{aide === undefined ? null : (
				<span className="px-1 text-cladd-3xs leading-relaxed text-cladd-fg-softer">{aide}</span>
			)}
		</div>
	);

	return (
		<FeuillePleinEcran
			ouverte={ouverte}
			onFermer={onFermer}
			titre="Nouveau code"
			pied={
				<BoutonPrincipal
					pleineLargeur
					disabled={!pret}
					onClick={() => {
						setErreur(null);
						setEnCours(true);
						onCreer({ libelle: libelle.trim(), avantage, nombre, validiteJours: validite })
							.catch((e: unknown) => setErreur(messageDeRefus(e)))
							.finally(() => setEnCours(false));
					}}
				>
					{`Créer ${codes(nombre)}`}
				</BoutonPrincipal>
			}
		>
			<div className="flex flex-col gap-cladd-sm">
				{choix(
					'Ce qu’il offre',
					<Segmented activeColor="brand" activeVariant="solid-fill" className="w-full">
						<SegmentedButton active={genre === 'REMISE'} onClick={() => setGenre('REMISE')}>
							Une remise
						</SegmentedButton>
						<SegmentedButton active={genre === 'A_VIE'} onClick={() => setGenre('A_VIE')}>
							L’accès à vie
						</SegmentedButton>
					</Segmented>
				)}

				{genre === 'REMISE' ? (
					<>
						{choix(
							'La remise',
							<Segmented activeColor="brand" activeVariant="solid-fill" className="w-full">
								{POURCENTS_PROPOSES.map((p) => (
									<SegmentedButton key={p} active={pourcent === p} onClick={() => setPourcent(p)}>
										{p === 100 ? 'Offert' : `${p} %`}
									</SegmentedButton>
								))}
							</Segmented>
						)}
						{choix(
							'Pendant combien de mois',
							<Segmented activeColor="brand" activeVariant="solid-fill" className="w-full">
								{MOIS_PROPOSES.map((m) => (
									<SegmentedButton key={m} active={mois === m} onClick={() => setMois(m)}>
										{String(m)}
									</SegmentedButton>
								))}
							</Segmented>,
							'Au mois : sur les prochains prélèvements. À l’année : la même valeur, déduite de la prochaine échéance.'
						)}
					</>
				) : (
					choix(
						'La formule offerte',
						<Segmented activeColor="brand" activeVariant="solid-fill" className="w-full">
							{FORMULES.map((f) => (
								<SegmentedButton key={f} active={formule === f} onClick={() => setFormule(f)}>
									{GRILLE[f].nom}
								</SegmentedButton>
							))}
						</Segmented>,
						'Sans aucun prélèvement ; un abonnement en cours s’arrête à son échéance.'
					)
				)}

				<p className="verre-carte rounded-cladd-xl px-3.5 py-3 text-center text-cladd-md font-semibold">
					{libelleDeLAvantage(avantage)}
				</p>

				{choix(
					'Pour qui',
					<Input
						size="lg"
						value={libelle}
						onChange={setLibelle}
						placeholder="Cabinet Martin, partenaire"
						inputComponentProps={{
							'aria-label': 'Pour qui est ce code',
							autoComplete: 'off',
							maxLength: 80
						}}
					/>,
					'Seule l’équipe le lit : il retrouve le code dans la liste.'
				)}

				{choix(
					'Valable',
					<Segmented activeColor="brand" activeVariant="solid-fill" className="w-full">
						{VALIDITES_PROPOSEES.map((j) => (
							<SegmentedButton
								key={j ?? 'toujours'}
								active={validite === j}
								onClick={() => setValidite(j)}
							>
								{j === null ? 'Sans limite' : `${j} jours`}
							</SegmentedButton>
						))}
					</Segmented>,
					'Passé ce délai, un code jamais utilisé ne sert plus. Utilisé à temps, son avantage tient.'
				)}

				{choix(
					'Combien',
					<Segmented activeColor="brand" activeVariant="solid-fill" className="w-full">
						{NOMBRES_DE_CODES.map((n) => (
							<SegmentedButton key={n} active={nombre === n} onClick={() => setNombre(n)}>
								{String(n)}
							</SegmentedButton>
						))}
					</Segmented>,
					'Chacun ne sert qu’une fois.'
				)}

				{erreur === null ? null : <MessageErreur>{erreur}</MessageErreur>}
			</div>
		</FeuillePleinEcran>
	);
}
