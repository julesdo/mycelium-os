import type { CSSProperties } from 'react';
import { Plume } from '../../ui';
import {
	DEPOT_DU_MATIN as DEPOT,
	PAIEMENT_DURAND,
	PLUME,
	PROMESSE,
	RESTE_DURAND,
	ROUSSEAU,
	VIDAL,
	initiales
} from './plume-demo';
import { euros } from './vitrine-demo';

/**
 * PLUME FAIT LE TRAVAIL (maquette V26). Quatre capacités, chacune avec sa scène vivante sur la
 * plaque : il ouvre les dossiers, il relance à votre nom, il écoute votre client, il répond et il
 * agit. Les capacités avancent seules comme un récit, une barre chacune ; au téléphone, la plaque
 * se balaie.
 *
 * ⚠️ CE QUE LES SCÈNES CHIFFRENT SE LIT SUR LE PRODUIT (`plume-demo.ts`) : le délai pour retenir,
 * la grâce après une promesse, le calendrier d'un paiement en trois fois. Les moteurs vivent dans
 * `ui/site/plume.ts` (les scènes) et `ui/site/balayage.ts` (le geste du téléphone).
 */
const variables = (v: Record<string, string>): CSSProperties => v as CSSProperties;
const S = PLUME.scenario;
const D = PLUME.durand;
const jourPromis = Number(PROMESSE.slice(8, 10));

export function SectionPlume() {
	return (
		<section className="section plume-section" id="plume">
			<div className="enveloppe">
				<div className="revele">
					<h2>
						Plume fait le travail. <span className="ton">Vous décidez.</span>
					</h2>
					<p className="chapeau">
						Plume est l’assistant de Letikette. Il vit dans l’application et nulle part ailleurs :
						vos clients ne reçoivent que des courriers à votre nom.
					</p>
				</div>
				<div className="plume-grille">
					<div className="capacites" role="tablist" aria-label="Ce que fait Plume">
						<button
							className="capacite active"
							role="tab"
							aria-selected="true"
							aria-controls="vue-0"
							style={variables({ '--k': '0' })}
						>
							<span className="progres" />
							<h3>Il ouvre vos dossiers</h3>
							<p>
								Chaque facture échue entre seule dans le dossier de son client, avec ce qu’on vous
								doit et la date limite pour agir. Vous démarrez le dossier d’un geste.
							</p>
						</button>
						<button
							className="capacite"
							role="tab"
							aria-selected="false"
							aria-controls="vue-1"
							style={variables({ '--k': '1' })}
						>
							<span className="progres" />
							<h3>Il relance à votre nom</h3>
							<p>
								{`Rappels puis lettre officielle, par e-mail, à votre nom. Chaque relance s’affiche ${PLUME.retenir} avant de partir et se retient d’un geste.`}
							</p>
						</button>
						<button
							className="capacite"
							role="tab"
							aria-selected="false"
							aria-controls="vue-2"
							style={variables({ '--k': '2' })}
						>
							<span className="progres" />
							<h3>Il écoute votre client</h3>
							<p>
								Une promesse de paiement fait taire les relances jusqu’au jour promis. Un paiement
								arrivé entre-temps arrête tout.
							</p>
						</button>
						<button
							className="capacite"
							role="tab"
							aria-selected="false"
							aria-controls="vue-3"
							style={variables({ '--k': '3' })}
						>
							<span className="progres" />
							<h3>Il répond, et il agit</h3>
							<p>
								Demandez-lui en français. Il prépare le geste, vous le confirmez : rien ne s’écrit
								avant.
							</p>
						</button>
					</div>
					<div className="plaque-ombre ombre">
						<div className="plaque etiquette grain" data-vivant="">
							<canvas data-paysage="vallee" aria-hidden="true" />
							<span className="pli" />
							<div className="plume-coin">
								<Plume humeur="travaille" className="clair" />
							</div>
							<div className="vue active" id="vue-0" role="tabpanel" data-scene="0">
								<div className="carte pilote p-pilote">
									<div className="pilote-tete">
										<span className="vignette v-papiers">
											<svg viewBox="0 0 24 24">
												<path d="M6 3h8l4 4v14H6z" />
												<path d="M14 3v4h4" />
											</svg>
										</span>
										<div>
											<b>Votre dépôt du matin</b>
											<span>{`${DEPOT.factures} factures, ${DEPOT.reglements} règlements`}</span>
										</div>
										<span className="p-direct">En direct</span>
									</div>
									<h4>Plume relit votre dépôt</h4>
									<ol className="p-etapes" data-etapes="">
										<li>
											<span className="v-coche">
												<svg viewBox="0 0 16 16">
													<path d="M4.6 8.3l2.3 2.3 4.5-4.9" />
												</svg>
											</span>
											<span>{`Lit ${DEPOT.factures} factures et ${DEPOT.reglements} règlements`}</span>
										</li>
										<li>
											<span className="v-coche">
												<svg viewBox="0 0 16 16">
													<path d="M4.6 8.3l2.3 2.3 4.5-4.9" />
												</svg>
											</span>
											<span>{`Range par client : ${DEPOT.clients} clients`}</span>
										</li>
										<li>
											<span className="v-coche">
												<svg viewBox="0 0 16 16">
													<path d="M4.6 8.3l2.3 2.3 4.5-4.9" />
												</svg>
											</span>
											<span>{`Repère ${DEPOT.retards} factures en retard`}</span>
										</li>
										<li>
											<span className="v-coche">
												<svg viewBox="0 0 16 16">
													<path d="M4.6 8.3l2.3 2.3 4.5-4.9" />
												</svg>
											</span>
											<span>{`Ouvre ${DEPOT.dossiers} dossiers, prêts à démarrer`}</span>
										</li>
									</ol>
									<div className="part p-part" data-part="">
										<h5>Prêts à démarrer</h5>
										<div className="part-ligne" data-ligne="durand" data-quand="jeu.">
											<div>
												<b>{D.client}</b>
												<span data-sous="">{`${euros(D.du)} · en retard depuis ${D.jours} j`}</span>
											</div>
											<button type="button" data-demarrer="">
												Démarrer
											</button>
											<span className="p-fait" aria-hidden="true">
												<span className="v-coche">
													<svg viewBox="0 0 16 16">
														<path d="M4.6 8.3l2.3 2.3 4.5-4.9" />
													</svg>
												</span>
											</span>
										</div>
										<div className="part-ligne" data-ligne="rousseau" data-quand="lun.">
											<div>
												<b>{ROUSSEAU.client}</b>
												<span data-sous="">{`${euros(ROUSSEAU.du)} · en retard depuis ${ROUSSEAU.jours} j`}</span>
											</div>
											<button type="button" data-demarrer="">
												Démarrer
											</button>
											<span className="p-fait" aria-hidden="true">
												<span className="v-coche">
													<svg viewBox="0 0 16 16">
														<path d="M4.6 8.3l2.3 2.3 4.5-4.9" />
													</svg>
												</span>
											</span>
										</div>
									</div>
								</div>
							</div>
							<div className="vue" id="vue-1" role="tabpanel" data-scene="1">
								<div className="carte courriel p-courriel">
									<div className="de">
										<span className="avatar">{initiales(PLUME.emetteur)}</span>
										<div>
											<b>{PLUME.emetteur}</b>
											{`à ${D.client}`}
										</div>
										<span className="p-ecrit" data-ecrit="">
											<i />
											<i />
											<i />
											Plume écrit
										</span>
									</div>
									<div className="objet">{`Rappel : facture ${D.reference}`}</div>
									<p data-corps="" />
									<div className="total">
										<span>Reste à régler</span>
										<b>{euros(D.du)}</b>
									</div>
								</div>
								<div className="carte envoi p-envoi" data-envoi="">
									<span className="vignette v-part">
										<svg viewBox="0 0 24 24">
											<path d="M4 12l16-8-6 16-2-6z" />
										</svg>
									</span>
									<div className="heure">
										<b data-envoi-titre="">{`Part à ${S.heureDEnvoi}`}</b>
										<span data-envoi-sous="">{`dans ${PLUME.compteARebours} · à votre nom`}</span>
									</div>
									<button type="button" data-retenir="">
										Retenir
									</button>
								</div>
							</div>
							<div className="vue" id="vue-2" role="tabpanel" data-scene="2">
								<div className="carte p-parole">
									<div className="p-recu">
										<span className="avatar">{initiales(VIDAL.client)}</span>
										<div>
											<b>{VIDAL.client}</b>
											<span>vous a répondu · à l’instant</span>
										</div>
									</div>
									<p className="p-message" data-message="">
										{S.reponses.promesse.message}
									</p>
									<div className="p-compris" data-compris="">
										<span className="vignette v-temps" data-compris-ic="">
											<svg viewBox="0 0 24 24">
												<circle cx="12" cy="12" r="8" />
												<path d="M12 8v4l3 2" />
											</svg>
										</span>
										<div>
											<b data-compris-titre="">{S.reponses.promesse.titre}</b>
											<span data-compris-sous="">{S.reponses.promesse.sous}</span>
										</div>
										<span className="p-lit" aria-hidden="true">
											<i />
											<i />
											<i />
										</span>
									</div>
									<ol className="p-frise" data-frise="">
										<li>
											<b />
											<span />
										</li>
										<li>
											<b />
											<span />
										</li>
										<li>
											<b />
											<span />
										</li>
									</ol>
									<div
										className="p-choix"
										role="group"
										aria-label="Ce que votre client aurait pu répondre"
									>
										<span>Et s’il avait répondu</span>
										<button
											type="button"
											data-reponse="promesse"
											aria-pressed="true"
										>{`« Le ${jourPromis} »`}</button>
										<button type="button" data-reponse="echeancier" aria-pressed="false">
											« En trois fois ? »
										</button>
										<button type="button" data-reponse="conteste" aria-pressed="false">
											« Je conteste »
										</button>
									</div>
								</div>
							</div>
							<div className="vue" id="vue-3" role="tabpanel" data-scene="3">
								<div className="carte conv p-conv">
									<div className="question" data-question="" />
									<div className="reponse" data-reponse-plume="">
										<Plume humeur="content" decoratif className="clair" />
										<span data-texte="" />
									</div>
									<div className="mini geste p-geste" data-geste="">
										<b>{`Noter un paiement de ${euros(PAIEMENT_DURAND)}`}</b>
										<p>{`${D.client} · facture ${D.reference}`}</p>
										<div className="actions" data-actions="">
											<button type="button" className="plein" data-confirmer="">
												Confirmer
											</button>
											<button type="button" className="vide" data-annuler="">
												Annuler
											</button>
										</div>
										<ol className="p-etapes" data-etapes-geste="">
											<li>
												<span className="v-coche">
													<svg viewBox="0 0 16 16">
														<path d="M4.6 8.3l2.3 2.3 4.5-4.9" />
													</svg>
												</span>
												<span>{`Paiement noté sur ${D.reference}`}</span>
											</li>
											<li>
												<span className="v-coche">
													<svg viewBox="0 0 16 16">
														<path d="M4.6 8.3l2.3 2.3 4.5-4.9" />
													</svg>
												</span>
												<span>{`Reste à régler : ${euros(RESTE_DURAND)}`}</span>
											</li>
											<li>
												<span className="v-coche">
													<svg viewBox="0 0 16 16">
														<path d="M4.6 8.3l2.3 2.3 4.5-4.9" />
													</svg>
												</span>
												<span>Rappel de jeudi mis à jour</span>
											</li>
										</ol>
									</div>
									<p className="p-fin" data-fin="" />
								</div>
							</div>
							<span className="v-doigt p-doigt" data-p-doigt="" aria-hidden="true" />
							<button
								type="button"
								className="v-visite p-visite"
								data-p-visite=""
								data-mode="joue"
								aria-label="Mettre la visite en pause"
							>
								<span className="v-visite-ic" aria-hidden="true">
									<svg className="v-anneau" viewBox="0 0 24 24">
										<circle cx="12" cy="12" r="10.2" />
										<circle
											className="v-arc"
											data-p-arc=""
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
								<span className="v-visite-t" data-p-visite-texte="">
									Visite guidée
								</span>
							</button>
						</div>
					</div>
				</div>
				<p className="note-bas">
					Rien ne part vers un tribunal. La remise à votre avocat ou à votre commissaire de justice,
					c’est vous qui la décidez.
				</p>
			</div>
		</section>
	);
}
