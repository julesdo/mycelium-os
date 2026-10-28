import type { CSSProperties } from 'react';
import { Plume } from '../../ui';
import {
	FACTURE_DE_LA_LOI as F,
	JOUR_DE_LA_LOI,
	LOI,
	dateLongue,
	eurosDeLaLoi,
	jourEtMois,
	moisEtAnnee
} from './loi-demo';

/**
 * LA LOI : LA VIE D'UNE FACTURE (maquette V26). Une facture de démonstration, de son échéance au
 * jour où on la réclame : les jours qui passent sous le massif qui vieillit, les pénalités qui
 * gravissent la montagne semestre par semestre, les frais qui pendent à chaque facture, et la date
 * limite pour agir au bout du chemin.
 *
 * ⚠️ TOUT CE QUI EST CHIFFRÉ SORT DU MOTEUR ET DU REGISTRE (`loi-demo.ts`), jamais de la maquette,
 * dont la répartition par semestre était fausse. Le mot du droit (« indemnité forfaitaire ») ne
 * vit que sur la facture dessinée, d'où il vient (`pays/france/mention-de-facture.ts`) ; le
 * texte de la page dit « frais » (`lexique.test.ts`).
 *
 * Le moteur des tableaux vit dans `ui/site/loi.ts`.
 */
function segment(i: number) {
	const s = LOI.segments[i];
	if (!s) throw new Error('La facture de la loi doit traverser deux semestres.');
	return s;
}
const S1 = segment(0),
	S2 = segment(1);

const variables = (v: Record<string, string>): CSSProperties => v as CSSProperties;
const semestre = (iso: string) => (Number(iso.slice(5, 7)) <= 6 ? '1er semestre' : '2d semestre');
const majuscule = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const eurosRondsDeLaLoi = (c: number) => (c % 100 === 0 ? `${c / 100} €` : eurosDeLaLoi(c));
/** « 893,43 euros », pour un lecteur d'écran. */
const eurosEnMots = (c: number) => eurosDeLaLoi(c).replace(' €', ' euros');

export function SectionLoi() {
	return (
		<section className="section loi" id="loi">
			<div className="enveloppe">
				<div className="revele">
					<h2>
						La loi vous doit déjà de l’argent.{' '}
						<span className="ton">Letikette le calcule au centime.</span>
					</h2>
					<p className="chapeau">
						Suivez une facture restée impayée. Tout ce qui s’y ajoute est dû de plein droit, sans
						clause au contrat, et presque personne ne le réclame.
					</p>
				</div>
				<div className="chrono" data-chrono="">
					<span className="chrono-fil" aria-hidden="true">
						<i data-fil="" />
					</span>
					<article className="jalon">
						<div className="jalon-texte">
							<span className="jalon-point" aria-hidden="true" />{' '}
							<span className="mono jalon-pastille">{dateLongue(F.echeance)}</span>
							<h3>L’échéance passe.</h3>
							<p>
								{`${F.client} devait ${eurosDeLaLoi(F.ttc)} ce jour-là. Rien n’est arrivé sur votre compte, et chaque jour qui passe compte.`}
							</p>
						</div>
						<figure
							className="tableau grain"
							data-vivant=""
							data-tableau="saisons"
							aria-label={`Du ${jourEtMois(F.echeance)} au ${jourEtMois(JOUR_DE_LA_LOI)} : ${LOI.jours} jours sans paiement.`}
						>
							<canvas data-paysage="saisons" aria-hidden="true" />
							<div className="t-ciel" data-ciel-saisons="">
								<b>
									<span data-jours-t="">{LOI.jours}</span> <small>jours</small>
								</b>
								<span>{`sans paiement, du ${jourEtMois(F.echeance)} au ${jourEtMois(JOUR_DE_LA_LOI)}`}</span>
							</div>
							<div className="posee" aria-hidden="true">
								<span className="fd-papier">
									<span className="fd-tete">
										<span className="fd-logo">ML</span>
										<span className="fd-nom">Menuiserie Laurent</span>
									</span>{' '}
									<span className="fd-titre">
										<i>Facture</i>
										F-2026-118
									</span>{' '}
									<span className="fd-barre" style={{ width: '70%' }} />{' '}
									<span className="fd-barre" style={{ width: '46%' }} />{' '}
									<span className="fd-echeance">
										<span>Échéance</span>
										<b>{dateLongue(F.echeance)}</b>
									</span>{' '}
									<span className="fd-lignes">
										<span>
											<span className="fd-barre" style={{ width: '56%' }} />
											<span className="fd-barre" style={{ width: '22%' }} />
										</span>{' '}
										<span>
											<span className="fd-barre" style={{ width: '40%' }} />
											<span className="fd-barre" style={{ width: '18%' }} />
										</span>
									</span>{' '}
									<span className="fd-total">
										<span>Total TTC</span>
										<b>{eurosDeLaLoi(F.ttc)}</b>
									</span>
								</span>{' '}
								<span className="corne" />
							</div>
						</figure>
					</article>
					<article className="jalon">
						<div className="jalon-texte">
							<span className="jalon-point" aria-hidden="true" />{' '}
							<span className="mono jalon-pastille">{`Dès le ${jourEtMois(LOI.lendemain)}`}</span>
							<h3>Les pénalités de retard courent.</h3>
							<p>
								{`Au taux de la Banque centrale européenne majoré de ${LOI.majoration}, chaque jour, jusqu’au paiement. Letikette les compte semestre par semestre, au taux de chacun.`}
							</p>
							<span className="mono ref">{`Code de commerce · ${LOI.articles.penalites}`}</span>
						</div>
						<figure
							className="tableau grain"
							data-vivant=""
							data-tableau="courbe"
							aria-label={`Les pénalités montent jusqu’à ${eurosEnMots(LOI.penalites)}, semestre par semestre.`}
						>
							<canvas data-paysage="ete" aria-hidden="true" />
							<svg className="t-fils" data-courbe-svg="" aria-hidden="true">
								<line className="t-coupure" data-coupure="" />
								<path className="t-courbe-halo" pathLength="1" data-courbe-halo="" />
								<path className="t-courbe" pathLength="1" data-courbe="" />
								<circle className="t-point-halo" r="11" data-point-halo="" />
								<circle className="t-point" r="4.5" data-point="" />
								<path className="t-fil" data-fil-courbe="" />
							</svg>
							<span className="t-repere" data-repere="debut">
								{jourEtMois(LOI.lendemain)}
							</span>{' '}
							<span
								className="t-repere"
								data-repere="coupure"
							>{`${jourEtMois(S2.debut)}, nouveau taux`}</span>
							<div className="etq etq-courbe" data-etq-courbe="">
								<div className="etq-entree">
									<span className="etq-papier">
										<span className="etq-label">Pénalités de retard</span>{' '}
										<span className="etq-montant" data-pen-t="">
											{eurosDeLaLoi(LOI.penalites)}
										</span>{' '}
										<span className="etq-ligne">
											<span>{`${S1.jours} j, ${semestre(S1.debut)}`}</span>
											<b>{eurosDeLaLoi(S1.interets)}</b>
										</span>{' '}
										<span className="etq-ligne">
											<span>{`${S2.jours} j, ${semestre(S2.debut)}`}</span>
											<b>{eurosDeLaLoi(S2.interets)}</b>
										</span>
									</span>{' '}
									<span className="etq-pli" />
									<span className="etq-oeillet" data-oeillet-courbe="" />
								</div>
							</div>
						</figure>
					</article>
					<article className="jalon">
						<div className="jalon-texte">
							<span className="jalon-point" aria-hidden="true" />{' '}
							<span className="mono jalon-pastille">Sur chaque facture</span>
							<h3>{`${eurosRondsDeLaLoi(LOI.indemnite)} de frais de recouvrement.`}</h3>
							<p>
								Des frais forfaitaires, dus pour chaque facture payée en retard, en plus des
								pénalités. Ils s’additionnent facture par facture.
							</p>
							<span className="mono ref">{`Code de commerce · ${LOI.articles.frais}`}</span>
						</div>
						<figure
							className="tableau grain"
							data-vivant=""
							data-tableau="forfait"
							aria-label={`Trois factures en retard : trois fois ${LOI.indemnite / 100} euros, ${(3 * LOI.indemnite) / 100} euros.`}
						>
							<canvas data-paysage="rosee2" aria-hidden="true" />
							<div
								className="pendant"
								style={variables({ '--x': '7%', '--l': '64px', '--d': '4.6s', '--r': '0ms' })}
								aria-hidden="true"
							>
								<div className="pendant-int">
									<span className="pendant-fil" />
									<div className="etq">
										<span className="etq-papier">
											<span className="etq-label">F-2026-142</span>
											<span className="etq-montant">{`+ ${eurosRondsDeLaLoi(LOI.indemnite)}`}</span>
											<span className="etq-sous">{eurosDeLaLoi(F.autres[0].ttc)}</span>
										</span>
										<span className="etq-pli" />
										<span className="etq-oeillet" />
									</div>
								</div>
							</div>
							<div
								className="pendant"
								style={variables({ '--x': '37%', '--l': '128px', '--d': '5.3s', '--r': '160ms' })}
								aria-hidden="true"
							>
								<div className="pendant-int">
									<span className="pendant-fil" />
									<div className="etq">
										<span className="etq-papier">
											<span className="etq-label">F-2026-131</span>
											<span className="etq-montant">{`+ ${eurosRondsDeLaLoi(LOI.indemnite)}`}</span>
											<span className="etq-sous">{eurosDeLaLoi(F.autres[1].ttc)}</span>
										</span>
										<span className="etq-pli" />
										<span className="etq-oeillet" />
									</div>
								</div>
							</div>
							<div
								className="pendant"
								style={variables({ '--x': '67%', '--l': '36px', '--d': '3.9s', '--r': '320ms' })}
								aria-hidden="true"
							>
								<div className="pendant-int">
									<span className="pendant-fil" />
									<div className="etq">
										<span className="etq-papier">
											<span className="etq-label">F-2026-118</span>
											<span className="etq-montant">{`+ ${eurosRondsDeLaLoi(LOI.indemnite)}`}</span>
											<span className="etq-sous">{eurosDeLaLoi(F.ttc)}</span>
										</span>
										<span className="etq-pli" />
										<span className="etq-oeillet" />
									</div>
								</div>
							</div>
							<span className="t-pilule">
								Trois factures en retard <b>{eurosDeLaLoi(3 * LOI.indemnite)}</b>
							</span>
						</figure>
					</article>
					<article className="jalon">
						<div className="jalon-texte">
							<span className="jalon-point" aria-hidden="true" />{' '}
							<span className="mono jalon-pastille">{`Jusqu’au ${dateLongue(LOI.prescription)}`}</span>
							<h3>Une date limite pour agir.</h3>
							<p>
								{`${majuscule(LOI.general)} en général, ${LOI.enTransport} sur le transport. Passé ce jour, la facture ne se réclame plus en justice. Letikette surveille la date de chaque facture, chaque jour.`}
							</p>
							<span className="mono ref">{`Code de commerce · ${LOI.articles.prescription}`}</span>
						</div>
						<figure
							className="tableau grain"
							data-vivant=""
							data-tableau="horizon"
							aria-label={`Il reste ${LOI.pourAgir} pour agir, jusqu’au ${dateLongue(LOI.prescription)}.`}
						>
							<canvas data-paysage="nuit31" aria-hidden="true" />
							<div className="t-ciel t-blanc">
								<b>{LOI.pourAgir}</b>
								<span>{`pour agir en justice, jusqu’au ${dateLongue(LOI.prescription)}`}</span>
							</div>
							<svg className="t-fils" data-horizon-svg="" aria-hidden="true">
								<path className="t-chemin" data-chemin="" />
								<path className="t-lueur" pathLength="1" data-lueur="" />
								<circle className="t-transport-halo" r="9" data-transport-halo="" />
								<circle className="t-transport" r="3.5" data-transport="" />
							</svg>
							<span
								className="t-repere"
								data-repere="transport"
							>{`Transport : ${moisEtAnnee(LOI.transport)}`}</span>
							<div className="drapeau" data-drapeau="" aria-hidden="true">
								<div className="etq">
									<span className="etq-papier">{dateLongue(LOI.prescription)}</span>
									<span className="etq-pli" />
									<span className="etq-oeillet" />
								</div>
								<span className="drapeau-hampe" />
							</div>
							<div className="plume-veille" data-plume-veille="" aria-hidden="true">
								<Plume decoratif />
							</div>
						</figure>
					</article>
				</div>
				<div className="conclusion">
					<div className="conclusion-texte revele">
						<span className="mono">{`Au ${dateLongue(JOUR_DE_LA_LOI)}`}</span>
						<h3>{`Ce que ${F.client} vous doit.`}</h3>
						<p>
							La facture, plus tout ce que la loi y ajoute, compté au jour où vous le réclamez.
							Chaque ligne se décompose et se refait à la main.
						</p>
						<a className="lien-calcul" href="#appel">
							Faire ce calcul sur vos factures{' '}
							<svg
								width="14"
								height="14"
								viewBox="0 0 16 16"
								fill="none"
								stroke="currentColor"
								strokeWidth="1.8"
								strokeLinecap="round"
								aria-hidden="true"
							>
								<path d="M3 8h10M9 4l4 4-4 4" />
							</svg>
						</a>
					</div>
					<div className="recit-scene">
						<div className="ombre">
							<div className="etiquette grain table" data-vivant="" data-table-conclusion="">
								<canvas data-paysage="matin" aria-hidden="true" />
								<span className="pli" />
								<svg className="cordon" aria-hidden="true">
									<path data-cordon="" d="" />
								</svg>
								<article
									className="facture"
									aria-label={`Facture ${F.reference} de ${F.emetteur} à ${F.client}`}
								>
									<span className="agrafe" data-agrafe="" />
									<header className="facture-tete">
										<div className="emetteur">
											<b>Menuiserie Laurent</b>
											<span>Lyon 7e</span>
										</div>
										<div className="numero">
											<span className="mono">Facture</span>
											<b>F-2026-118</b>
										</div>
									</header>
									<div className="facture-meta">
										<div>
											<span>Facturé à</span>
											Fournitures Durand
										</div>
										<div>
											<span>Émise le</span>
											{dateLongue(F.emiseLe)}
										</div>
										<div>
											<span>Échéance</span>
											<em className="surligne actif" data-surligne="1">
												{dateLongue(F.echeance)}
											</em>
										</div>
										<div>
											<span>Règlement</span>
											Par virement
										</div>
									</div>
									<table className="facture-lignes">
										<thead>
											<tr>
												<th>Désignation</th>
												<th>Montant</th>
											</tr>
										</thead>
										<tbody>
											<tr>
												<td>Fourniture et pose de menuiseries bois</td>
												<td>{eurosDeLaLoi(F.hors)}</td>
											</tr>
											<tr>
												<td>TVA 20 %</td>
												<td>{eurosDeLaLoi(F.tva)}</td>
											</tr>
										</tbody>
									</table>
									<div className="facture-total">
										<span>Total TTC</span>
										<span>{eurosDeLaLoi(F.ttc)}</span>
									</div>
									<p className="facture-mentions">
										En cas de retard de paiement :{' '}
										<span className="surligne actif" data-surligne="2">
											{LOI.mention.penalites}
										</span>{' '}
										et{' '}
										<span className="surligne actif" data-surligne="3">
											{LOI.mention.frais}
										</span>
										.
									</p>
								</article>
								<div className="etiquette-recit ombre" data-etiquette-recit="">
									<div className="etiquette">
										<span className="pli" /> <span className="oeillet" data-oeillet="" />{' '}
										<span className="mono entete">Letikette · F-2026-118</span>
										<div className="ligne-recit visible" data-des="1">
											<span>Échue depuis le</span>
											<b>{dateLongue(F.echeance)}</b>
										</div>
										<div className="ligne-recit visible" data-des="2">
											<span>Jours de retard</span>
											<b data-jours="">{LOI.jours}</b>
										</div>
										<div className="ligne-recit visible" data-des="2">
											<span>Pénalités de retard</span>
											<b data-penalites="">{eurosDeLaLoi(LOI.penalites)}</b>
										</div>
										<div className="ligne-recit visible" data-des="3">
											<span>Frais de recouvrement</span>
											<b>{eurosDeLaLoi(LOI.indemnite)}</b>
										</div>
										<div className="ligne-recit visible" data-des="4">
											<span>Date limite pour agir</span>
											<b>{dateLongue(LOI.prescription)}</b>
										</div>
										<div className="total-recit">
											<span className="mono">Ce qu’on vous doit</span>
											<b data-total="">{eurosDeLaLoi(LOI.total)}</b>
											<small>{`Compté au ${dateLongue(JOUR_DE_LA_LOI)}`}</small>
										</div>
									</div>
								</div>
								<div className="plume-loi">
									<Plume humeur="travaille" className="clair" />
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
