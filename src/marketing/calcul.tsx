import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Input, Segmented, SegmentedButton, SurfaceCut } from '@cladd-ui/react';
import { ArrowRightIcon, ChevronDownIcon } from 'lucide-react';
import { BoutonAffiche, PictoPrescription } from '../ui';
import { eurosCentimes, tauxLisible } from '../ui/format';
import { decompterFacture, joursEntre } from '../lib/verticales/recouvrement/decompte';
import {
	periodesDeTauxParDefaut,
	tauxPenaliteParDefaut
} from '../lib/verticales/recouvrement/pays/france/taux';
import {
	REGIMES_PRESCRIPTION,
	dateDePrescription
} from '../lib/verticales/recouvrement/pays/france/prescription';
import { ajouterMois } from '../lib/verticales/recouvrement/calendrier';
import { depuisCentimes } from '../lib/socle/montants';
import { ARTICLES_DU_SOCLE } from './articles';
import { Chapeau, SectionMarketing, TitreSection } from './section';

/**
 * LE CALCULATEUR — « Combien vous doit-on, vraiment ? » (14/10/2026).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ IL REMPLACE « LA LOI » ET « LA FRISE », ET IL FAIT LES DEUX À LA FOIS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La page énonçait trois chiffres (le taux, les frais, le délai), puis les
 * faisait tourner sur une facture figée de 12 400 €. Wise et Whop font mieux :
 * le visiteur tape SA facture, et le résultat se calcule sous ses yeux. Un
 * gérant qui voit ce que vaut sa propre facture de mars comprend en deux
 * secondes ce qu'il laisse sur la table.
 *
 * ⚠️ C'EST LE MOTEUR DU PRODUIT QUI CALCULE : `decompterFacture`, au taux relevé
 * de chaque semestre (`periodesDeTauxParDefaut`), sur une base de 365 jours,
 * frais de recouvrement compris quand la facture est en retard. Le même que les
 * illustrations du blog et que le décompte d'un dossier : le chiffre se refait
 * à la main, période par période.
 *
 * ⚠️ AUCUNE VALEUR N'EST TAPÉE ICI. Le taux, les frais et les durées viennent
 * des paramètres et du module de prescription. Si le taux du semestre en cours
 * n'est pas relevé, la section disparaît plutôt que de mentir (la règle de la
 * frise) ; si une période passée manque, le calcul le dit au lieu d'extrapoler.
 *
 * ⚠️ AUCUN CONSEIL. La section montre ce que dit la loi et ce que donne le
 * calcul ; elle ne dit pas qu'il faut agir (ligne rouge n° 3).
 */

type Secteur = 'GENERAL' | 'TRANSPORT_MARCHANDISES';

function aujourdHui(): string {
	return new Date().toISOString().slice(0, 10);
}

/** « 12 400 », « 12400,50 », « 12 400.5 » : des euros, en centimes. Rien d'autre. */
function lireMontant(saisie: string): bigint | null {
	const propre = saisie.replace(/[\s\u00a0\u202f€]/g, '').replace(',', '.');
	const trouve = /^(\d{1,9})(?:\.(\d{1,2}))?$/.exec(propre);
	if (trouve === null) return null;
	const euros = BigInt(trouve[1] ?? '0');
	const centimes = BigInt((trouve[2] ?? '').padEnd(2, '0') || '0');
	const total = euros * 100n + centimes;
	return total > 0n ? total : null;
}

/**
 * Une date du calendrier, vraiment : « 2026-02-30 » ne roule pas sur le 2 mars
 * (voir la mémoire du projet sur `Date.parse`).
 */
function dateValide(iso: string): boolean {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
	const date = new Date(`${iso}T00:00:00Z`);
	return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === iso;
}

function dateLongue(iso: string): string {
	return new Date(`${iso}T00:00:00Z`).toLocaleDateString('fr-FR', {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
		timeZone: 'UTC'
	});
}

function semestre(iso: string): string {
	const [annee, mois] = iso.split('-');
	return Number(mois) <= 6 ? `1er semestre ${annee}` : `2e semestre ${annee}`;
}

type Resultat =
	| { readonly genre: 'saisie'; readonly message: string }
	| {
			readonly genre: 'calcul';
			readonly principal: bigint;
			readonly ligne: ReturnType<typeof decompterFacture>;
			readonly jours: number;
			readonly limite: string;
			readonly depassee: boolean;
	  };

function calculer(montant: string, echeance: string, secteur: Secteur, jour: string): Resultat {
	const centimes = lireMontant(montant);
	if (centimes === null) return { genre: 'saisie', message: 'Tapez le montant de la facture.' };
	if (!dateValide(echeance))
		return { genre: 'saisie', message: 'Choisissez la date d’échéance de la facture.' };
	if (echeance >= jour)
		return {
			genre: 'saisie',
			message: 'Cette facture n’est pas encore en retard : rien n’est dû au-delà de son montant.'
		};
	try {
		const principal = depuisCentimes(centimes);
		const ligne = decompterFacture(
			{
				reference: 'votre facture',
				montantExigible: principal,
				dateExigibilite: echeance,
				reglements: [],
				taux: periodesDeTauxParDefaut(echeance, jour)
			},
			jour,
			'ACT_365',
			'PENALITES_DABORD'
		);
		const limite = dateDePrescription(echeance, secteur);
		return {
			genre: 'calcul',
			principal: centimes,
			ligne,
			jours: joursEntre(echeance, jour),
			limite,
			depassee: limite <= jour
		};
	} catch {
		// Un semestre absent de la série FAIT LEVER, et ne s'extrapole jamais.
		return {
			genre: 'saisie',
			message:
				'Ce calcul ne se fait pas pour cette échéance : le taux d’une des périodes n’est pas relevé.'
		};
	}
}

function Champ({ etiquette, children }: { etiquette: string; children: React.ReactNode }) {
	return (
		<label className="flex flex-col gap-1.5">
			<span className="text-cladd-sm font-semibold">{etiquette}</span>
			{children}
		</label>
	);
}

/** `secteurInitial` : une page de métier ouvre le calculateur sur son régime (le transport). */
export function Calcul({ secteurInitial = 'GENERAL' }: { secteurInitial?: Secteur } = {}) {
	const jour = aujourdHui();
	const [montant, setMontant] = useState('12 400');
	const [echeance, setEcheance] = useState(() => ajouterMois(jour, -7));
	const [secteur, setSecteur] = useState<Secteur>(secteurInitial);

	// Le taux du semestre en cours doit être relevé : sans lui, aucun calcul du
	// jour ne serait juste, et la section se tait.
	try {
		tauxPenaliteParDefaut(jour);
	} catch {
		return null;
	}

	const resultat = calculer(montant, echeance, secteur, jour);
	const transport = REGIMES_PRESCRIPTION.TRANSPORT_MARCHANDISES.dureeAnnees;
	const general = REGIMES_PRESCRIPTION.GENERAL.dureeAnnees;

	return (
		<SectionMarketing id="calcul" ton="profond" className="light cladd-color-brand gap-cladd-lg">
			<div className="flex flex-col gap-cladd-2xs">
				<TitreSection>Combien vous doit-on, vraiment ?</TitreSection>
				<Chapeau>
					Les pénalités de retard et les frais de recouvrement sont dus de plein droit, sans clause
					au contrat. Tapez une facture en retard : le moteur de Letikette fait le calcul.
				</Chapeau>
			</div>

			<div className="grid gap-cladd-2xs lg:grid-cols-5">
				{/* LA FACTURE : trois réponses, rien de plus. */}
				<div className="flex flex-col gap-cladd-xs rounded-carte-site bg-papier p-cladd-xs shadow-carte-chaude md:p-cladd-sm lg:col-span-2">
					<Champ etiquette="Montant de la facture">
						<Input
							value={montant}
							onChange={setMontant}
							inputMode="decimal"
							suffix={<span className="mr-3 text-cladd-fg-softer">€</span>}
							valid={lireMontant(montant) !== null}
						/>
					</Champ>
					<Champ etiquette="Date d’échéance">
						<Input type="date" value={echeance} onChange={setEcheance} max={jour} />
					</Champ>
					<div className="flex flex-col gap-1.5">
						<span className="text-cladd-sm font-semibold">Ce que vous facturez</span>
						<SurfaceCut outline className="w-fit max-w-full rounded-full" contentClassName="p-1">
							<Segmented activeColor="brand" activeVariant="solid-fill">
								<SegmentedButton
									active={secteur === 'GENERAL'}
									onClick={() => setSecteur('GENERAL')}
								>
									En général
								</SegmentedButton>
								<SegmentedButton
									active={secteur === 'TRANSPORT_MARCHANDISES'}
									onClick={() => setSecteur('TRANSPORT_MARCHANDISES')}
								>
									Transport
								</SegmentedButton>
							</Segmented>
						</SurfaceCut>
						<span className="text-cladd-sm leading-relaxed text-encre-site-douce">
							Une facture se réclame en justice pendant {general} ans, {transport} an pour le
							transport de marchandises.
						</span>
					</div>
				</div>

				{/* CE QU'ELLE VAUT AUJOURD'HUI, calculé à chaque frappe. */}
				<div
					aria-live="polite"
					className="flex flex-col gap-cladd-xs rounded-carte-site bg-teinte-argent p-cladd-xs md:p-cladd-sm lg:col-span-3"
				>
					{resultat.genre === 'saisie' ? (
						<p className="text-chapeau leading-relaxed">{resultat.message}</p>
					) : (
						<>
							<div className="flex flex-col gap-1">
								{/* Une facture dont le délai est dépassé ne se réclame plus en justice :
								    elle ne « vous est » plus due de la même façon, elle le serait. */}
								<span className="text-cladd-md font-semibold">
									{resultat.depassee
										? 'Ce qu’elle vaudrait aujourd’hui'
										: 'Ce qu’on vous doit aujourd’hui'}
								</span>
								<span className="font-serif text-affiche-colonne leading-none font-medium tracking-titre-section whitespace-nowrap tabular-nums">
									{eurosCentimes(resultat.ligne.total)}
								</span>
							</div>

							<dl className="flex flex-col divide-y divide-encre-site/10 rounded-cladd-xl bg-papier/70">
								<div className="flex items-baseline justify-between gap-cladd-2xs px-cladd-2xs py-cladd-3xs">
									<dt className="text-cladd-xs md:text-cladd-sm">La facture</dt>
									<dd className="text-cladd-xs font-semibold whitespace-nowrap tabular-nums md:text-cladd-md">
										{eurosCentimes(resultat.principal)}
									</dd>
								</div>
								<div className="flex items-baseline justify-between gap-cladd-2xs px-cladd-2xs py-cladd-3xs">
									<dt className="flex flex-col">
										<span className="text-cladd-xs md:text-cladd-sm">Pénalités de retard</span>
										<span className="text-cladd-2xs text-encre-site-douce">
											{resultat.jours} jours de retard
										</span>
									</dt>
									<dd className="text-cladd-xs font-semibold whitespace-nowrap tabular-nums md:text-cladd-md">
										{eurosCentimes(resultat.ligne.interets)}
									</dd>
								</div>
								<div className="flex items-baseline justify-between gap-cladd-2xs px-cladd-2xs py-cladd-3xs">
									<dt className="text-cladd-xs md:text-cladd-sm">Frais de recouvrement</dt>
									<dd className="text-cladd-xs font-semibold whitespace-nowrap tabular-nums md:text-cladd-md">
										{eurosCentimes(resultat.ligne.indemniteForfaitaire)}
									</dd>
								</div>
							</dl>

							<div className="flex items-start gap-cladd-3xs">
								<span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-papier">
									<PictoPrescription className="size-5 text-encre-site" />
								</span>
								<p className="text-cladd-md leading-relaxed">
									{resultat.depassee ? (
										<>
											Le délai pour agir en justice est dépassé depuis le{' '}
											<strong className="font-semibold">{dateLongue(resultat.limite)}</strong> :
											cette facture ne se réclame plus devant un tribunal.
										</>
									) : (
										<>
											Date limite pour agir en justice :{' '}
											<strong className="font-semibold">{dateLongue(resultat.limite)}</strong>.
											Après, cette facture ne se réclame plus.
										</>
									)}
								</p>
							</div>

							{/* LE CALCUL SE REFAIT À LA MAIN : une ligne par période de taux. */}
							<details className="faq group rounded-cladd-xl bg-papier/70">
								<summary className="flex min-h-11 cursor-pointer items-center justify-between gap-cladd-2xs px-cladd-xs text-cladd-md font-semibold">
									Le calcul, période par période
									<ChevronDownIcon
										aria-hidden
										size={18}
										className="shrink-0 transition-transform group-open:rotate-180"
									/>
								</summary>
								<ul className="flex flex-col gap-cladd-3xs px-cladd-xs pb-cladd-xs">
									{resultat.ligne.segments.map((segment) => (
										<li
											key={segment.debut}
											className="flex items-baseline justify-between gap-cladd-xs"
										>
											<span className="flex flex-col">
												<span className="text-cladd-sm font-medium">{semestre(segment.debut)}</span>
												<span className="text-cladd-sm text-encre-site-douce tabular-nums">
													{eurosCentimes(segment.principal)} × {tauxLisible(segment.taux)} ×{' '}
													{segment.jours} j ÷ {segment.baseAnnuelle}
												</span>
											</span>
											<span className="text-cladd-sm font-semibold whitespace-nowrap tabular-nums">
												{eurosCentimes(segment.interets)}
											</span>
										</li>
									))}
								</ul>
							</details>

							<div className="pt-cladd-3xs">
								<BoutonAffiche as={Link} to="/inscription" fond="jour">
									Faire ce calcul sur toutes mes factures
									<ArrowRightIcon />
								</BoutonAffiche>
							</div>
						</>
					)}
				</div>
			</div>

			{/* LA SOURCE, en une ligne sous le calcul : l'endroit où un lecteur la cherche. */}
			{ARTICLES_DU_SOCLE.length > 0 ? (
				<p className="text-cladd-sm text-encre-site-claire">
					Code de commerce, art. {ARTICLES_DU_SOCLE.join(', ')}. Sans aucun paiement depuis
					l’échéance, au taux de la Banque centrale européenne majoré de dix points, sur 365 jours.
				</p>
			) : null}
		</SectionMarketing>
	);
}
