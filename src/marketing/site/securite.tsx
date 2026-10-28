import { Link } from '@tanstack/react-router';
import { ALGORITHME } from '../../lib/socle/coffre/chiffrement';
import { HEURES_D_ENVOI } from '../../lib/verticales/recouvrement/plan-relance';
import { CorpsDEnveloppe, Cachet } from '../../ui/site/dessins-securite';
import { FACTURE_DE_LA_LOI as F, eurosDeLaLoi } from './loi-demo';
import { HEURE_DU_RAPPEL, PLUME, ROUSSEAU, initiales } from './plume-demo';
import { RELEVE } from './securite-demo';
import { euros } from './vitrine-demo';

/**
 * LA SÉCURITÉ (maquette V26). Trois garde-fous, trois objets de papier sous trois heures de la
 * nuit : la facture qu'on glisse dans l'enveloppe et qui se scelle, le relevé où les virements
 * arrivent sur votre compte (rien ne passe par Letikette), la lettre qu'on retient avant
 * qu'elle parte.
 *
 * ⚠️ CE QUI EST DIT SE LIT SUR LE PRODUIT : l'algorithme du coffre (`ALGORITHME`), les heures
 * d'envoi (`HEURES_D_ENVOI`), le délai pour retenir (`DELAI_POUR_RETENIR_MS`, par `plume-demo.ts`).
 * La facture, le relevé et la lettre sont ceux des autres démonstrations (`securite-demo.ts`).
 * Les gestes vivent dans `ui/site/securite.ts`.
 */
/** `surSaPage` : sur `/securite`, le lien vers la page qui détaille les mesures se tait. */
export function SectionSecurite({ surSaPage = false }: { surSaPage?: boolean }) {
	return (
		<section className="section securite" id="securite">
			<div className="nuit-fond grain" aria-hidden="true">
				<canvas data-paysage="nuit" />
			</div>
			<div className="enveloppe">
				<div className="revele">
					<h2 className="centre">
						Vos documents sont scellés.{' '}
						<span className="ton">Votre argent ne passe jamais par nous.</span>
					</h2>
					<p className="chapeau centre">Trois garde-fous, dans le produit que vous utiliserez.</p>
				</div>
				<div className="chapitres">
					<article className="chapitre revele" data-chapitre="scelle">
						<div className="chapitre-texte">
							<h3>Chaque document est scellé dès son arrivée.</h3>
							<p>
								Chiffré sous une clé propre à votre entreprise, avant toute lecture. Chaque
								ouverture est notée au journal.
							</p>
							<span className="chapitre-fait">{`${ALGORITHME} · une clé par entreprise`}</span>
						</div>
						<div className="tableau-sec-ombre">
							<div className="tableau-sec etiquette grain" data-tableau-sec="scelle" data-vivant="">
								<canvas data-paysage="secnuit" aria-hidden="true" />
								<span className="pli" />
								<div className="scene-sec" data-scene-sec="">
									<span className="s-trace" aria-hidden="true" />
									<div className="env-rabat" data-s-rabat="" aria-hidden="true" />
									<div
										className="facture-dessin s-facture"
										data-s-facture=""
										role="button"
										tabIndex={0}
										aria-label={`Facture ${F.reference}. Glissez-la dans l’enveloppe, ou appuyez sur Entrée pour la sceller.`}
									>
										<svg className="trombone" viewBox="0 0 24 60" aria-hidden="true">
											<path d="M8 44 V12 a5 5 0 0 1 10 0 V46 a8 8 0 0 1 -16 0 V18" />
										</svg>
										<span className="fd-papier">
											<span className="fd-tete">
												<span className="fd-logo">{initiales(F.emetteur)}</span>
												<span className="fd-nom">{F.emetteur}</span>
											</span>{' '}
											<span className="fd-titre">
												<i>Facture</i>
												{F.reference}
											</span>{' '}
											<span className="fd-barre" style={{ width: '72%' }} />{' '}
											<span className="fd-barre" style={{ width: '48%' }} />{' '}
											<span className="fd-lignes">
												<span>
													<span className="fd-barre" style={{ width: '58%' }} />
													<span className="fd-barre" style={{ width: '22%' }} />
												</span>{' '}
												<span>
													<span className="fd-barre" style={{ width: '46%' }} />
													<span className="fd-barre" style={{ width: '22%' }} />
												</span>{' '}
												<span>
													<span className="fd-barre" style={{ width: '34%' }} />
													<span className="fd-barre" style={{ width: '18%' }} />
												</span>
											</span>{' '}
											<span className="fd-total">
												<span>Total TTC</span>
												<b>{euros(F.ttc)}</b>
											</span>{' '}
											<span className="fd-barre fd-fine" style={{ width: '86%' }} />{' '}
											<span className="fd-barre fd-fine" style={{ width: '64%' }} />
										</span>{' '}
										<span className="corne" aria-hidden="true" />
									</div>
									<div className="env-corps" data-s-enveloppe="" aria-hidden="true">
										<CorpsDEnveloppe />
									</div>
									<div className="env-cachet" data-s-cachet="" aria-hidden="true">
										<Cachet />
									</div>
									<span className="env-fil" aria-hidden="true" />
									<div className="env-etiquette" data-s-etiquette="" aria-hidden="true">
										<span className="etq-papier">
											<span className="etq-oeillet" />
											<span className="etq-pli" />
											<span className="etq-label">
												Scellé à <b data-s-heure="">9:41</b>
											</span>
											<span className="etq-ligne">
												<span>Clé</span>
												<b>{F.emetteur}</b>
											</span>
											<span className="etq-ligne">
												<span>Chiffrement</span>
												<b>{ALGORITHME}</b>
											</span>
										</span>
									</div>
								</div>
								<span className="v-doigt s-doigt" data-s-doigt="" aria-hidden="true" />
								<button
									type="button"
									className="v-visite s-visite"
									data-s-visite=""
									data-mode="joue"
									aria-label="Mettre la visite en pause"
								>
									<span className="v-visite-ic" aria-hidden="true">
										<svg className="v-anneau" viewBox="0 0 24 24">
											<circle cx="12" cy="12" r="10.2" />
											<circle
												className="v-arc"
												data-s-arc=""
												cx="12"
												cy="12"
												r="10.2"
												pathLength="100"
											/>
										</svg>
										<svg className="g g-pause" viewBox="0 0 24 24">
											<path d="M10 8.6v6.8M14 8.6v6.8" />
										</svg>
										<svg className="g g-lecture" viewBox="0 0 24 24">
											<path d="M10 8.3v7.4l5.8-3.7z" />
										</svg>
										<svg className="g g-main" viewBox="0 0 24 24">
											<path d="M9.6 11.6V7.4a1.2 1.2 0 0 1 2.4 0v3.6m0-.6V9.6a1.2 1.2 0 0 1 2.4 0v1.6m0-.4a1.2 1.2 0 0 1 2.4 0v3.4a4.6 4.6 0 0 1-4.6 4.6h-.5a4.6 4.6 0 0 1-3.6-1.8l-1.7-2.2a1.25 1.25 0 0 1 1.9-1.6l1.3 1.5" />
										</svg>
										<svg className="g g-revoir" viewBox="0 0 24 24">
											<path d="M7.4 9.6A5.4 5.4 0 1 1 6.9 13.4" />
											<path d="M7 6.6v3.2h3.2" />
										</svg>
									</span>
									<span className="v-visite-t" data-s-visite-texte="">
										Visite guidée
									</span>
								</button>
							</div>
						</div>
					</article>
					<article className="chapitre revele" data-chapitre="argent">
						<div className="chapitre-texte">
							<h3>Votre client paie sur votre compte. Jamais sur le nôtre.</h3>
							<p>
								Sa page de paiement montre votre IBAN, le montant et la référence. Il valide le
								virement dans sa banque : aucun fonds ne passe par Letikette.
							</p>
							<span className="chapitre-fait">{`0\u00a0% de commission sur ce qui rentre`}</span>
						</div>
						<div className="tableau-sec-ombre">
							<div className="tableau-sec etiquette grain" data-tableau-sec="argent" data-vivant="">
								<canvas data-paysage="secbleue" aria-hidden="true" />
								<span className="pli" />
								<div className="scene-sec" data-scene-sec="">
									<p className="zero">
										<b>{`0,00\u00a0€`}</b>
										<span>passés par Letikette</span>
									</p>
									<div className="releve" data-releve-sec="" aria-label="Votre relevé de compte">
										<span className="releve-papier">
											<span className="releve-tete">
												<span className="releve-titre">Relevé de compte</span>
												<b>{F.emetteur}</b>
												<span className="releve-iban">FR76 •••• •••• 0143</span>
											</span>{' '}
											<span className="releve-solde">
												<span>Solde</span>
												<b data-solde="">{eurosDeLaLoi(RELEVE.solde)}</b>
											</span>{' '}
											<span className="releve-lignes" data-lignes="">
												<span className="releve-ligne">
													<i>27 oct.</i>
													<span>
														<small>Prélèvement</small>
														Bois & Co
													</span>
													<b className="moins">{`−2\u00a0380,00\u00a0€`}</b>
												</span>{' '}
												<span className="releve-ligne">
													<i>26 oct.</i>
													<span>
														<small>Virement</small>
														{ROUSSEAU.client}
													</span>
													<b>{`+${euros(RELEVE.rousseau)}`}</b>
												</span>
											</span>
										</span>{' '}
										<span className="etq-pli" aria-hidden="true" />
									</div>
								</div>
							</div>
						</div>
					</article>
					<article className="chapitre revele" data-chapitre="retenir">
						<div className="chapitre-texte">
							<h3>{`Chaque relance s’affiche ${PLUME.retenir} avant de partir.`}</h3>
							<p>
								Vous la retenez d’un geste, et elle ne part pas. Tout part à votre nom, et rien ne
								part vers un tribunal.
							</p>
							<span className="chapitre-fait">{`En semaine, de ${HEURES_D_ENVOI.de} h à ${HEURES_D_ENVOI.a} h`}</span>
						</div>
						<div className="tableau-sec-ombre">
							<div
								className="tableau-sec etiquette grain"
								data-tableau-sec="retenir"
								data-vivant=""
							>
								<canvas data-paysage="secaube" aria-hidden="true" />
								<span className="pli" />
								<div className="scene-sec" data-scene-sec="">
									<span className="lettre-ombre" data-s-ombre="" aria-hidden="true" />
									<div className="lettre-porteur">
										<div className="lettre-flotte">
											<div className="lettre" aria-hidden="true">
												<span className="lettre-de">
													{F.emetteur}
													<br />
													{F.ville}
												</span>{' '}
												<span className="lettre-fenetre">
													<b>{F.client}</b>
													Service comptabilité
													<br />
													69007 Lyon
												</span>{' '}
												<span className="lettre-objet">{`Rappel · facture ${F.reference}`}</span>{' '}
												<span className="lettre-trou" />
											</div>
											<span className="lettre-fil" aria-hidden="true" />
											<div className="lettre-etiquette">
												<span className="etq-papier">
													<span className="etq-oeillet" />
													<span className="etq-pli" />
													<span
														className="etq-label"
														data-s-depart=""
													>{`Part à ${HEURE_DU_RAPPEL}`}</span>
													<span
														className="lettre-compte"
														data-s-compte=""
													>{`dans ${PLUME.compteARebours} · à votre nom`}</span>
													<button type="button" className="lettre-retenir" data-s-retenir="">
														Retenir
													</button>
												</span>
											</div>
										</div>
									</div>
								</div>
								<span className="v-doigt s-doigt" data-s-doigt="" aria-hidden="true" />
								<button
									type="button"
									className="v-visite s-visite"
									data-s-visite=""
									data-mode="joue"
									aria-label="Mettre la visite en pause"
								>
									<span className="v-visite-ic" aria-hidden="true">
										<svg className="v-anneau" viewBox="0 0 24 24">
											<circle cx="12" cy="12" r="10.2" />
											<circle
												className="v-arc"
												data-s-arc=""
												cx="12"
												cy="12"
												r="10.2"
												pathLength="100"
											/>
										</svg>
										<svg className="g g-pause" viewBox="0 0 24 24">
											<path d="M10 8.6v6.8M14 8.6v6.8" />
										</svg>
										<svg className="g g-lecture" viewBox="0 0 24 24">
											<path d="M10 8.3v7.4l5.8-3.7z" />
										</svg>
										<svg className="g g-main" viewBox="0 0 24 24">
											<path d="M9.6 11.6V7.4a1.2 1.2 0 0 1 2.4 0v3.6m0-.6V9.6a1.2 1.2 0 0 1 2.4 0v1.6m0-.4a1.2 1.2 0 0 1 2.4 0v3.4a4.6 4.6 0 0 1-4.6 4.6h-.5a4.6 4.6 0 0 1-3.6-1.8l-1.7-2.2a1.25 1.25 0 0 1 1.9-1.6l1.3 1.5" />
										</svg>
										<svg className="g g-revoir" viewBox="0 0 24 24">
											<path d="M7.4 9.6A5.4 5.4 0 1 1 6.9 13.4" />
											<path d="M7 6.6v3.2h3.2" />
										</svg>
									</span>
									<span className="v-visite-t" data-s-visite-texte="">
										Visite guidée
									</span>
								</button>
							</div>
						</div>
					</article>
				</div>
				<p className="securite-suite">
					<b>Données cloisonnées</b> par entreprise
					<i>·</i>
					<b>Échanges chiffrés</b>
					<i>·</i>
					<b>Effacement complet</b>, votre clé en premier
				</p>
				{surSaPage ? null : (
					<Link className="lien-fleche lien-centre" to="/securite">
						Toutes nos mesures de sécurité{' '}
						<svg
							width="14"
							height="14"
							viewBox="0 0 16 16"
							fill="none"
							stroke="currentColor"
							strokeWidth="1.8"
							strokeLinecap="round"
						>
							<path d="M3 8h10M9 4l4 4-4 4" />
						</svg>
					</Link>
				)}
			</div>
		</section>
	);
}
