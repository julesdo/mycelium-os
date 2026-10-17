import { PARAMETRES } from '../lib/verticales/recouvrement/parametres';
import {
	TAUX_BCE_PAR_SEMESTRE,
	plancherContractuel,
	semestreDe,
	tauxInteretLegal,
	tauxPenaliteParDefaut
} from '../lib/verticales/recouvrement/pays/france/taux';
import { tauxLisible } from '../lib/verticales/recouvrement/taux-lisible';
import { Calcul } from './calcul';
import { Faq, type QuestionReponse } from './faq';
import { Chapeau, SectionMarketing } from './section';
import { indemniteLisible, questionClause } from './secteurs';

/**
 * LE TAUX DES PÉNALITÉS DE RETARD, CE SEMESTRE (18/10/2026).
 *
 * La question qu'un gérant tape dans un moteur de recherche avant d'écrire à un
 * client : « taux pénalités de retard 2026 ». La page y répond en tête, puis
 * donne le plancher d'un taux contractuel, les frais de recouvrement, les
 * semestres précédents et le calculateur.
 *
 * ⚠️ AUCUN CHIFFRE N'EST TAPÉ ICI : la série des taux BCE, les taux légaux et le
 * registre, comme le calculateur et le blog. Un semestre en cours que la série
 * ne connaît pas fait taire la page (`null`), plutôt que d'afficher le précédent.
 */

/** La série compte en centièmes de point : 240 = 2,40 %. */
const UN_POINT = 10_000n;

function libelleDuSemestre(semestre: string): string {
	const [annee, moitie] = semestre.split('-S');
	return moitie === '1' ? `1er semestre ${annee}` : `2e semestre ${annee}`;
}

function debutDuSemestre(semestre: string): string {
	const [annee, moitie] = semestre.split('-S');
	return moitie === '1' ? `1er janvier ${annee}` : `1er juillet ${annee}`;
}

function bceLisible(centiemes: bigint): string {
	return tauxLisible({ numerateur: centiemes, denominateur: UN_POINT });
}

interface Ligne {
	readonly semestre: string;
	readonly bce: string;
	readonly penalites: string;
}

/** Les semestres de la série, du plus récent au plus ancien, jusqu'à celui du jour. */
function historique(jour: string): Ligne[] {
	const courant = semestreDe(jour);
	return Object.keys(TAUX_BCE_PAR_SEMESTRE)
		.filter((s) => s <= courant)
		.sort((a, b) => (a < b ? 1 : -1))
		.map((semestre) => {
			const [annee, moitie] = semestre.split('-S');
			const premierJour = `${annee}-${moitie === '1' ? '01' : '07'}-01`;
			return {
				semestre: libelleDuSemestre(semestre),
				bce: bceLisible(TAUX_BCE_PAR_SEMESTRE[semestre] ?? 0n),
				penalites: tauxLisible(tauxPenaliteParDefaut(premierJour))
			};
		});
}

function questions(): readonly QuestionReponse[] {
	return [
		{
			question: 'Quand le taux change-t-il ?',
			reponse:
				'Le 1er janvier et le 1er juillet. C’est le taux de la BCE à cette date qui vaut pour tout le semestre, même s’il change en cours de route.'
		},
		{
			question: 'Une facture en retard depuis plus de six mois : quel taux ?',
			reponse:
				'Chaque semestre traversé porte son propre taux. Letikette découpe le calcul période par période, et chaque ligne se refait à la main : montant × taux × jours ÷ 365.'
		},
		questionClause()
	];
}

export function PageTaux({ jour }: { jour: string }) {
	let penalites: string;
	let plancher: string;
	let legal: string;
	const semestre = semestreDe(jour);
	const bce = TAUX_BCE_PAR_SEMESTRE[semestre];
	try {
		penalites = tauxLisible(tauxPenaliteParDefaut(jour));
		plancher = tauxLisible(plancherContractuel(jour));
		legal = tauxLisible(tauxInteretLegal(jour).professionnels);
	} catch {
		return null;
	}
	if (bce === undefined) return null;
	const indemnite = indemniteLisible();

	return (
		<>
			<SectionMarketing ton="creme" className="gap-cladd-lg pt-36 md:pt-44">
				<div className="grid items-center gap-cladd-lg md:grid-cols-5">
					<div className="flex flex-col gap-cladd-2xs md:col-span-3">
						<h1 className="font-serif text-affiche-colonne leading-tight font-medium tracking-titre-section text-balance">
							Le taux des pénalités de retard
						</h1>
						<Chapeau>
							Au {libelleDuSemestre(semestre)}, une facture payée en retard entre professionnels
							porte des pénalités au taux de {penalites} par an, si le contrat n’en prévoit pas
							d’autre.
						</Chapeau>
					</div>
					<div className="flex flex-col gap-cladd-3xs rounded-carte-site bg-papier p-cladd-xs shadow-carte-chaude md:col-span-2 md:p-cladd-sm">
						<p className="text-cladd-sm font-semibold text-encre-site-douce">
							{libelleDuSemestre(semestre)}
						</p>
						<p className="font-serif text-affiche-colonne leading-none font-medium tabular-nums">
							{penalites}
						</p>
						<p className="text-cladd-md leading-relaxed text-encre-site-douce">
							Le taux de la BCE au {debutDuSemestre(semestre)} ({bceLisible(bce)}), majoré de dix
							points.
						</p>
						<p className="text-cladd-sm text-encre-site-douce opacity-80">
							{PARAMETRES.tauxInteretLegalDefaut.source}
						</p>
					</div>
				</div>
			</SectionMarketing>

			<SectionMarketing ton="creme" className="gap-cladd-sm pt-0 md:pt-0">
				<div className="grid gap-cladd-sm md:grid-cols-2">
					<article className="flex flex-col gap-cladd-2xs rounded-carte-site bg-papier p-cladd-xs shadow-carte-chaude md:p-cladd-sm">
						<h2 className="text-intertitre leading-snug font-semibold">
							{plancher} : le plancher d’un taux prévu au contrat
						</h2>
						<p className="text-cladd-md leading-relaxed text-encre-site-douce">
							Un contrat peut prévoir un autre taux, mais pas moins de trois fois le taux d’intérêt
							légal, soit {legal} ce semestre.
						</p>
						<p className="text-cladd-sm text-encre-site-douce opacity-80">
							{PARAMETRES.tauxInteretMinimalLegal.source}
						</p>
					</article>
					<article className="flex flex-col gap-cladd-2xs rounded-carte-site bg-papier p-cladd-xs shadow-carte-chaude md:p-cladd-sm">
						<h2 className="text-intertitre leading-snug font-semibold">
							{indemnite === null
								? 'Des frais de recouvrement par facture payée en retard'
								: `${indemnite} de frais de recouvrement par facture`}
						</h2>
						<p className="text-cladd-md leading-relaxed text-encre-site-douce">
							En plus des pénalités : une somme forfaitaire, due par tout client professionnel qui
							paie après l’échéance.
						</p>
						<p className="text-cladd-sm text-encre-site-douce opacity-80">
							{PARAMETRES.indemniteForfaitaire.source}
						</p>
					</article>
				</div>
			</SectionMarketing>

			<SectionMarketing ton="profond" className="gap-cladd-sm">
				<h2 className="font-serif text-intertitre leading-snug font-medium">
					Les semestres précédents
				</h2>
				<p className="max-w-2xl text-cladd-md leading-relaxed text-encre-site-douce">
					Une facture impayée depuis dix-huit mois traverse trois taux : chaque période se compte au
					taux de son semestre.
				</p>
				<div className="overflow-x-auto rounded-carte-site bg-papier shadow-carte-chaude">
					<table className="w-full text-left text-cladd-md tabular-nums">
						<thead>
							<tr className="border-b border-filet-creme text-cladd-sm text-encre-site-douce">
								<th scope="col" className="px-cladd-xs py-cladd-3xs font-semibold">
									Semestre
								</th>
								<th scope="col" className="px-cladd-xs py-cladd-3xs font-semibold">
									Taux BCE
								</th>
								<th scope="col" className="px-cladd-xs py-cladd-3xs font-semibold">
									Pénalités
								</th>
							</tr>
						</thead>
						<tbody>
							{historique(jour).map((ligne) => (
								<tr key={ligne.semestre} className="border-b border-filet-creme last:border-b-0">
									<th scope="row" className="px-cladd-xs py-cladd-3xs font-normal">
										{ligne.semestre}
									</th>
									<td className="px-cladd-xs py-cladd-3xs">{ligne.bce}</td>
									<td className="px-cladd-xs py-cladd-3xs font-semibold">{ligne.penalites}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</SectionMarketing>

			<Calcul />

			<Faq id="questions" titre="Le taux : vos questions." questions={questions()} />
		</>
	);
}
