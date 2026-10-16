import { useRef, useState, type ChangeEvent } from 'react';
import { Select } from '@cladd-ui/react';
import { FileSpreadsheetIcon } from 'lucide-react';
import {
	BoutonPrincipal,
	EnTeteDeGroupe,
	FeuillePleinEcran,
	LigneDeReleve,
	ListeDeReleve,
	MessageErreur,
	NombreHero,
	pluriel
} from '../../ui';
import { lireCsv } from '../../lib/crm/csv';
import {
	associerColonnes,
	CHAMPS_IMPORT,
	LIBELLES_DES_CHAMPS,
	type ChampImport
} from '../../lib/crm/colonnes';
import { LIBELLES_DES_STATUTS, type StatutProspect } from '../../lib/crm/statuts';
import { dateCourteDeParis } from '../../lib/admin/dates';
import { nomCourt } from './commun';
import { messageDeRefus } from './formulaire-prospect';

/**
 * L'IMPORT DU TABLEUR DE PROSPECTION, EN ÉTAPES (16/10/2026, sur Intercom et Rox) :
 * le fichier → les colonnes (associées seules par leur titre, chacune avec trois
 * valeurs d'exemple, modifiables) → la vérification (ce qui entrera, ce qui est
 * écarté et pourquoi) → le résumé. Rien ne s'écrit avant « Importer ».
 */

export interface BilanAffiche {
	readonly aImporter: number;
	readonly ecartees: readonly {
		readonly ligne: number;
		readonly raison: string;
		readonly entreprise: string;
	}[];
	readonly apercu: readonly {
		readonly entreprise: string;
		readonly ville?: string;
		readonly statut: string;
	}[];
}

export interface ImportPasse {
	readonly fichier: string;
	readonly importes: number;
	readonly ecartes: number;
	readonly par: string;
	readonly le: number;
}

const RAISONS: Readonly<Record<string, string>> = {
	EXEMPLE: 'la ligne d’exemple du tableur',
	SANS_ENTREPRISE: 'pas d’entreprise',
	OPPOSITION: 'a demandé à ne plus être contacté',
	DOUBLON: 'déjà connu, ou en double dans le fichier'
};

/** Au-delà, le serveur refuse : un import se coupe en plusieurs fichiers. */
const LIGNES_MAX = 2000;

type Etape = 'fichier' | 'colonnes' | 'verification' | 'resume';

export function ParcoursImport({
	onFermer,
	onVerifier,
	onImporter,
	historique
}: {
	readonly onFermer: () => void;
	readonly onVerifier: (
		lignes: string[][],
		association: (ChampImport | null)[]
	) => Promise<BilanAffiche>;
	readonly onImporter: (
		fichier: string,
		lignes: string[][],
		association: (ChampImport | null)[]
	) => Promise<{ importes: number; ecartes: number }>;
	readonly historique?: readonly ImportPasse[];
}) {
	const [etape, setEtape] = useState<Etape>('fichier');
	const [fichier, setFichier] = useState('');
	const [entetes, setEntetes] = useState<string[]>([]);
	const [lignes, setLignes] = useState<string[][]>([]);
	const [association, setAssociation] = useState<(ChampImport | null)[]>([]);
	const [bilan, setBilan] = useState<BilanAffiche | null>(null);
	const [resultat, setResultat] = useState<{ importes: number; ecartes: number } | null>(null);
	const [erreur, setErreur] = useState<string | null>(null);
	const [enCours, setEnCours] = useState(false);
	const champFichier = useRef<HTMLInputElement>(null);

	async function lireLeFichier(evenement: ChangeEvent<HTMLInputElement>) {
		const choisi = evenement.target.files?.[0];
		evenement.target.value = '';
		if (choisi === undefined) return;
		setErreur(null);
		const tableau = lireCsv(await choisi.text());
		const [tete, ...corps] = tableau;
		if (tete === undefined || corps.length === 0) {
			setErreur(
				'Ce fichier n’a pas de lignes à importer. Exportez le tableur en CSV, avec sa ligne de titres.'
			);
			return;
		}
		if (corps.length > LIGNES_MAX) {
			setErreur(
				`Ce fichier compte ${corps.length} lignes ; un import en prend ${LIGNES_MAX} au plus. Coupez-le en plusieurs fichiers.`
			);
			return;
		}
		const associees = associerColonnes(tete);
		if (!associees.includes('entreprise')) {
			setErreur(
				'Aucune colonne « Entreprise » dans ce fichier. Est-ce bien le tableur de prospection ?'
			);
			return;
		}
		setFichier(choisi.name);
		setEntetes(tete);
		setLignes(corps);
		setAssociation(associees);
		setEtape('colonnes');
	}

	async function verifier() {
		setErreur(null);
		setEnCours(true);
		try {
			setBilan(await onVerifier(lignes, association));
			setEtape('verification');
		} catch (e) {
			setErreur(messageDeRefus(e));
		} finally {
			setEnCours(false);
		}
	}

	async function importer() {
		setErreur(null);
		setEnCours(true);
		try {
			setResultat(await onImporter(fichier, lignes, association));
			setEtape('resume');
		} catch (e) {
			setErreur(messageDeRefus(e));
		} finally {
			setEnCours(false);
		}
	}

	const titres: Record<Etape, string> = {
		fichier: 'Importer le tableur',
		colonnes: 'Les colonnes',
		verification: 'La vérification',
		resume: 'C’est importé'
	};
	const precedente: Partial<Record<Etape, Etape>> = {
		colonnes: 'fichier',
		verification: 'colonnes'
	};
	const retour = precedente[etape];
	const reconnues = association.filter((c) => c !== null).length;

	const pied =
		etape === 'fichier' ? (
			<BoutonPrincipal pleineLargeur onClick={() => champFichier.current?.click()}>
				Choisir le fichier CSV
			</BoutonPrincipal>
		) : etape === 'colonnes' ? (
			<BoutonPrincipal pleineLargeur disabled={enCours} onClick={() => void verifier()}>
				Vérifier les {lignes.length} ligne{pluriel(lignes.length)}
			</BoutonPrincipal>
		) : etape === 'verification' ? (
			<BoutonPrincipal
				pleineLargeur
				disabled={enCours || (bilan?.aImporter ?? 0) === 0}
				onClick={() => void importer()}
			>
				Importer {bilan?.aImporter ?? 0} prospect{pluriel(bilan?.aImporter ?? 0)}
			</BoutonPrincipal>
		) : (
			<BoutonPrincipal pleineLargeur onClick={onFermer}>
				Voir les prospects
			</BoutonPrincipal>
		);

	return (
		<FeuillePleinEcran
			ouverte
			onFermer={retour === undefined ? onFermer : () => setEtape(retour)}
			retour={retour !== undefined}
			titre={titres[etape]}
			{...(fichier === '' || etape === 'fichier' ? {} : { sousTitre: fichier })}
			pied={pied}
		>
			<div className="flex flex-col gap-cladd-sm">
				<input
					ref={champFichier}
					type="file"
					accept=".csv,text/csv"
					className="sr-only"
					aria-label="Le tableur de prospection, en CSV"
					onChange={(e) => void lireLeFichier(e)}
				/>

				{etape === 'fichier' ? (
					<>
						<div className="flex flex-col items-center gap-cladd-2xs py-cladd-xs text-center">
							<span
								aria-hidden
								className="flex size-14 items-center justify-center rounded-full bg-cladd-fg/[0.06] text-cladd-fg-soft"
							>
								<FileSpreadsheetIcon />
							</span>
							<p className="max-w-sm text-cladd-xs text-cladd-fg-soft">
								Le tableur de prospection exporté en CSV, depuis Excel ou Google Sheets. Les
								colonnes se reconnaissent à leur titre ; vous vérifiez tout avant que rien n’entre.
							</p>
						</div>
						{historique === undefined || historique.length === 0 ? null : (
							<section className="flex flex-col gap-cladd-3xs">
								<EnTeteDeGroupe libelle="Imports précédents" nombre={historique.length} />
								<ListeDeReleve>
									{historique.map((i) => (
										<LigneDeReleve
											key={`${i.fichier}-${i.le}`}
											titre={i.fichier}
											ligne={`${i.importes} importé${pluriel(i.importes)}, ${i.ecartes} écarté${pluriel(i.ecartes)} · ${nomCourt(i.par)}`}
											date={dateCourteDeParis(i.le)}
										/>
									))}
								</ListeDeReleve>
							</section>
						)}
					</>
				) : null}

				{etape === 'colonnes' ? (
					<section className="flex flex-col gap-cladd-3xs">
						<EnTeteDeGroupe
							libelle={`${reconnues} colonne${pluriel(reconnues)} reconnue${pluriel(reconnues)} sur ${entetes.length}`}
						/>
						<div className="verre-carte flex flex-col rounded-cladd-xl [&>*+*]:border-t [&>*+*]:border-cladd-outline">
							{entetes.map((entete, i) => {
								const exemples = lignes
									.map((l) => l[i]?.trim() ?? '')
									.filter((v) => v !== '')
									.slice(0, 3);
								const champ = association[i] ?? null;
								return (
									<div key={`${entete}-${i}`} className="flex items-center gap-3 px-3.5 py-2.5">
										<span className="flex min-w-0 flex-1 flex-col gap-0.5">
											<span className="truncate text-cladd-2xs font-semibold">
												{entete || `Colonne ${i + 1}`}
											</span>
											<span className="truncate text-cladd-3xs text-cladd-fg-soft">
												{exemples.length === 0 ? 'vide' : exemples.join(' · ')}
											</span>
										</span>
										<Select
											size="md"
											title={`« ${entete} » devient`}
											options={['', ...CHAMPS_IMPORT]}
											value={champ ?? ''}
											keyboardHints={false}
											search
											onSearch={(q) =>
												['', ...CHAMPS_IMPORT].filter((c) =>
													(c === '' ? 'ignorer' : LIBELLES_DES_CHAMPS[c as ChampImport])
														.toLowerCase()
														.includes(q.toLowerCase())
												)
											}
											renderOption={({ value }) =>
												value === '' ? 'Ignorer' : LIBELLES_DES_CHAMPS[value as ChampImport]
											}
											onChange={(v) => {
												const suivante = [...association];
												suivante[i] = v === '' ? null : (v as ChampImport);
												setAssociation(suivante);
											}}
											className="w-40 shrink-0 lg:w-56"
										>
											<span className="truncate">
												{champ === null ? 'Ignorer' : LIBELLES_DES_CHAMPS[champ]}
											</span>
										</Select>
									</div>
								);
							})}
						</div>
					</section>
				) : null}

				{etape === 'verification' && bilan !== null ? (
					<>
						<NombreHero
							nombre={bilan.aImporter}
							surTitre="Prospects à importer"
							legende={`sur ${lignes.length} ligne${pluriel(lignes.length)} du fichier`}
						/>
						{bilan.apercu.length === 0 ? null : (
							<section className="flex flex-col gap-cladd-3xs">
								<EnTeteDeGroupe libelle="Ce qui entrera" nombre={bilan.aImporter} />
								<ListeDeReleve>
									{bilan.apercu.map((p, i) => (
										<LigneDeReleve
											key={`${p.entreprise}-${i}`}
											titre={p.entreprise}
											ligne={[p.ville, LIBELLES_DES_STATUTS[p.statut as StatutProspect] ?? p.statut]
												.filter(Boolean)
												.join(' · ')}
										/>
									))}
								</ListeDeReleve>
								{bilan.aImporter > bilan.apercu.length ? (
									<p className="px-1 text-cladd-3xs text-cladd-fg-soft">
										Et {bilan.aImporter - bilan.apercu.length} autre
										{pluriel(bilan.aImporter - bilan.apercu.length)}.
									</p>
								) : null}
							</section>
						)}
						{bilan.ecartees.length === 0 ? null : (
							<section className="flex flex-col gap-cladd-3xs">
								<EnTeteDeGroupe libelle="Pas importé" nombre={bilan.ecartees.length} />
								<ListeDeReleve>
									{bilan.ecartees.map((e) => (
										<LigneDeReleve
											key={e.ligne}
											titre={e.entreprise || `Ligne ${e.ligne + 2}`}
											ligne={RAISONS[e.raison] ?? e.raison}
											date={`ligne ${e.ligne + 2}`}
										/>
									))}
								</ListeDeReleve>
							</section>
						)}
					</>
				) : null}

				{etape === 'resume' && resultat !== null ? (
					<div className="flex flex-col items-center gap-cladd-2xs py-cladd-xs text-center">
						<NombreHero nombre={resultat.importes} surTitre="Prospects importés" />
						{resultat.ecartes === 0 ? null : (
							<p className="text-cladd-xs text-cladd-fg-soft">
								{resultat.ecartes} ligne{pluriel(resultat.ecartes)} écartée
								{pluriel(resultat.ecartes)}, comme annoncé à la vérification.
							</p>
						)}
					</div>
				) : null}

				{erreur === null ? null : <MessageErreur>{erreur}</MessageErreur>}
			</div>
		</FeuillePleinEcran>
	);
}
