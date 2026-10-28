import { PORTRAITS_DE_LA_DEFENSE } from '../../ui/site/avatars';
import { TUILES_DU_SITE } from '../fonctionnalites';
import { eurosDeLaLoi } from './loi-demo';
import { DEPOT_DU_MATIN } from './plume-demo';
import { ECHEANCIER, PAIEMENT, SANTE, eurosRonds, tuile } from './tout-demo';

/**
 * TOUT CE QUI VA AVEC (maquette V26). Six tuiles, chacune avec sa petite scène : le coffre qui
 * scelle, le cadran de la santé d'un client, les coupons d'un paiement en trois fois, la page où
 * le client paie, les professionnels près de chez lui, les logiciels branchés.
 *
 * ⚠️ LE NOM, LA PHRASE ET LE LIEN DE CHAQUE TUILE SE LISENT AU REGISTRE (`fonctionnalites.ts`,
 * champ `carte`, ordre `TUILES_DU_SITE`) ; ce que ses décors chiffrent, au produit
 * (`tout-demo.ts`). Les scènes se jouent au survol, au focus ou à l'arrivée à l'écran
 * (`ui/site/tuiles.ts`).
 */
const T = Object.fromEntries(TUILES_DU_SITE.map((cle) => [cle, tuile(cle)])) as Record<
	(typeof TUILES_DU_SITE)[number],
	ReturnType<typeof tuile>
>;
function versement(i: number) {
	const v = ECHEANCIER.versements[i];
	if (!v) throw new Error('Le paiement en trois fois de la tuile doit avoir trois versements.');
	return v;
}
const V0 = versement(0),
	V1 = versement(1),
	V2 = versement(2);

export function SectionTout() {
	return (
		<section className="section tout" id="tout">
			<div className="enveloppe">
				<h2 className="revele">
					Tout ce qui va avec. <span className="ton">Déjà dans l’application.</span>
				</h2>
				<div className="tuiles">
					<a className="tuile" href={T.coffre.ancre} data-tuile="coffre">
						<div className="decor">
							<canvas data-paysage="brume" aria-hidden="true" />
							<div className="plan" aria-hidden="true">
								<div className="pile-docs">
									<span className="feuillet pap ressort d1">
										<b>{`${PAIEMENT.reference}.pdf`}</b>
										<span className="barres">
											<i />
											<i />
											<i />
											<i />
										</span>
										<em className="sceau-doc">
											<svg viewBox="0 0 24 24">
												<rect x="6" y="11" width="12" height="9" rx="2" />
												<path d="M9 11V8.5a3 3 0 0 1 6 0V11" />
											</svg>
										</em>
									</span>{' '}
									<span className="feuillet pap ressort d2">
										<b>FEC-2026-T3.txt</b>
										<span className="barres">
											<i />
											<i />
											<i />
											<i />
										</span>
										<em className="sceau-doc">
											<svg viewBox="0 0 24 24">
												<rect x="6" y="11" width="12" height="9" rx="2" />
												<path d="M9 11V8.5a3 3 0 0 1 6 0V11" />
											</svg>
										</em>
									</span>{' '}
									<span className="feuillet pap ressort d3">
										<b>Devis-2026-031.pdf</b>
										<span className="barres">
											<i />
											<i />
											<i />
											<i />
										</span>
										<em className="sceau-doc">
											<svg viewBox="0 0 24 24">
												<rect x="6" y="11" width="12" height="9" rx="2" />
												<path d="M9 11V8.5a3 3 0 0 1 6 0V11" />
											</svg>
										</em>
									</span>
								</div>
							</div>
							<span className="etq-tuile" data-etq-coffre="" aria-hidden="true">
								<span className="etq-papier">
									<small data-etq-nom="">FEC-2026-T3.txt</small>
									<b data-etq-heure="">Scellé à 9:41</b>
								</span>
								<span className="etq-pli" />
								<span className="etq-oeillet" />
							</span>
						</div>
						<h3>
							{`${T.coffre.nom} `}
							<svg className="t-fleche" viewBox="0 0 16 16" aria-hidden="true">
								<path d="M3 8h10M9 4l4 4-4 4" />
							</svg>
						</h3>
						<p>{T.coffre.phrase}</p>
					</a>{' '}
					<a className="tuile" href={T.sante.ancre} data-tuile="sante">
						<div className="decor">
							<canvas data-paysage="brume" aria-hidden="true" />
							<div className="plan" aria-hidden="true">
								<div className="sante">
									<div className="cadran">
										<svg viewBox="0 0 200 116" data-cadran="">
											<g data-graduations="" />
											<text className="chiffre-grad" x="22" y="114" textAnchor="middle">
												0
											</text>
											<text className="chiffre-grad" x="100" y="20" textAnchor="middle">
												50
											</text>
											<text className="chiffre-grad" x="178" y="114" textAnchor="middle">
												100
											</text>
											<line
												className="aiguille"
												data-aiguille=""
												x1="100"
												y1="100"
												x2="100"
												y2="38"
											/>
											<circle className="pivot" cx="100" cy="100" r="6.5" />
											<circle className="pivot-int" cx="100" cy="100" r="2.4" />
										</svg>
										<div className="cadran-val">
											<b data-indice="">{SANTE.indice}</b>
											<span>{`sur 100 · ${SANTE.niveau}`}</span>
										</div>
									</div>
									<ul className="faits" data-faits="">
										{SANTE.faits.map((f) => (
											<li className="pap" key={f.court}>
												<b>{f.effet}</b>
												{f.court}
											</li>
										))}
									</ul>
								</div>
							</div>
						</div>
						<h3>
							{`${T.sante.nom} `}
							<svg className="t-fleche" viewBox="0 0 16 16" aria-hidden="true">
								<path d="M3 8h10M9 4l4 4-4 4" />
							</svg>
						</h3>
						<p>{T.sante.phrase}</p>
					</a>{' '}
					<a className="tuile" href={T.parole.ancre} data-tuile="echeancier">
						<div className="decor">
							<canvas data-paysage="brume" aria-hidden="true" />
							<div className="plan" aria-hidden="true">
								<div className="echeancier">
									<div className="coupons">
										<div className="coupon pap">
											<span className="mono">{V0.date}</span>
											<b>{eurosRonds(V0.montant)}</b>
											<small>{'\u00a0'}</small>
											<em className="tampon">Reçu</em>
										</div>
										<div className="coupon pap coupon-mois">
											<span className="mono">{V1.date}</span>
											<b>{eurosRonds(V1.montant)}</b>
											<small>{`dans ${V1.dans} jours`}</small>
											<em className="tampon tampon-mois">Reçu</em>
										</div>
										<div className="coupon pap a-venir">
											<span className="mono">{V2.date}</span>
											<b>{eurosRonds(V2.montant)}</b>
											<small>à venir</small>
										</div>
									</div>
									<div className="jauge-ech">
										<div className="piste">
											<i />
										</div>
										<span>
											<b
												data-recu=""
												data-avant={eurosRonds(ECHEANCIER.recu[0] ?? 0)}
												data-apres={eurosRonds(ECHEANCIER.recu[1] ?? 0)}
											>
												{eurosRonds(ECHEANCIER.recu[0] ?? 0)}
											</b>
											{` reçus sur ${eurosRonds(ECHEANCIER.total)}`}
										</span>
									</div>
								</div>
							</div>
						</div>
						<h3>
							{`${T.parole.nom} `}
							<svg className="t-fleche" viewBox="0 0 16 16" aria-hidden="true">
								<path d="M3 8h10M9 4l4 4-4 4" />
							</svg>
						</h3>
						<p>{T.parole.phrase}</p>
					</a>{' '}
					<a className="tuile" href={T.paiement.ancre} data-tuile="paiement">
						<div className="decor">
							<canvas data-paysage="brume" aria-hidden="true" />
							<div className="plan" aria-hidden="true">
								<div className="bordereau pap">
									<span className="mono">{`À régler à ${PAIEMENT.emetteur}`}</span>{' '}
									<b className="somme">{eurosDeLaLoi(PAIEMENT.montant)}</b>
									<div className="copie copie-iban">
										<span>IBAN</span>
										<code>FR76 3000 4000 0312 …</code>
										<i className="copier">
											<span className="avant">Copier</span>
											<span className="fait">
												<svg viewBox="0 0 12 12">
													<path d="M2.5 6.4l2.3 2.3 4.7-5.2" />
												</svg>
												Copié
											</span>
										</i>
									</div>
									<div className="copie">
										<span>Référence</span>
										<code>{PAIEMENT.reference}</code>
										<i className="copier">
											<span className="avant">Copier</span>
										</i>
									</div>
								</div>
							</div>
							<div className="virement" aria-hidden="true">
								<i>
									<svg viewBox="0 0 12 12">
										<path d="M2.5 6.4l2.3 2.3 4.7-5.2" />
									</svg>
								</i>
								{'Virement reçu sur votre compte · '}
								<b>{eurosDeLaLoi(PAIEMENT.montant)}</b>
							</div>
						</div>
						<h3>
							{`${T.paiement.nom} `}
							<svg className="t-fleche" viewBox="0 0 16 16" aria-hidden="true">
								<path d="M3 8h10M9 4l4 4-4 4" />
							</svg>
						</h3>
						<p>{T.paiement.phrase}</p>
					</a>{' '}
					<a className="tuile" href={T.defense.ancre} data-tuile="defense">
						<div className="decor">
							<canvas data-paysage="brume" aria-hidden="true" />
							<div className="plan" aria-hidden="true">
								<div className="eventail">
									<div className="pro pap ressort p1">
										<span className="portrait" style={PORTRAITS_DE_LA_DEFENSE.rousseau}>
											LR
										</span>
										<b>Me L. Rousseau</b>
										<span>Avocat · sûretés</span>
										<em>
											<svg viewBox="0 0 10 10">
												<path d="M5 0.6a3.4 3.4 0 0 0-3.4 3.4C1.6 6.6 5 9.4 5 9.4S8.4 6.6 8.4 4A3.4 3.4 0 0 0 5 0.6zm0 4.7a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6z" />
											</svg>
											4,0 km
										</em>
									</div>
									<div className="pro pap ressort p3">
										<span className="portrait" style={PORTRAITS_DE_LA_DEFENSE.marchand}>
											ÉM
										</span>
										<b>Étude Marchand</b>
										<span>Commissaire de justice</span>
										<em>
											<svg viewBox="0 0 10 10">
												<path d="M5 0.6a3.4 3.4 0 0 0-3.4 3.4C1.6 6.6 5 9.4 5 9.4S8.4 6.6 8.4 4A3.4 3.4 0 0 0 5 0.6zm0 4.7a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6z" />
											</svg>
											3,1 km
										</em>
									</div>
									<div className="pro pap ressort p2">
										<span className="portrait" style={PORTRAITS_DE_LA_DEFENSE.bernard}>
											CB
										</span>
										<b>Me C. Bernard</b>
										<span>Avocat · droit commercial</span>
										<em>
											<svg viewBox="0 0 10 10">
												<path d="M5 0.6a3.4 3.4 0 0 0-3.4 3.4C1.6 6.6 5 9.4 5 9.4S8.4 6.6 8.4 4A3.4 3.4 0 0 0 5 0.6zm0 4.7a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6z" />
											</svg>
											2,4 km
										</em>
									</div>
								</div>
							</div>
						</div>
						<h3>
							{`${T.defense.nom} `}
							<svg className="t-fleche" viewBox="0 0 16 16" aria-hidden="true">
								<path d="M3 8h10M9 4l4 4-4 4" />
							</svg>
						</h3>
						<p>{T.defense.phrase}</p>
					</a>{' '}
					<a className="tuile" href={T.logiciels.ancre} data-tuile="logiciels">
						<div className="decor">
							<canvas data-paysage="brume" aria-hidden="true" />
							<div className="plan" aria-hidden="true">
								<div className="reseau">
									<svg viewBox="0 0 100 100" preserveAspectRatio="none">
										<path className="fil" d="M22 24 L50 50" />
										<path className="fil" d="M78 24 L50 50" />
										<path className="fil" d="M22 76 L50 50" />
										<path className="fil" d="M78 76 L50 50" />
										<path className="flux" pathLength="1" d="M22 24 L50 50" />
										<path className="flux" pathLength="1" d="M78 24 L50 50" />
										<path className="flux" pathLength="1" d="M22 76 L50 50" />
										<path className="flux" pathLength="1" d="M78 76 L50 50" />
									</svg>
									<span className="puce pap" style={{ left: '22%', top: '24%' }}>
										<img src="/connecteurs/logo-pennylane.svg" alt="" />
										Pennylane
									</span>{' '}
									<span className="puce pap" style={{ left: '78%', top: '24%' }}>
										<img src="/connecteurs/qonto-symbole-128.webp" alt="" />
										Qonto
									</span>{' '}
									<span className="puce pap" style={{ left: '22%', top: '76%' }}>
										<img src="/connecteurs/logo-quickbooks.svg" alt="" />
										QuickBooks
									</span>{' '}
									<span className="puce pap" style={{ left: '78%', top: '76%' }}>
										<img src="/connecteurs/logo-sellsy.svg" alt="" />
										Sellsy
									</span>{' '}
									<span className="centre-logo">
										<svg>
											<use href="#logo" />
										</svg>
									</span>{' '}
									<span className="compte-factures">
										+ <span data-factures="">{DEPOT_DU_MATIN.factures}</span> factures
									</span>
								</div>
							</div>
						</div>
						<h3>
							{`${T.logiciels.nom} `}
							<svg className="t-fleche" viewBox="0 0 16 16" aria-hidden="true">
								<path d="M3 8h10M9 4l4 4-4 4" />
							</svg>
						</h3>
						<p>{T.logiciels.phrase}</p>
					</a>
				</div>
			</div>
		</section>
	);
}
