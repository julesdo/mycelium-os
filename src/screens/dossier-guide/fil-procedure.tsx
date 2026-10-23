import { useState, type ReactNode } from 'react';
import {
	AccueilDePlume,
	BoutonDeReponse,
	CadreGuide,
	ChoixDeDate,
	Echange,
	ListeDeReponses,
	ParcoursProfessionnels,
	RangeeDeReponses,
	ReponseDePlume,
	TravailDePlume,
	dateCourte,
	jourDecale,
	useTravail,
	type ChoixDeclare,
	type SuiviAffiche,
	type VoieAffichee
} from '../../ui';
import { RefusDuGeste, type PropsDuFil } from './commun';
import type { DefenseDuGuide } from './fil-conseil';

/**
 * UNE DÉMARCHE ENGAGÉE, ET CE QUI S'Y PASSE — LE LOGICIEL ENREGISTRE ET COMPTE LES
 * DÉLAIS (23/10/2026).
 *
 * C'était « Les suites possibles » : une rangée, une feuille par voie, une feuille
 * « Je l'ai engagée » avec un champ de date et une rangée « Qui fait l'acte », puis,
 * une fois engagée, une frise où l'on dépliait la suite pour la dater. Ce sont
 * désormais deux conversations : déclarer la démarche (laquelle, quel jour, qui), et
 * noter ce qui s'est passé (quoi, quel jour).
 *
 * ⚠️ LE LOGICIEL N'ENGAGE PAS, IL ENREGISTRE (ligne rouge n° 3). Le gérant DÉCLARE un
 * fait passé ; les voies s'énumèrent à égalité, celles qui ne s'appliquent pas avec
 * leur raison, et aucune n'est mise en avant. La date est celle du FAIT : une requête
 * déposée lundi et déclarée vendredi offrirait quatre jours sur une caducité.
 */

/** Ce que la conversation sait des démarches du dossier, en direct. */
export interface ProcedureDuGuide {
	readonly voies: readonly VoieAffichee[];
	/** La démarche engagée, ou `null`. */
	readonly suivi: SuiviAffiche | null;
}

/**
 * Les voies qu'on peut déclarer engagées : celles qui s'appliquent et dont découle un
 * déroulé. Les autres ne se cachent pas : Plume les nomme sous sa question.
 */
export function voiesDeclarables(voies: readonly VoieAffichee[]): VoieAffichee[] {
	return voies.filter((v) => v.etapes.length > 0 && v.disponible);
}

type EtapeDeclarer = 'VOIE' | 'QUAND' | 'QUI' | 'RESUME' | 'TRAVAIL';

export function FilProcedure({
	dossier: d,
	gestes,
	titre,
	prelude,
	onFermer,
	onAutreChose,
	procedure,
	defense,
	voieDepart
}: PropsDuFil & {
	readonly procedure: ProcedureDuGuide;
	readonly defense: DefenseDuGuide;
	/** La voie déjà choisie, quand on vient de sa fiche (« Je l'ai engagée »). */
	readonly voieDepart?: string | null;
}) {
	const declarables = voiesDeclarables(procedure.voies);
	const indisponibles = procedure.voies.filter((v) => !v.disponible);
	const [voie, setVoie] = useState<string | null>(() =>
		voieDepart !== undefined && voieDepart !== null && declarables.some((v) => v.cle === voieDepart)
			? voieDepart
			: null
	);
	const [etape, setEtape] = useState<EtapeDeclarer>(() => (voie === null ? 'VOIE' : 'QUAND'));
	const [engageeLe, setEngageeLe] = useState(d.aujourdHui);
	const [choix, setChoix] = useState<ChoixDeclare>(null);
	const [parcoursOuvert, setParcoursOuvert] = useState(false);

	const ordre: readonly EtapeDeclarer[] = ['VOIE', 'QUAND', 'QUI', 'RESUME', 'TRAVAIL'];
	const nomDeLaVoie = declarables.find((v) => v.cle === voie)?.nom ?? '';
	const nomDe = (id: string) =>
		defense.carnet.find((f) => f._id === id)?.nom ?? 'La personne choisie';
	const qui =
		choix === null
			? 'Je le dirai plus tard'
			: choix.ids.length === 0
				? 'Moi-même'
				: choix.ids.length === 1
					? nomDe(choix.ids[0] ?? '')
					: `${choix.ids.length} personnes`;
	const travail = useTravail<null>([
		'J’enregistre la démarche',
		`Je compte ses délais depuis le ${dateCourte(engageeLe)}`,
		...(choix === null ? [] : ['Je note qui a fait l’acte'])
	]);
	const affichee: EtapeDeclarer = etape === 'TRAVAIL' && travail.erreur !== null ? 'RESUME' : etape;
	const passees = ordre.slice(0, ordre.indexOf(affichee));

	function declarer() {
		if (voie === null) return;
		const cle = voie;
		setEtape('TRAVAIL');
		travail.lancer(async () => {
			await gestes.declarerProcedure(cle, engageeLe, choix);
			return null;
		});
	}

	function question(cle: EtapeDeclarer): ReactNode {
		switch (cle) {
			case 'VOIE':
				return (
					<ReponseDePlume texte="Laquelle a été engagée ? Je ne fais que compter ses délais : c’est vous, ou votre conseil, qui l’avez engagée.">
						{indisponibles.length === 0 ? null : (
							<p className="text-cladd-2xs leading-snug text-cladd-fg-soft">
								{`Pas possible pour l’instant : ${indisponibles.map((v) => v.nom).join(', ')}. Leur fiche, dans « Les suites possibles », dit pourquoi.`}
							</p>
						)}
					</ReponseDePlume>
				);
			case 'QUAND':
				return (
					<ReponseDePlume texte="Quel jour ? Ses délais courent depuis ce jour-là, pas depuis aujourd’hui." />
				);
			case 'QUI':
				return (
					<ReponseDePlume texte="Qui a fait l’acte ? Cette réponse peut attendre : elle ne change aucun délai." />
				);
			case 'RESUME':
				return (
					<ReponseDePlume
						texte={`Je note « ${nomDeLaVoie} », engagée le ${dateCourte(engageeLe)}${choix === null ? '' : `, ${qui === 'Moi-même' ? 'par vous-même' : `par ${qui}`}`}. Je compte ses délais à partir de ce jour : ils s’affichent sur le dossier.`}
					/>
				);
			default:
				return null;
		}
	}

	function reponse(cle: EtapeDeclarer): string {
		switch (cle) {
			case 'VOIE':
				return nomDeLaVoie;
			case 'QUAND':
				return engageeLe === d.aujourdHui ? 'Aujourd’hui' : `Le ${dateCourte(engageeLe)}`;
			case 'QUI':
				return qui;
			case 'RESUME':
				return 'Je l’ai engagée';
			default:
				return '';
		}
	}

	function zone(): ReactNode {
		switch (affichee) {
			case 'VOIE':
				return declarables.length === 0 ? (
					<RangeeDeReponses>
						<BoutonDeReponse libelle="Revenir au dossier" onClick={onFermer} />
						<BoutonDeReponse libelle="Autre chose" onClick={onAutreChose} />
					</RangeeDeReponses>
				) : (
					<ListeDeReponses
						choix={declarables.map((v) => ({
							cle: v.cle,
							titre: v.nom,
							ligne: `${v.etapes.length} étapes dont je compte les délais`,
							onClick: () => {
								setVoie(v.cle);
								setEtape('QUAND');
							}
						}))}
					/>
				);
			case 'QUAND':
				return (
					<>
						<ChoixDeDate
							propositions={[
								{ libelle: 'Aujourd’hui', date: d.aujourdHui },
								{ libelle: 'Hier', date: jourDecale(d.aujourdHui, -1) }
							]}
							valeur={engageeLe}
							onChange={setEngageeLe}
							min={jourDecale(d.aujourdHui, -730)}
						/>
						<BoutonDeReponse
							principal
							desactive={engageeLe === '' || engageeLe > d.aujourdHui}
							libelle="Valider"
							onClick={() => setEtape('QUI')}
						/>
					</>
				);
			case 'QUI':
				return (
					<>
						<RangeeDeReponses>
							<BoutonDeReponse
								libelle="Plus tard"
								onClick={() => {
									setChoix(null);
									setEtape('RESUME');
								}}
							/>
							<BoutonDeReponse
								libelle="Moi-même"
								onClick={() => {
									setChoix({ ids: [] });
									setEtape('RESUME');
								}}
							/>
						</RangeeDeReponses>
						<BoutonDeReponse
							libelle="Un avocat ou un commissaire de justice"
							onClick={() => {
								defense.annuaire.onDemander();
								setParcoursOuvert(true);
							}}
						/>
					</>
				);
			case 'RESUME':
				return <BoutonDeReponse principal libelle="Je l’ai engagée" onClick={declarer} />;
			case 'TRAVAIL':
				return travail.fini ? (
					<RangeeDeReponses>
						<BoutonDeReponse libelle="Revenir au dossier" onClick={onFermer} />
						<BoutonDeReponse libelle="Autre chose" onClick={onAutreChose} />
					</RangeeDeReponses>
				) : undefined;
		}
	}

	return (
		<>
			<CadreGuide
				titre={titre}
				sousTitre={d.client}
				onFermer={onFermer}
				suivi={`${affichee}-${travail.tic}-${String(travail.fini)}`}
				reponses={zone()}
			>
				{prelude(travail.lance)}
				{declarables.length === 0 ? (
					<ReponseDePlume texte="Aucune démarche de ce dossier n’a de délais que je sache compter." />
				) : null}
				{passees.map((cle) => (
					<Echange
						key={cle}
						question={question(cle)}
						reponse={reponse(cle)}
						{...(travail.lance ? {} : { onModifier: () => setEtape(cle) })}
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
						titre={`C’est noté. Ses délais courent depuis le ${dateCourte(engageeLe)}.`}
						sousTitre="Quand il se passe quelque chose, dites-le-moi : je compte la suite."
					/>
				) : null}
			</CadreGuide>
			<ParcoursProfessionnels
				ouvert={parcoursOuvert}
				titre="Qui a fait l’acte"
				but="DOSSIER"
				professions={['AVOCAT', 'COMMISSAIRE_DE_JUSTICE']}
				sansPersonne={{ titre: 'Moi-même', precision: 'Aucun professionnel' }}
				equipe={defense.carnet}
				dejaChoisis={choix === null ? [] : choix.ids}
				annuaire={defense.annuaire}
				onFermer={() => setParcoursOuvert(false)}
				onConfirmer={(ids) => {
					setChoix({ ids });
					setParcoursOuvert(false);
					setEtape('RESUME');
				}}
			/>
		</>
	);
}

/* ═══════════════════════════════════════════════════════════════════════════
   NOTER CE QUI S'EST PASSÉ DANS LA DÉMARCHE
   ═══════════════════════════════════════════════════════════════════════════ */

type EtapeNoter = 'QUOI' | 'QUAND' | 'TRAVAIL';

export function FilEtape({
	dossier: d,
	gestes,
	titre,
	prelude,
	onFermer,
	onAutreChose,
	procedure
}: PropsDuFil & { readonly procedure: ProcedureDuGuide }) {
	const suivi = procedure.suivi;
	const [cle, setCle] = useState<string | null>(null);
	const [etape, setEtape] = useState<EtapeNoter>('QUOI');
	const [survenuLe, setSurvenuLe] = useState(d.aujourdHui);
	const travail = useTravail<null>([
		'J’enregistre ce qui s’est passé, à sa date',
		'Je recompte les délais qui en découlent'
	]);
	const ordre: readonly EtapeNoter[] = ['QUOI', 'QUAND', 'TRAVAIL'];
	const affichee: EtapeNoter = etape === 'TRAVAIL' && travail.erreur !== null ? 'QUAND' : etape;
	const passees = ordre.slice(0, ordre.indexOf(affichee));
	const suites = suivi?.suites ?? [];
	const libelle = suites.find((s) => s.cle === cle)?.libelle ?? '';

	function consigner() {
		if (cle === null) return;
		const evenement = cle;
		setEtape('TRAVAIL');
		travail.lancer(async () => {
			await gestes.consigner(evenement, survenuLe);
			return null;
		});
	}

	function question(c: EtapeNoter): ReactNode {
		switch (c) {
			case 'QUOI':
				return suivi === null || suites.length === 0 ? (
					<ReponseDePlume texte="Il n’y a rien à noter pour l’instant sur cette démarche." />
				) : (
					<ReponseDePlume texte={`Qu’est-ce qui s’est passé ? ${suivi.constat}`} />
				);
			case 'QUAND':
				return <ReponseDePlume texte="Quel jour ? C’est cette date qui fait courir la suite." />;
			default:
				return null;
		}
	}

	function zone(): ReactNode {
		switch (affichee) {
			case 'QUOI':
				return suites.length === 0 ? (
					<RangeeDeReponses>
						<BoutonDeReponse libelle="Revenir au dossier" onClick={onFermer} />
						<BoutonDeReponse libelle="Autre chose" onClick={onAutreChose} />
					</RangeeDeReponses>
				) : (
					<ListeDeReponses
						choix={suites.map((s) => ({
							cle: s.cle,
							titre: s.libelle,
							onClick: () => {
								setCle(s.cle);
								setEtape('QUAND');
							}
						}))}
					/>
				);
			case 'QUAND':
				return (
					<>
						<ChoixDeDate
							propositions={[
								{ libelle: 'Aujourd’hui', date: d.aujourdHui },
								{ libelle: 'Hier', date: jourDecale(d.aujourdHui, -1) }
							]}
							valeur={survenuLe}
							onChange={setSurvenuLe}
							min={suivi?.depuisLe ?? jourDecale(d.aujourdHui, -730)}
						/>
						<BoutonDeReponse
							principal
							desactive={survenuLe === '' || survenuLe > d.aujourdHui}
							libelle="Le noter"
							onClick={consigner}
						/>
					</>
				);
			case 'TRAVAIL':
				return travail.fini ? (
					<RangeeDeReponses>
						<BoutonDeReponse libelle="Revenir au dossier" onClick={onFermer} />
						<BoutonDeReponse libelle="Autre chose" onClick={onAutreChose} />
					</RangeeDeReponses>
				) : undefined;
		}
	}

	return (
		<CadreGuide
			titre={titre}
			sousTitre={d.client}
			onFermer={onFermer}
			suivi={`${affichee}-${travail.tic}-${String(travail.fini)}`}
			reponses={zone()}
		>
			{prelude(travail.lance)}
			{passees.map((c) => (
				<Echange
					key={c}
					question={question(c)}
					reponse={
						c === 'QUOI'
							? libelle
							: survenuLe === d.aujourdHui
								? 'Aujourd’hui'
								: `Le ${dateCourte(survenuLe)}`
					}
					{...(travail.lance ? {} : { onModifier: () => setEtape(c) })}
				/>
			))}
			{affichee === 'TRAVAIL' ? null : question(affichee)}
			<RefusDuGeste erreur={travail.erreur} />
			{affichee === 'TRAVAIL' && !travail.fini ? <TravailDePlume etapes={travail.etapes} /> : null}
			{travail.fini ? (
				<AccueilDePlume
					humeur="content"
					titre={`C’est noté : ${libelle.toLowerCase()}, le ${dateCourte(survenuLe)}.`}
					sousTitre="Les délais qui en découlent sont sur le dossier."
				/>
			) : null}
		</CadreGuide>
	);
}
