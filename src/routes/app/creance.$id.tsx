import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import { depuisCentimes } from '../../lib/socle/montants';
import type { Id } from '../../lib/convex/_generated/dataModel';
import { Page, PageHeader, PageBody, Decompte, aujourdHuiISO, type ReponseFait } from '../../ui';
import { EcranCreance } from '../../screens/creance';

export const Route = createFileRoute('/app/creance/$id')({ component: Creance });

/**
 * Une créance : ce qu'elle vaut, ce qui lui manque, et ce qu'elle chiffre.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * L'ORDRE DE L'ÉCRAN EST L'ORDRE DE LA DÉCISION
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Le score d'abord, mais jamais seul : un nombre sans prise laisse le gérant
 * devant une note qu'il ne sait pas faire monter. Viennent donc immédiatement
 * après les QUESTIONS — ce que le logiciel n'a pas pu déduire — puis les
 * risques, puis les pièces qui renforceraient le dossier.
 *
 * Le décompte vient en dernier parce qu'il n'a de sens qu'une fois la créance
 * qualifiée. Le produire sur un dossier douteux donnerait un chiffre juste sur
 * une créance qu'on n'aurait pas dû poursuivre.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LE QUESTIONNAIRE NE POSE QUE CE QU'IL FAUT
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Trois des quatre conditions légales se déduisent des données. Une seule ne se
 * déduit jamais — le caractère certain — parce que l'absence de contestation
 * CONNUE n'est pas une absence de contestation. L'écran ne montre donc, le plus
 * souvent, qu'une seule question.
 */
function Creance() {
	const { id } = Route.useParams();
	const creanceId = id as Id<'creances'>;

	const creance = useQuery(api.recouvrement.lecture.creanceComplete, { creanceId });
	const repondre = useMutation(api.recouvrement.creances.repondre);
	const declarerFait = useMutation(api.recouvrement.creances.declarerFait);

	/**
	 * LE SUIVI DE LA PROCÉDURE ENGAGÉE — module 4.5.
	 *
	 * Elle rend `null` sur une créance qui n'a rien engagé, ce qui est le cas
	 * courant : lever y ferait une erreur permanente sur un état normal.
	 */
	const suivi = useQuery(api.recouvrement.apresProcedure.suiviDeLaCreance, { creanceId });
	const consignerEvenement = useMutation(api.recouvrement.apresProcedure.consignerEvenement);
	const figer = useMutation(api.recouvrement.decompte.produire);
	const dernier = useQuery(api.recouvrement.decompte.dernierDecompte, { creanceId });

	const [enCours, setEnCours] = useState(false);
	const [erreur, setErreur] = useState<string | null>(null);

	async function tranche(condition: string, valeur: 'ok' | 'ko') {
		setErreur(null);
		await repondre({ creanceId, reponses: { [condition]: valeur } });
	}

	/**
	 * Consigner ce qui s'est passé dans la procédure, À SA DATE.
	 *
	 * ⚠️ `survenuLe` VIENT DU CHAMP, jamais de l'horloge. C'est la distinction
	 * que porte tout le module : les délais courent depuis le FAIT, pas depuis
	 * la saisie. Les confondre offrirait des jours sur une caducité.
	 */
	async function consigner(cle: string, survenuLe: string) {
		setErreur(null);
		setEnCours(true);
		try {
			await consignerEvenement({ creanceId, cle, survenuLe });
		} catch (e) {
			setErreur(e instanceof Error ? e.message : 'Enregistrement refusé.');
		} finally {
			setEnCours(false);
		}
	}

	/**
	 * Déclarer un fait de litige.
	 *
	 * ⚠️ RIEN N'EST DÉRIVÉ EN LOCAL DE LA RÉPONSE. La question suivante et les
	 * constats reviennent par la requête, qui les recalcule depuis la base. Les
	 * deviner ici ferait un second endroit où le produit décide ce qu'une
	 * déclaration établit — et les deux finiraient par diverger.
	 */
	async function declarer(cle: string, reponse: ReponseFait) {
		setErreur(null);
		setEnCours(true);
		try {
			await declarerFait({ creanceId, cle: cle as 'CONTESTATION_ECRITE', reponse });
		} catch (e) {
			setErreur(e instanceof Error ? e.message : 'Déclaration refusée.');
		} finally {
			setEnCours(false);
		}
	}

	/**
	 * LA PIÈCE, TÉLÉCHARGÉE.
	 *
	 * ⚠️ LE MODULE PDF EST IMPORTÉ À LA DEMANDE. `jspdf` et son greffon de
	 * tableaux pèsent plusieurs centaines de kilo-octets ; les charger avec
	 * l'écran ferait payer ce poids à chaque ouverture, pour un bouton qu'on
	 * presse une fois par créance.
	 *
	 * ⚠️ ET LE CONTENU NE SE COMPOSE PAS ICI. `composerPiece` est pure et testée ;
	 * cet écran ne fait que lui passer le décompte figé et donner un nom au
	 * fichier. Écrire une seule phrase du document ici créerait un second endroit
	 * où le produit parle de droit.
	 */
	async function telecharger() {
		if (dernier === undefined || dernier === null) return;

		const [{ composerPiece }, { rendrePieceEnPdf, nomFichierPiece }] = await Promise.all([
			import('../../lib/verticales/recouvrement/piece'),
			import('../../ui/piece-decompte')
		]);

		const piece = composerPiece({
			arreteAu: dernier.arreteAu,
			convention: dernier.convention,
			principalRestantDu: depuisCentimes(dernier.principalRestantDu),
			interets: depuisCentimes(dernier.interets),
			indemniteForfaitaire: depuisCentimes(dernier.indemniteForfaitaire),
			total: depuisCentimes(dernier.total),
			creancier: dernier.creancier,
			debiteur: dernier.debiteur,
			lignes: dernier.lignes.map((ligne) => ({
				reference: ligne.reference,
				principalRestantDu: depuisCentimes(ligne.principalRestantDu),
				interets: depuisCentimes(ligne.interets),
				indemniteForfaitaire: depuisCentimes(ligne.indemniteForfaitaire),
				total: depuisCentimes(ligne.total),
				segments: ligne.segments.map((segment) => ({
					debut: segment.debut,
					fin: segment.fin,
					jours: segment.jours,
					principal: depuisCentimes(segment.principal),
					taux: segment.taux,
					baseAnnuelle: segment.baseAnnuelle,
					interets: depuisCentimes(segment.interets)
				}))
			})),
			abandons: dernier.abandons.map((abandon) => ({
				reference: abandon.reference,
				montantEnJeu: abandon.montantEnJeu === null ? null : depuisCentimes(abandon.montantEnJeu),
				explication: abandon.explication
			}))
		});

		rendrePieceEnPdf(piece).save(nomFichierPiece(piece));
	}

	async function produireDecompte() {
		setEnCours(true);
		setErreur(null);
		try {
			await figer({ creanceId, convention: 'ACT_365' });
		} catch (e) {
			const convexe = e as { data?: unknown };
			setErreur(
				typeof convexe.data === 'string'
					? convexe.data
					: e instanceof Error
						? e.message
						: 'Le décompte n’a pas pu être produit.'
			);
		} finally {
			setEnCours(false);
		}
	}

	if (creance === undefined) {
		return (
			<Page>
				<PageHeader titre="Créance" />
				<PageBody>
					<p className="sr-only">Chargement…</p>
				</PageBody>
			</Page>
		);
	}

	return (
		<EcranCreance
			creance={creance}
			suivi={suivi ?? null}
			aujourdHui={aujourdHuiISO()}
			enCours={enCours}
			erreur={erreur}
			onTrancher={(condition, valeur) => void tranche(condition, valeur)}
			onDeclarer={(cle, reponse) => void declarer(cle, reponse)}
			onConsigner={(cle, survenuLe) => void consigner(cle, survenuLe)}
			onProduireDecompte={() => void produireDecompte()}
			// ⚠️ `null` PLUTÔT QU’UN BOUTON INERTE. Sans décompte figé, il n’y a
			// rien à télécharger ; un bouton présent et sans effet est pire qu’un
			// bouton absent — il se presse, et rien ne se passe.
			onTelecharger={dernier ? () => void telecharger() : null}
			// Le décompte est composé ICI : la route seule connaît la forme que
			// Convex renvoie, et l’écran ne sait pas interroger Convex.
			dernier={dernier ? <Decompte decompte={dernier} /> : null}
		/>
	);
}
