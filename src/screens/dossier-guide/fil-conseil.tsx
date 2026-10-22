import { useState, type ReactNode } from 'react';
import {
	AccueilDePlume,
	BoutonDeReponse,
	CadreGuide,
	ChoixDeDate,
	Echange,
	ParcoursProfessionnels,
	RangeeDeReponses,
	ReponseDePlume,
	TravailDePlume,
	dateCourte,
	jourDecale,
	useTravail,
	type AnnuaireDuParcours,
	type FicheIntervenant
} from '../../ui';
import { RefusDuGeste, ReponsesDeFin, useAnnulation, type PropsDuFil } from './commun';

/**
 * « LE CONFIER À UN PROFESSIONNEL » — DÉJÀ REMIS, OU À CHOISIR (22/10/2026).
 *
 * C'était la rangée « Les suites possibles » : une liste de voies, une feuille par
 * voie, une feuille de déclaration, puis « Qui fait l'acte ». Pour le geste le plus
 * simple — « je l'ai donné à mon avocat » —, il fallait savoir que la remise se
 * déclarait depuis le décompte. C'est désormais une conversation : Plume demande si
 * c'est fait ; si oui, quand et à qui, et il note la remise avec le montant du jour ;
 * sinon, il montre qui est près du client.
 *
 * ⚠️ RIEN N'EST RECOMMANDÉ (ligne rouge n° 3). Plume ne dit jamais qu'il faudrait
 * confier le dossier : c'est le gérant qui l'a choisi parmi les autres gestes. Le
 * parcours du choix montre les professionnels près du client sans en présélectionner
 * aucun ; ce qu'ils feront, c'est eux qui le décident.
 */

/** Ce que la conversation sait des professionnels du dossier, en direct. */
export interface DefenseDuGuide {
	readonly annuaire: AnnuaireDuParcours;
	readonly carnet: readonly FicheIntervenant[];
	/** Les professionnels déjà nommés sur le dossier, par identifiant. */
	readonly choisis: readonly string[];
}

type Etape = 'DEJA' | 'QUAND' | 'QUI' | 'RESUME' | 'CHERCHER' | 'TRAVAIL';

export function FilConseil({
	dossier: d,
	gestes,
	titre,
	prelude,
	onFermer,
	onAutreChose,
	defense
}: PropsDuFil & { readonly defense: DefenseDuGuide }) {
	const [etape, setEtape] = useState<Etape>('DEJA');
	const [remis, setRemis] = useState<boolean | null>(null);
	const [remisLe, setRemisLe] = useState(d.aujourdHui);
	/* La personne à qui il a été remis : un identifiant du carnet, ou personne de nommé. */
	const [qui, setQui] = useState<string | null>(null);
	const [nommes, setNommes] = useState<readonly string[]>([]);
	const [parcours, setParcours] = useState<'QUI' | 'CHERCHER' | null>(null);
	const annulation = useAnnulation();

	const ordre: readonly Etape[] =
		remis === false
			? ['DEJA', 'CHERCHER', 'TRAVAIL']
			: ['DEJA', 'QUAND', 'QUI', 'RESUME', 'TRAVAIL'];
	const travail = useTravail<null>(
		remis === false
			? ['Je les nomme sur le dossier', 'Je garde leurs coordonnées dans votre équipe']
			: ['Je date le montant au jour d’aujourd’hui', 'Je note la remise', 'Je suis ses dates']
	);
	const affichee: Etape =
		etape === 'TRAVAIL' && travail.erreur !== null
			? remis === false
				? 'CHERCHER'
				: 'RESUME'
			: etape;
	const passees = ordre.slice(0, ordre.indexOf(affichee));
	const verrouille = travail.lance;

	const nomDe = (id: string) =>
		defense.carnet.find((f) => f._id === id)?.nom ?? 'La personne choisie';

	function ouvrirLeChoix(pour: 'QUI' | 'CHERCHER') {
		defense.annuaire.onDemander();
		setParcours(pour);
	}

	function remettre() {
		setEtape('TRAVAIL');
		travail.lancer(async () => {
			await gestes.remettre({ remisLe, ...(qui === null ? {} : { intervenantId: qui }) });
			return null;
		});
	}

	function nommer(ids: readonly string[]) {
		setNommes(ids);
		setEtape('TRAVAIL');
		travail.lancer(async () => {
			await gestes.nommer(ids, defense.choisis);
			return null;
		});
	}

	function question(cle: Etape): ReactNode {
		switch (cle) {
			case 'DEJA':
				return (
					<ReponseDePlume
						texte={`Vous avez déjà remis le dossier de ${d.client} à un avocat ou à un commissaire de justice ?`}
					/>
				);
			case 'QUAND':
				return (
					<ReponseDePlume texte="Quel jour ? C’est cette date qui compte, pas celle d’aujourd’hui." />
				);
			case 'QUI':
				return <ReponseDePlume texte="À qui ? Vous pouvez aussi ne pas le nommer." />;
			case 'RESUME':
				return (
					<ReponseDePlume
						texte={`Je note que vous l’avez remis ${remisLe === d.aujourdHui ? 'aujourd’hui' : `le ${dateCourte(remisLe)}`}${qui === null ? '' : ` à ${nomDe(qui)}`}. Le montant du jour part avec lui, daté. Je suis ensuite ses dates.`}
					/>
				);
			case 'CHERCHER':
				return (
					<ReponseDePlume
						texte={`Je vous montre votre équipe, puis les avocats et les commissaires de justice près de ${d.client}. Rien n’est présélectionné : vous choisissez, ou personne.`}
					/>
				);
			default:
				return null;
		}
	}

	function reponse(cle: Etape): string {
		switch (cle) {
			case 'DEJA':
				return remis === false ? 'Pas encore' : 'Oui, c’est fait';
			case 'QUAND':
				return remisLe === d.aujourdHui ? 'Aujourd’hui' : `Le ${dateCourte(remisLe)}`;
			case 'QUI':
				return qui === null ? 'Sans le nommer' : nomDe(qui);
			case 'RESUME':
				return 'Noter la remise';
			case 'CHERCHER':
				return nommes.length === 0
					? 'Personne pour l’instant'
					: nommes.length === 1
						? nomDe(nommes[0] ?? '')
						: `${nommes.length} personnes`;
			default:
				return '';
		}
	}

	function zone(): ReactNode {
		switch (affichee) {
			case 'DEJA':
				return (
					<RangeeDeReponses>
						<BoutonDeReponse
							libelle="Pas encore"
							onClick={() => {
								setRemis(false);
								setEtape('CHERCHER');
							}}
						/>
						<BoutonDeReponse
							libelle="Oui, c’est fait"
							onClick={() => {
								setRemis(true);
								setEtape('QUAND');
							}}
						/>
					</RangeeDeReponses>
				);
			case 'QUAND':
				return (
					<>
						<ChoixDeDate
							propositions={[
								{ libelle: 'Aujourd’hui', date: d.aujourdHui },
								{ libelle: 'Hier', date: jourDecale(d.aujourdHui, -1) }
							]}
							valeur={remisLe}
							onChange={setRemisLe}
							min={jourDecale(d.aujourdHui, -365)}
						/>
						<BoutonDeReponse
							principal
							desactive={remisLe === '' || remisLe > d.aujourdHui}
							libelle="Valider"
							onClick={() => setEtape('QUI')}
						/>
					</>
				);
			case 'QUI':
				return (
					<RangeeDeReponses>
						<BoutonDeReponse
							libelle="Sans le nommer"
							onClick={() => {
								setQui(null);
								setEtape('RESUME');
							}}
						/>
						<BoutonDeReponse principal libelle="Choisir" onClick={() => ouvrirLeChoix('QUI')} />
					</RangeeDeReponses>
				);
			case 'RESUME':
				return <BoutonDeReponse principal libelle="Noter la remise" onClick={remettre} />;
			case 'CHERCHER':
				return (
					<RangeeDeReponses>
						<BoutonDeReponse libelle="Pas maintenant" onClick={onFermer} />
						<BoutonDeReponse
							principal
							libelle="Voir qui est près de lui"
							onClick={() => ouvrirLeChoix('CHERCHER')}
						/>
					</RangeeDeReponses>
				);
			case 'TRAVAIL':
				return travail.fini ? (
					<ReponsesDeFin
						annulation={null}
						etat={annulation.etat}
						onAnnuler={annulation.annuler}
						onFermer={onFermer}
						onAutreChose={onAutreChose}
					/>
				) : undefined;
		}
	}

	const conclusion =
		remis === false
			? {
					titre:
						nommes.length === 0
							? 'C’est noté : personne pour l’instant.'
							: `C’est noté : ${nommes.length === 1 ? nomDe(nommes[0] ?? '') : `${nommes.length} personnes`} sur le dossier.`,
					sousTitre: 'Quand vous lui aurez remis le dossier, dites-le-moi : je noterai la date.'
				}
			: {
					titre: `C’est noté : remis ${remisLe === d.aujourdHui ? 'aujourd’hui' : `le ${dateCourte(remisLe)}`}.`,
					sousTitre: 'Je suis ses dates. Le montant remis reste celui du jour, daté.'
				};

	return (
		<>
			<CadreGuide
				titre={titre}
				sousTitre={d.client}
				onFermer={onFermer}
				suivi={`${affichee}-${travail.tic}-${travail.fini}`}
				reponses={zone()}
			>
				{prelude(verrouille)}
				{passees.map((cle) => (
					<Echange
						key={cle}
						question={question(cle)}
						reponse={reponse(cle)}
						{...(verrouille ? {} : { onModifier: () => setEtape(cle) })}
					/>
				))}
				{affichee === 'TRAVAIL' ? null : question(affichee)}
				<RefusDuGeste erreur={travail.erreur} />
				{affichee === 'TRAVAIL' && !travail.fini ? (
					<TravailDePlume etapes={travail.etapes} />
				) : null}
				{travail.fini ? (
					<AccueilDePlume
						humeur="content"
						titre={conclusion.titre}
						sousTitre={conclusion.sousTitre}
					/>
				) : null}
			</CadreGuide>

			{/*
			  LE PARCOURS DU CHOIX (12/10/2026), par-dessus la conversation : une profession
			  par étape, la recherche, le résumé. Rien ne s'écrit avant « Confirmer ».
			*/}
			<ParcoursProfessionnels
				ouvert={parcours !== null}
				titre={parcours === 'QUI' ? 'À qui l’avez-vous remis' : 'Qui pourrait s’en charger'}
				but="DOSSIER"
				professions={['AVOCAT', 'COMMISSAIRE_DE_JUSTICE']}
				{...(parcours === 'QUI' ? { unSeul: true } : {})}
				sansPersonne={
					parcours === 'QUI'
						? { titre: 'Sans le nommer', precision: 'Personne au dossier' }
						: { titre: 'Personne pour l’instant', precision: 'Aucun professionnel' }
				}
				equipe={defense.carnet}
				dejaChoisis={parcours === 'QUI' ? (qui === null ? [] : [qui]) : defense.choisis}
				annuaire={defense.annuaire}
				onFermer={() => setParcours(null)}
				onConfirmer={(ids) => {
					const pour = parcours;
					setParcours(null);
					if (pour === 'QUI') {
						setQui(ids[0] ?? null);
						setEtape('RESUME');
					} else {
						nommer(ids);
					}
				}}
			/>
		</>
	);
}
