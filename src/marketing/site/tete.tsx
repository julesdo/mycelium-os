import type { CSSProperties, ReactNode } from 'react';
import { Plume } from '../../ui';
import { AVATARS_DE_LA_VITRINE } from '../../ui/site/avatars';
import { DUREE_ESSAI_JOURS } from '../../lib/config/tarifs';
import { ChampInscription } from './inscription';
import { JOUR_DE_LA_DEMO, VITRINE, dateCourte, euros, eurosRonds } from './vitrine-demo';

/**
 * L'EN-TÊTE (maquette V26) : l'aube peinte, le titre, le champ d'inscription, et le téléphone
 * qu'on essaie, avec Plume qui salue à côté.
 *
 * Le téléphone est l'application, dessinée : une capture ne se touche pas. Son moteur vit dans
 * `ui/site/vitrine.ts` (la visite guidée, le doigt fantôme, les trois tâches de Plume, les
 * onglets, les dossiers qui se balaient, la conversation). Ses chiffres viennent de
 * `vitrine-demo.ts`, que le moteur du produit tient au centime.
 */
const DATE = dateCourte(JOUR_DE_LA_DEMO);

/** Les variables CSS de la maquette (`--d`, le rang d’apparition ; `--f`, la part d’une barre). */
const variables = (v: Record<string, string>): CSSProperties => v as CSSProperties;

/** « 66 704,82 € » en grand : les centimes en petit, l'espace ordinaire de la maquette. */
function MontantGrand({ centimes }: { readonly centimes: number }): ReactNode {
	const e = String(Math.floor(centimes / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
	return (
		<>
			{e}
			<small>
				,{String(centimes % 100).padStart(2, '0')}
				{'\u00a0'}€
			</small>
		</>
	);
}

export function EnTete() {
	return (
		<section className="tete" data-tete="">
			<div className="tete-fond grain" aria-hidden="true">
				<canvas data-paysage="aube" />
				<div className="brume-flottante" />
			</div>
			<div className="enveloppe tete-grille">
				<div className="tete-texte" data-tete-texte="">
					<h1>
						<span>Vos factures impayées,</span> <span>relancées pour vous.</span>
					</h1>
					<p className="chapeau">
						Letikette lit vos factures, calcule ce que chaque client vous doit, pénalités comprises,
						et le relance à votre nom. Du premier rappel au virement, vous gardez la main.
					</p>
					<ChampInscription id="courriel-tete" ton="nuit" />
					<ul className="leves">
						<li>
							<svg
								viewBox="0 0 16 16"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<path d="M3 8.5l3 3 7-7" />
							</svg>
							Diagnostic gratuit
						</li>
						<li>
							<svg
								viewBox="0 0 16 16"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<path d="M3 8.5l3 3 7-7" />
							</svg>
							{`${DUREE_ESSAI_JOURS} jours d’essai, 0 € aujourd’hui`}
						</li>
						<li>
							<svg
								viewBox="0 0 16 16"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<path d="M3 8.5l3 3 7-7" />
							</svg>
							Sans engagement
						</li>
					</ul>
				</div>
				<div className="vitrine" data-vitrine="">
					<div className="v-pose">
						<div
							className="v-telephone"
							data-v-tel=""
							role="group"
							aria-label="L’écran Aujourd’hui de Letikette, sur des données de démonstration"
						>
							<div className="v-ecran" data-ecran="" data-vue="aujourdhui">
								<div className="v-ile" data-ile="" aria-live="polite">
									<span className="v-ile-ic" aria-hidden="true">
										<svg viewBox="0 0 16 16">
											<path d="M3.5 8.5l3 3 6-7" />
										</svg>
									</span>
									<span className="v-ile-t">
										<b>Virement reçu</b>
										<span>Transports Vidal</span>
									</span>
									<b className="v-ile-m">{`+ ${euros(VITRINE.clients.vidal)}`}</b>
								</div>
								<div className="v-vues">
									<section className="v-vue active" data-vue="aujourdhui" aria-label="Aujourd’hui">
										<div className="v-haut" aria-hidden="true">
											<span className="v-chip">
												<svg viewBox="0 0 24 24">
													<rect x="5" y="3.5" width="14" height="17" rx="2" />
													<path d="M9 8h2M13 8h2M9 12h2M13 12h2M10.5 20.5v-3h3v3" />
												</svg>
												<svg viewBox="0 0 10 10">
													<path d="M2.5 4l2.5 2.5L7.5 4" />
												</svg>
											</span>
											<span className="v-cloche">
												<svg viewBox="0 0 24 24">
													<path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z" />
													<path d="M10 20.5a2 2 0 0 0 4 0" />
												</svg>
												<i>2</i>
											</span>
										</div>
										<div className="v-total">
											<span className="v-date">{`Ce qu’on vous doit au ${DATE}`}</span>
											<b className="v-montant" data-v-montant="">
												<MontantGrand centimes={VITRINE.du} />
											</b>
											<span className="v-sous" data-v-sous="">
												{`${VITRINE.factures} factures en retard`}
											</span>
										</div>
										<div className="v-carte" style={variables({ '--d': '0' })}>
											<div className="v-barre" aria-hidden="true">
												<i data-b1="" style={variables({ '--f': '0.6' })} />
												<i style={variables({ '--f': '2.4' })} />
												<i data-b3="" style={variables({ '--f': '24' })} />
											</div>
											<div className="v-age-l">
												<span>
													<b data-v-age1="">{euros(VITRINE.moinsDe30)}</b>
													moins de 30 j
												</span>
												<span>
													<b>{euros(VITRINE.de30a90)}</b>
													30 à 90 j
												</span>
												<span>
													<b data-v-age3="">{euros(VITRINE.plusDe90)}</b>
													plus de 90 j
												</span>
											</div>
										</div>
										<button
											type="button"
											className="v-carte v-jamais"
											style={variables({ '--d': '1' })}
											data-pousser="jamais"
										>
											<span className="v-ic" aria-hidden="true">
												<svg viewBox="0 0 16 16">
													<path d="M3 5h10M3 8h7M3 11h9" />
												</svg>
											</span>
											<span className="v-t">
												<b>Jamais réclamé</b>
												<span>Pénalités et frais dus</span>
											</span>
											<b className="v-val">{euros(VITRINE.jamaisReclame)}</b>
											<svg className="v-chevron" viewBox="0 0 12 12" aria-hidden="true">
												<path d="M4.5 2.5L8 6l-3.5 3.5" />
											</svg>
										</button>
										<div
											className="v-carte v-pilote"
											style={variables({ '--d': '2' })}
											data-pilote=""
										>
											<div className="v-pilote-tete">
												<Plume decoratif className="clair" />
												<span className="v-pilote-qui">
													<b>Plume</b>
													<span data-pilote-sous="">Au repos</span>
												</span>
												<span className="v-direct">En direct</span>
											</div>
											<div className="v-pilote-corps">
												<ol className="v-travail" data-travail="" aria-live="polite" />
												<div className="v-repos" data-repos="">
													<div className="v-relance" data-relance="">
														<span>
															<b data-rel-titre="">Rappel · Charpentes Roux</b>
															<small data-rel-quand="">jeu. 10:00</small>
														</span>
														<button type="button" data-retenir="">
															Retenir
														</button>
													</div>
													<ul className="v-faits" data-v-faits="">
														<li>
															<span>Point du matin préparé</span>
															<time>08:00</time>
														</li>
														<li>
															<span>Rappel de Charpentes Roux programmé</span>
															<time>08:01</time>
														</li>
													</ul>
												</div>
											</div>
										</div>
									</section>
									<section className="v-vue" data-vue="clients" aria-label="Clients">
										<div className="v-outils" aria-hidden="true">
											<span className="v-recherche">
												<svg viewBox="0 0 24 24">
													<circle cx="11" cy="11" r="6.5" />
													<path d="M20 20l-4-4" />
												</svg>
												Rechercher un client
											</span>
											<span className="v-rond">
												<svg viewBox="0 0 24 24">
													<path d="M4 7h16M7 12h10M10 17h4" />
												</svg>
											</span>
										</div>
										<div className="v-groupe">
											<span>
												En retard · <b data-v-compte="">4</b>
											</span>
											<b data-total-clients="">{euros(VITRINE.du)}</b>
										</div>
										<div className="v-liste">
											<button type="button" className="v-ligne" data-client="roux">
												<span className="v-av" style={AVATARS_DE_LA_VITRINE.roux}>
													CR
												</span>
												<span className="v-t">
													<b>Charpentes Roux</b>
													<span data-statut="">Premier rappel jeudi</span>
												</span>
												<span className="v-m">{euros(VITRINE.clients.roux)}</span>
											</button>
											<button type="button" className="v-ligne" data-client="durand">
												<span className="v-av" style={AVATARS_DE_LA_VITRINE.durand}>
													FD
												</span>
												<span className="v-t">
													<b>Fournitures Durand</b>
													<span data-statut="">Premier rappel envoyé</span>
												</span>
												<span className="v-m">{euros(VITRINE.clients.durand)}</span>
											</button>
											<button type="button" className="v-ligne" data-client="vidal">
												<span className="v-av" style={AVATARS_DE_LA_VITRINE.vidal}>
													TV
												</span>
												<span className="v-t">
													<b>Transports Vidal</b>
													<span data-statut="">{`Promesse pour le ${VITRINE.promesseVidal}`}</span>
												</span>
												<span className="v-m">{euros(VITRINE.clients.vidal)}</span>
											</button>
											<button type="button" className="v-ligne cache" data-client="bati">
												<span className="v-av" style={AVATARS_DE_LA_VITRINE.bati}>
													BS
												</span>
												<span className="v-t">
													<b>Bâti-Sud</b>
													<span data-statut="">Dossier à démarrer</span>
												</span>
												<span className="v-m">{euros(VITRINE.clients.bati)}</span>
											</button>
											<button type="button" className="v-ligne" data-client="rousseau">
												<span className="v-av" style={AVATARS_DE_LA_VITRINE.rousseau}>
													AR
												</span>
												<span className="v-t">
													<b>Atelier Rousseau</b>
													<span data-statut="">Prêt à démarrer</span>
												</span>
												<span className="v-m">{euros(VITRINE.clients.rousseau)}</span>
											</button>
										</div>
									</section>
									<section className="v-vue" data-vue="dossiers" aria-label="Dossiers">
										<div className="v-outils" aria-hidden="true">
											<span className="v-recherche">
												<svg viewBox="0 0 24 24">
													<circle cx="11" cy="11" r="6.5" />
													<path d="M20 20l-4-4" />
												</svg>
												Rechercher un dossier
											</span>
											<span className="v-rond">
												<svg viewBox="0 0 24 24">
													<path d="M4 7h16M7 12h10M10 17h4" />
												</svg>
											</span>
										</div>
										<div className="v-dossiers">
											<div className="v-dos" data-dos="roux">
												<button type="button" className="v-dos-action" data-action="" tabIndex={-1}>
													<svg viewBox="0 0 24 24" aria-hidden="true">
														<path d="M4.5 12.5l15-7.5-5.5 15-2.6-6.2z" />
														<path d="M11.4 13.8L19.5 5" />
													</svg>
													<span data-action-nom="">Relancer</span>
												</button>
												<div className="v-dos-carte" data-carte="">
													<div className="v-dos-l1">
														<b>Charpentes Roux</b>
														<span className="v-m">{euros(VITRINE.clients.roux)}</span>
													</div>
													<div className="v-etapes" aria-hidden="true">
														<i className="p" />
														<i className="" />
														<i className="" />
														<i className="" />
													</div>
													<div className="v-dos-l2">
														<span className="v-dos-etat" data-etat="">
															Premier rappel · jeu. 10:00
														</span>
													</div>
												</div>
											</div>
											<div className="v-dos" data-dos="durand">
												<button type="button" className="v-dos-action" data-action="" tabIndex={-1}>
													<svg viewBox="0 0 24 24" aria-hidden="true">
														<path d="M4.5 12.5l15-7.5-5.5 15-2.6-6.2z" />
														<path d="M11.4 13.8L19.5 5" />
													</svg>
													<span data-action-nom="">Relancer</span>
												</button>
												<div className="v-dos-carte" data-carte="">
													<div className="v-dos-l1">
														<b>Fournitures Durand</b>
														<span className="v-m">{euros(VITRINE.durandReclame)}</span>
													</div>
													<div className="v-etapes" aria-hidden="true">
														<i className="f" />
														<i className="" />
														<i className="" />
														<i className="" />
													</div>
													<div className="v-dos-l2">
														<span className="v-dos-etat" data-etat="">
															{`Premier rappel envoyé le ${VITRINE.premierRappelDurand}`}
														</span>
													</div>
												</div>
											</div>
											<div className="v-dos" data-dos="vidal">
												<button type="button" className="v-dos-action" data-action="" tabIndex={-1}>
													<svg viewBox="0 0 24 24" aria-hidden="true">
														<path d="M4.5 12.5l15-7.5-5.5 15-2.6-6.2z" />
														<path d="M11.4 13.8L19.5 5" />
													</svg>
													<span data-action-nom="">Relancer</span>
												</button>
												<div className="v-dos-carte" data-carte="">
													<div className="v-dos-l1">
														<b>Transports Vidal</b>
														<span className="v-m">{euros(VITRINE.clients.vidal)}</span>
													</div>
													<div className="v-etapes" aria-hidden="true">
														<i className="f" />
														<i className="" />
														<i className="" />
														<i className="" />
													</div>
													<div className="v-dos-l2">
														<span className="v-dos-etat" data-etat="">
															{`Promesse pour le ${VITRINE.promesseVidal}`}
														</span>
													</div>
												</div>
											</div>
											<div className="v-dos cache a-demarrer" data-dos="bati">
												<button type="button" className="v-dos-action" data-action="" tabIndex={-1}>
													<svg viewBox="0 0 24 24" aria-hidden="true">
														<path d="M4.5 12.5l15-7.5-5.5 15-2.6-6.2z" />
														<path d="M11.4 13.8L19.5 5" />
													</svg>
													<span data-action-nom="">Relancer</span>
												</button>
												<div className="v-dos-carte" data-carte="">
													<div className="v-dos-l1">
														<b>Bâti-Sud</b>
														<span className="v-m">{euros(VITRINE.clients.bati)}</span>
													</div>
													<div className="v-etapes" aria-hidden="true">
														<i className="" />
														<i className="" />
														<i className="" />
														<i className="" />
													</div>
													<div className="v-dos-l2">
														<span className="v-dos-etat" data-etat="">
															Prêt à démarrer
														</span>
														<button type="button" className="v-demarrer" data-demarrer="">
															Démarrer
														</button>
													</div>
												</div>
											</div>
											<div className="v-dos a-demarrer" data-dos="rousseau">
												<button type="button" className="v-dos-action" data-action="" tabIndex={-1}>
													<svg viewBox="0 0 24 24" aria-hidden="true">
														<path d="M4.5 12.5l15-7.5-5.5 15-2.6-6.2z" />
														<path d="M11.4 13.8L19.5 5" />
													</svg>
													<span data-action-nom="">Relancer</span>
												</button>
												<div className="v-dos-carte" data-carte="">
													<div className="v-dos-l1">
														<b>Atelier Rousseau</b>
														<span className="v-m">{euros(VITRINE.clients.rousseau)}</span>
													</div>
													<div className="v-etapes" aria-hidden="true">
														<i className="" />
														<i className="" />
														<i className="" />
														<i className="" />
													</div>
													<div className="v-dos-l2">
														<span className="v-dos-etat" data-etat="">
															Prêt à démarrer
														</span>
														<button type="button" className="v-demarrer" data-demarrer="">
															Démarrer
														</button>
													</div>
												</div>
											</div>
										</div>
									</section>
									<section className="v-vue" data-vue="compte" aria-label="Compte">
										<div className="v-ident">
											<span className="v-av v-av-grand" style={AVATARS_DE_LA_VITRINE.laurent}>
												ML
											</span>
											<b>Menuiserie Laurent</b>
											<span>Lyon 7e · formule Équipe</span>
										</div>
										<div className="v-carte v-reglages">
											<label className="v-reglage">
												<span>
													Relances automatiques
													<small>
														{`En semaine, de ${VITRINE.heures.de} h à ${VITRINE.heures.a} h`}
													</small>
												</span>
												<input
													type="checkbox"
													className="v-interrupteur"
													data-auto=""
													defaultChecked
												/>
											</label>
											<div className="v-reglage">
												<span>Logiciel branché</span>
												<em>Pennylane</em>
											</div>
											<div className="v-reglage">
												<span>Coffre-fort</span>
												<em>5 documents</em>
											</div>
										</div>
									</section>
									<section
										className="v-vue v-poussee"
										data-vue="jamais"
										aria-label="Jamais réclamé"
									>
										<div className="v-outils v-outils-retour">
											<button type="button" className="v-rond" data-retour="" aria-label="Retour">
												<svg viewBox="0 0 12 12">
													<path d="M7.5 2.5L4 6l3.5 3.5" />
												</svg>
											</button>
											<b>Jamais réclamé</b>
											<span className="v-rond v-vide" />
										</div>
										<div className="v-total">
											<span className="v-date">{`Dus de plein droit au ${DATE}`}</span>
											<b className="v-montant">
												<MontantGrand centimes={VITRINE.jamaisReclame} />
											</b>
											<span className="v-sous">que personne n’a encore réclamés</span>
										</div>
										<div className="v-carte v-releve">
											<div>
												<span>
													Pénalités de retard
													<small>comptées période par période</small>
												</span>
												<b>{euros(VITRINE.penalites)}</b>
											</div>
											<div>
												<span>
													Frais de recouvrement
													<small>
														{`${VITRINE.factures} factures × ${eurosRonds(VITRINE.indemnite)}`}
													</small>
												</span>
												<b>{euros(VITRINE.frais)}</b>
											</div>
										</div>
									</section>
								</div>
								<div className="v-fente" data-fente="" data-montre="capsule">
									<div className="v-capsule" data-v-capsule="" data-etat="repos">
										<button
											type="button"
											className="v-cap-zone"
											data-ouvrir-plume=""
											aria-label="Ouvrir Plume"
										>
											<span className="v-cap-ic" aria-hidden="true">
												<i className="v-cap-tourne" />
												<svg className="v-cap-horloge" viewBox="0 0 16 16">
													<circle cx="8" cy="8" r="5.6" />
													<path d="M8 5.2V8l1.9 1.3" />
												</svg>
												<svg className="v-cap-pause" viewBox="0 0 16 16">
													<path d="M6 5v6M10 5v6" />
												</svg>
											</span>
											<span className="v-cap-t">
												<b data-cap-titre="">Rappel · Charpentes Roux</b>
												<span data-cap-sous="">jeu. 10:00</span>
											</span>
										</button>
										<button type="button" className="v-cap-action" data-retenir="">
											Retenir
										</button>
									</div>
									<div className="v-bulle" data-bulle="" aria-live="polite">
										<span data-bulle-texte="" />
										<button
											type="button"
											className="v-bulle-fermer"
											data-bulle-fermer=""
											aria-label="Faire taire Plume"
										>
											<svg viewBox="0 0 12 12">
												<path d="M3.5 3.5l5 5M8.5 3.5l-5 5" />
											</svg>
										</button>
									</div>
								</div>
								<nav className="v-nav" aria-label="Onglets de l’application">
									<span className="v-pilule" data-pilule="">
										<span className="v-lentille" data-lentille="" aria-hidden="true" />
										<button
											type="button"
											className="v-onglet actif"
											data-onglet="aujourdhui"
											aria-current="page"
										>
											<svg viewBox="0 0 100 100">
												<use href="#logo" />
											</svg>
											Aujourd’hui
										</button>
										<button type="button" className="v-onglet" data-onglet="clients">
											<svg viewBox="0 0 24 24">
												<circle cx="9" cy="8" r="3.5" />
												<path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5c2 .6 3.2 2.4 3.5 5.5" />
											</svg>
											Clients
										</button>
										<button type="button" className="v-onglet" data-onglet="dossiers">
											<svg viewBox="0 0 24 24">
												<path d="M14 4l6 6-9 9H5v-6z" />
												<path d="M12 6l6 6" />
											</svg>
											Dossiers
											<i className="v-pastille" data-pastille="" hidden />
										</button>
										<button type="button" className="v-onglet" data-onglet="compte">
											<svg viewBox="0 0 24 24">
												<circle cx="12" cy="12" r="9" />
												<circle cx="12" cy="10" r="3" />
												<path d="M6.5 18.5c1.2-2.3 3.2-3.5 5.5-3.5s4.3 1.2 5.5 3.5" />
											</svg>
											Compte
										</button>
									</span>
									<button
										type="button"
										className="v-fab"
										data-ouvrir-plume=""
										aria-label="Parler à Plume"
									>
										<Plume decoratif className="clair" />
									</button>
								</nav>
								<div
									className="v-feuille"
									data-v-feuille=""
									role="dialog"
									aria-label="Conversation avec Plume"
									inert
								>
									<div className="v-feuille-tete">
										<span className="v-feuille-qui">
											<Plume decoratif className="clair" />
											<span>
												<b>Plume</b>
												<span className="v-direct">En direct</span>
											</span>
										</span>
										<button
											type="button"
											className="v-rond"
											data-fermer-plume=""
											aria-label="Fermer la conversation"
										>
											<svg viewBox="0 0 12 12">
												<path d="M3.5 3.5l5 5M8.5 3.5l-5 5" />
											</svg>
										</button>
									</div>
									<div className="v-conv" data-conv="">
										<div className="v-msg">
											Bonjour ! Je surveille vos factures pendant que vous travaillez. Que
											voulez-vous savoir ?
										</div>
									</div>
									<div className="v-suggestions" data-suggestions="">
										<button type="button" data-q="Qui me doit le plus ?">
											Qui me doit le plus ?
										</button>
										<button type="button" data-q="Relance Durand">
											Relance Durand
										</button>
										<button type="button" data-q="Combien de pénalités ?">
											Combien de pénalités ?
										</button>
									</div>
									<form className="v-composer" data-composer="">
										<span className="v-champ">
											<input
												type="text"
												data-champ=""
												placeholder="Écrivez à Plume…"
												aria-label="Votre question à Plume"
												autoComplete="off"
												enterKeyHint="send"
											/>
										</span>
										<button type="submit" className="v-envoyer" aria-label="Envoyer">
											<svg viewBox="0 0 16 16">
												<path d="M8 12.5v-9M4.2 7.2L8 3.4l3.8 3.8" />
											</svg>
										</button>
									</form>
								</div>
								<span className="v-doigt" data-doigt="" aria-hidden="true" />
								<div className="v-voile" data-voile="" aria-hidden="true" />
							</div>
						</div>
						<button
							type="button"
							className="v-visite"
							data-visite=""
							data-mode="joue"
							aria-label="Mettre la visite en pause"
						>
							<span className="v-visite-ic" aria-hidden="true">
								<svg className="v-anneau" viewBox="0 0 24 24">
									<circle cx="12" cy="12" r="10.2" />
									<circle className="v-arc" data-arc="" cx="12" cy="12" r="10.2" pathLength="100" />
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
							<span className="v-visite-t" data-visite-texte="">
								Visite guidée
							</span>
						</button>
					</div>
					<div className="plume-vedette">
						<Plume humeur="salue" sol />
					</div>
				</div>
			</div>
			<div className="tete-brume" aria-hidden="true" />
		</section>
	);
}
