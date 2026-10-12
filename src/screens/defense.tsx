import { useState } from 'react';
import { MapPinIcon, PlusIcon } from 'lucide-react';
import {
	BoutonPrincipal,
	CarteBouton,
	CarteProfessionnel,
	EnTeteDeGroupe,
	FeuilleProfessionnel,
	ListeDeCartes,
	PageEcran,
	ParcoursProfessionnels,
	PortraitsDeLEquipe,
	VignetteIcone,
	proDuCarnet,
	type AnnuaireDuParcours,
	type FicheIntervenant,
	type Lecture
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
 * Deux questions, une réponse chacune, à un seul endroit :
 *   · avec qui je travaille — « Votre équipe », une carte par personne ;
 *   · qui ajouter — UN bouton, « Ajouter à mon équipe », qui ouvre le parcours du
 *     choix (12/10/2026) : le MÊME que « Qui fait l'acte » dans un dossier, une
 *     profession par étape, la recherche par nom, le défilement, le résumé. Les
 *     cartes « Près de vos clients » l'ouvrent déjà placé près du client touché.
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
	readonly onOublier: (intervenantId: string) => void;
	/** La vraie photo ou le logo d'un membre de l'équipe. */
	readonly onPhoto: (intervenantId: string, fichier: File) => void;
	/** Les clients qui ont un dossier en cours, dans l'ordre alphabétique. */
	readonly clients: readonly ClientDeLaDefense[];
	/** L'annuaire du parcours du choix, avec un lieu par client en cours. */
	readonly annuaire: AnnuaireDuParcours;
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
		commissaires === 0 ? null : `${commissaires} commissaire${pluriel(commissaires)} de justice`,
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
	const [parcoursOuvert, setParcoursOuvert] = useState(false);
	const fiche = d.equipe.find((f) => f._id === ouverteSur) ?? null;

	/** Ouvre le parcours, près d'un client quand on vient de sa carte. */
	const ajouter = (portee?: string) => {
		d.annuaire.onDemander(portee);
		setParcoursOuvert(true);
	};

	return (
		<div className="flex flex-col gap-cladd-xs">
			<PortraitsDeLEquipe equipe={d.equipe.map(proDuCarnet)} legende={legendeDeLEquipe(d.equipe)} />

			{/* LE SEUL BOUTON PLEIN DE L'ÉCRAN : ajouter, c'est le parcours du choix. */}
			<BoutonPrincipal pleineLargeur onClick={() => ajouter()}>
				<PlusIcon />
				Ajouter à mon équipe
			</BoutonPrincipal>

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
								icone={<VignetteIcone icone={<MapPinIcon />} />}
								onClick={() => ajouter(`client:${client.id}`)}
							/>
						))}
					</ListeDeCartes>
				</section>
			)}

			<p className="px-1 text-center text-cladd-3xs leading-relaxed text-cladd-fg-softest">
				Les portraits sont dessinés d’après le nom : aucune source publique ne publie la photo d’un
				avocat ou d’un commissaire. Ajoutez la vraie depuis sa fiche, une fois dans votre équipe.
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

			<ParcoursProfessionnels
				ouvert={parcoursOuvert}
				titre="Ajouter à votre équipe"
				but="EQUIPE"
				professions={['AVOCAT', 'COMMISSAIRE_DE_JUSTICE']}
				sansPersonne={null}
				equipe={d.equipe}
				annuaire={d.annuaire}
				onFermer={() => setParcoursOuvert(false)}
				onConfirmer={() => setParcoursOuvert(false)}
			/>
		</div>
	);
}
