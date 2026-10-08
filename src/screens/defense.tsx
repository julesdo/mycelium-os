import { useState } from 'react';
import { Popup, PopupContent } from '@cladd-ui/react';
import { PencilLineIcon, ScaleIcon, StampIcon } from 'lucide-react';
import {
	BoutonTexte,
	CarteBouton,
	CarteProfessionnel,
	EnTeteDeGroupe,
	FeuilleProfessionnel,
	FeuillePresDuClient,
	ListeDeCartes,
	PageEcran,
	PortraitsDeLEquipe,
	RechercheAvocat,
	RechercheCommissaire,
	SaisirUneFiche,
	VignetteIcone,
	proDuCarnet,
	type AvocatAffiche,
	type AvocatProposeAffiche,
	type EtatRechercheAvocat,
	type EtatRechercheCommissaire,
	type EtudeAffichee,
	type EtudeProposee,
	type FicheASaisir,
	type FicheIntervenant,
	type Lecture,
	type PropositionsAffichees,
	type RepertoireAffiche
} from '../ui';
import { TITRE_ECRAN } from './titres';

/**
 * `/app/defense` — VOTRE ÉQUIPE DE DÉFENSE (08/10/2026).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI UN ÉCRAN, ET PLUS UNE RANGÉE « VOTRE CARNET » DANS LE COMPTE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le fondateur : « le choix de la défense est un service qui fait partie de
 * l'app et qui doit être hyper important ». Le carnet vivait replié dans les
 * réglages, en liste de noms avec une corbeille : un annuaire qu'on tient, pas
 * des personnes avec qui on travaille. Sur Alan (« mon équipe de soins ») et
 * Doctolib (« mes praticiens »), l'équipe a sa page : des visages, ce que chacun
 * est, un toucher pour la fiche et ses gestes (appeler, écrire, l'itinéraire).
 *
 * Trois questions, une réponse chacune, à un seul endroit :
 *   · avec qui je travaille — « Votre équipe », une carte par personne ;
 *   · qui exerce près de mes clients — « Près de vos clients », une carte par
 *     client en cours, et sa liste en feuille, lue d'après son SIREN ;
 *   · quelqu'un d'autre — chercher par département ou par barreau, ou le saisir.
 *
 * ⚠️ RIEN N'Y EST RECOMMANDÉ (ligne rouge n° 3). L'équipe est dans l'ordre
 * alphabétique ; les clients aussi ; les professionnels près d'eux dans l'ordre
 * de leur source, la spécialité DÉCLARÉE nommée comme un fait du fichier.
 */

/** Un client en cours, près duquel chercher. */
export interface ClientDeLaDefense {
	readonly id: string;
	readonly nom: string;
	/** « 2 dossiers en cours ». */
	readonly ligne: string;
}

export interface DefenseAffichee {
	/** L'équipe, dans l'ordre alphabétique que rend `monCarnet`. */
	readonly equipe: readonly FicheIntervenant[];
	readonly erreur: string | null;
	readonly enCours: boolean;
	readonly onAjouterALaMain: (fiche: FicheASaisir) => void;
	readonly onOublier: (intervenantId: string) => void;
	/** La vraie photo ou le logo d'un membre de l'équipe. */
	readonly onPhoto: (intervenantId: string, fichier: File) => void;

	/** Les clients qui ont un dossier en cours, dans l'ordre alphabétique. */
	readonly clients: readonly ClientDeLaDefense[];
	/** Le client dont la feuille est ouverte, et ce qui a été lu près de lui. */
	readonly presDuClient: {
		readonly client: string;
		readonly propositions: PropositionsAffichees;
	} | null;
	readonly onOuvrirClient: (clientId: string) => void;
	readonly onFermerClient: () => void;
	readonly onAjouterEtude: (etude: EtudeProposee) => void;
	readonly onAjouterAvocat: (avocat: AvocatProposeAffiche) => void;

	/** La recherche d'études par département, en feuille : une action Convex. */
	readonly rechercheCommissaireOuverte: boolean;
	readonly etatRechercheCommissaire: EtatRechercheCommissaire;
	readonly onOuvrirRechercheCommissaire: () => void;
	readonly onFermerRechercheCommissaire: () => void;
	readonly onChercherCommissaire: (departement: string) => void;
	readonly onRetenirEtude: (etude: EtudeAffichee) => void;

	/** La recherche d'avocats par barreau, sa sœur : elle lit le répertoire ingéré. */
	readonly rechercheAvocatOuverte: boolean;
	readonly repertoire: RepertoireAffiche | null;
	readonly barreau: string;
	readonly specialite: string;
	readonly etatAvocats: EtatRechercheAvocat;
	readonly onOuvrirRechercheAvocat: () => void;
	readonly onFermerRechercheAvocat: () => void;
	readonly onChoisirBarreau: (barreau: string) => void;
	readonly onChoisirSpecialite: (specialite: string) => void;
	readonly onRetenirAvocat: (avocat: AvocatAffiche) => void;
}

function pluriel(n: number): string {
	return n > 1 ? 's' : '';
}

/** « 1 avocat et 2 commissaires de justice avec qui vous travaillez. » */
function legendeDeLEquipe(equipe: readonly FicheIntervenant[]): string {
	if (equipe.length === 0) {
		return 'Les avocats et commissaires de justice avec qui vous travaillez se proposeront en premier dans chaque dossier.';
	}
	const avocats = equipe.filter((f) => f.role === 'AVOCAT').length;
	const commissaires = equipe.filter((f) => f.role === 'COMMISSAIRE_DE_JUSTICE').length;
	const autres = equipe.length - avocats - commissaires;
	const morceaux = [
		avocats === 0 ? null : `${avocats} avocat${pluriel(avocats)}`,
		commissaires === 0
			? null
			: `${commissaires} commissaire${pluriel(commissaires)} de justice`,
		autres === 0 ? null : `${autres} autre${pluriel(autres)}`
	].filter((m) => m !== null);
	const liste =
		morceaux.length <= 1
			? (morceaux[0] ?? '')
			: `${morceaux.slice(0, -1).join(', ')} et ${morceaux.at(-1) ?? ''}`;
	return `${liste} avec qui vous travaillez. Ils se proposent en premier dans chaque dossier.`;
}

export function EcranDefense({ donnees }: { donnees: Lecture<DefenseAffichee> }) {
	const entete = {
		genre: 'poussee',
		retour: { vers: '/app/compte', libelle: TITRE_ECRAN.compte },
		titre: 'Votre défense'
	} as const;

	if (donnees.etat !== 'pret') return <PageEcran entete={entete} etat={donnees.etat} />;
	return (
		<PageEcran entete={entete}>
			<Defense {...donnees.valeur} />
		</PageEcran>
	);
}

function Defense(d: DefenseAffichee) {
	const [ouverteSur, setOuverteSur] = useState<string | null>(null);
	const [saisie, setSaisie] = useState(false);
	const fiche = d.equipe.find((f) => f._id === ouverteSur) ?? null;

	return (
		<div className="flex flex-col gap-cladd-xs">
			<PortraitsDeLEquipe
				equipe={d.equipe.map(proDuCarnet)}
				legende={legendeDeLEquipe(d.equipe)}
			/>

			{d.erreur === null ? null : (
				<p role="alert" className="px-1 text-cladd-xs leading-relaxed">
					{d.erreur}
				</p>
			)}

			{d.equipe.length === 0 ? null : (
				<section className="flex flex-col gap-cladd-3xs">
					<EnTeteDeGroupe libelle="Votre équipe" nombre={d.equipe.length} />
					<div className="flex flex-col gap-2">
						{d.equipe.map((membre) => (
							<CarteProfessionnel
								key={membre._id}
								pro={proDuCarnet(membre)}
								onOuvrir={() => setOuverteSur(membre._id)}
							/>
						))}
					</div>
				</section>
			)}

			{d.clients.length === 0 ? null : (
				<section className="flex flex-col gap-cladd-3xs">
					<EnTeteDeGroupe libelle="Près de vos clients" nombre={d.clients.length} />
					<ListeDeCartes>
						{d.clients.map((client) => (
							<CarteBouton
								key={client.id}
								titre={client.nom}
								ligne={client.ligne}
								onClick={() => d.onOuvrirClient(client.id)}
							/>
						))}
					</ListeDeCartes>
				</section>
			)}

			<section className="flex flex-col gap-cladd-3xs">
				<EnTeteDeGroupe libelle="Quelqu’un d’autre" />
				<ListeDeCartes>
					<CarteBouton
						titre="Un commissaire de justice"
						ligne="Les études d’un département"
						icone={<VignetteIcone icone={<StampIcon />} />}
						onClick={d.onOuvrirRechercheCommissaire}
					/>
					<CarteBouton
						titre="Un avocat"
						ligne="Les avocats d’un barreau"
						icone={<VignetteIcone icone={<ScaleIcon />} />}
						onClick={d.onOuvrirRechercheAvocat}
					/>
				</ListeDeCartes>
				<BoutonTexte className="self-center" onClick={() => setSaisie(true)}>
					<PencilLineIcon />
					Saisir quelqu’un à la main
				</BoutonTexte>
			</section>

			<p className="px-1 text-center text-cladd-3xs leading-relaxed text-cladd-fg-softest">
				Les portraits sont dessinés d’après le nom : aucune source publique ne publie la photo
				d’un avocat ou d’un commissaire. Ajoutez la vraie depuis sa fiche, une fois dans votre
				équipe.
			</p>

			<FeuilleProfessionnel
				pro={fiche === null ? null : proDuCarnet(fiche)}
				onFermer={() => setOuverteSur(null)}
				dansLEquipe
				gestes={{
					enCours: d.enCours,
					...(fiche === null
						? {}
						: {
								onPhoto: (fichier: File) => d.onPhoto(fiche._id, fichier),
								secondaire: {
									libelle: 'Retirer de mon équipe',
									onClick: () => {
										d.onOublier(fiche._id);
										setOuverteSur(null);
									}
								}
							})
				}}
			/>

			<FeuillePresDuClient
				client={d.presDuClient?.client ?? ''}
				ouverte={d.presDuClient !== null}
				carnet={d.equipe}
				propositions={d.presDuClient?.propositions ?? { etat: 'CHARGEMENT' }}
				enCours={d.enCours}
				erreur={d.erreur}
				onFermer={d.onFermerClient}
				onAjouterEtude={d.onAjouterEtude}
				onAjouterAvocat={d.onAjouterAvocat}
			/>

			<RechercheCommissaire
				ouverte={d.rechercheCommissaireOuverte}
				etat={d.etatRechercheCommissaire}
				onFermer={d.onFermerRechercheCommissaire}
				onChercher={d.onChercherCommissaire}
				onRetenir={d.onRetenirEtude}
			/>
			<RechercheAvocat
				ouverte={d.rechercheAvocatOuverte}
				repertoire={d.repertoire}
				barreau={d.barreau}
				specialite={d.specialite}
				etat={d.etatAvocats}
				onFermer={d.onFermerRechercheAvocat}
				onChoisirBarreau={d.onChoisirBarreau}
				onChoisirSpecialite={d.onChoisirSpecialite}
				onRetenir={d.onRetenirAvocat}
			/>

			<Popup
				open={saisie}
				onOpenChange={(o) => {
					if (!o) setSaisie(false);
				}}
				headerLeft={<span className="px-2 pb-1 text-cladd-xs font-semibold">Saisir à la main</span>}
				contentClassName="max-w-lg"
			>
				<PopupContent>
					<div className="flex flex-col gap-cladd-3xs">
						<p className="px-1 text-cladd-2xs leading-relaxed text-cladd-fg-soft">
							Pour quelqu’un qu’aucune source ne connaît. Les recherches retrouvent d’elles-mêmes son
							adresse et son SIREN ; ici, vous les donnez.
						</p>
						<SaisirUneFiche
							onAjouter={(nouvelle) => {
								d.onAjouterALaMain(nouvelle);
								setSaisie(false);
							}}
						/>
					</div>
				</PopupContent>
			</Popup>
		</div>
	);
}
