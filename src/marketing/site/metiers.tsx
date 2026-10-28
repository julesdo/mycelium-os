import { Link } from '@tanstack/react-router';
import { METIERS as M } from './metiers-demo';

/**
 * CHAQUE MÉTIER A SES RÈGLES (maquette V26). Quatre panneaux en photo : le transport, le
 * bâtiment, les services, le secteur public. Chacun pend sa règle à une étiquette, pose la carte
 * d'exemple de sa scène et mène à sa page.
 *
 * ⚠️ LA RÈGLE DE CHAQUE MÉTIER SE LIT AU REGISTRE, sa carte d'exemple à sa scène
 * (`metiers-demo.ts`). Les panneaux s'ouvrent au survol et tournent seuls au bureau ; au
 * téléphone, un toucher ouvre une rangée (`ui/site/metiers.ts`).
 */
export function SectionMetiers() {
	return (
		<section className="section metiers" id="metiers">
			<div className="enveloppe">
				<div className="revele">
					<h2>
						Chaque métier a ses règles. <span className="ton">Letikette connaît la vôtre.</span>
					</h2>
					<p className="chapeau">
						{`Un transporteur n’a pas le même délai pour agir qu’un artisan, et un hôpital ne paie pas comme une PME. Choisissez votre métier\u202f: Letikette applique ses règles à vos factures.`}
					</p>
				</div>
				<div
					className="metiers-panneaux revele"
					data-metiers=""
					role="tablist"
					aria-label="Les métiers"
				>
					<article className="metier active" data-metier="0" data-carte="droite">
						<img
							className="metier-photo"
							src={M['transport-routier'].photo}
							alt={M['transport-routier'].description}
							style={{ objectPosition: '28% 42%' }}
							loading="lazy"
							decoding="async"
						/>
						<span className="metier-voile" aria-hidden="true" />{' '}
						<span className="metier-progres" aria-hidden="true" />
						<button
							type="button"
							className="metier-onglet"
							role="tab"
							id="onglet-transport"
							aria-selected="true"
							aria-controls="metier-transport"
							data-metier-onglet=""
						>
							<span className="metier-court-nom">Transport</span>
							<span className="sr">{` : ${M['transport-routier'].nom}`}</span>{' '}
							<span className="metier-court-chiffre">{M['transport-routier'].regle.chiffre}</span>
						</button>
						<div
							className="metier-contenu"
							id="metier-transport"
							role="tabpanel"
							aria-labelledby="onglet-transport"
						>
							<div className="m-pendu" aria-hidden="true">
								<span className="m-fil" />
								<div className="m-etiquette">
									<span className="etq-papier">
										<span className="etq-oeillet" />
										<span className="etq-pli" />
										<span className="etq-label">La règle du métier</span>
										<b className="m-grand">{M['transport-routier'].regle.chiffre}</b>
										<span className="m-sous">{M['transport-routier'].regle.sous}</span>
									</span>
								</div>
							</div>
							<div className="m-carte" aria-hidden="true">
								<span className={`m-av ${M['transport-routier'].carte.famille}`}>
									{M['transport-routier'].carte.initiales}
								</span>
								<span className="m-carte-texte">
									<span className="m-l1">
										<b>{M['transport-routier'].carte.client}</b>
										<b className="m-montant">{M['transport-routier'].carte.montant}</b>
									</span>
									<span className="m-l2">
										<span>{M['transport-routier'].carte.libelle}</span>
										<span>{M['transport-routier'].carte.quand}</span>
									</span>
								</span>
								<i className="m-exemple">Exemple</i>
							</div>
							<div className="metier-texte">
								<span className="metier-public">{M['transport-routier'].public}</span>
								<h3>{M['transport-routier'].nom}</h3>
								<p>
									Letikette lit vos factures, surveille cette date pour chacune et calcule ce que la
									loi ajoute quand un client paie en retard.
								</p>
								<Link
									className="metier-lien"
									to="/secteurs/$secteur"
									params={{ secteur: 'transport-routier' }}
								>
									Voir la page du transport{' '}
									<svg viewBox="0 0 10 10" aria-hidden="true">
										<path d="M0 5h7" />
										<path d="M4.4 1.6L7.8 5 4.4 8.4" />
									</svg>
								</Link>
							</div>
						</div>
					</article>
					<article className="metier" data-metier="1" data-carte="gauche">
						<img
							className="metier-photo"
							src={M['batiment'].photo}
							alt={M['batiment'].description}
							style={{ objectPosition: '78% 38%' }}
							loading="lazy"
							decoding="async"
						/>
						<span className="metier-voile" aria-hidden="true" />{' '}
						<span className="metier-progres" aria-hidden="true" />
						<button
							type="button"
							className="metier-onglet"
							role="tab"
							id="onglet-batiment"
							aria-selected="false"
							aria-controls="metier-batiment"
							data-metier-onglet=""
						>
							<span className="metier-court-nom">Bâtiment</span>
							<span className="sr">{` : ${M['batiment'].nom}`}</span>{' '}
							<span className="metier-court-chiffre">{M['batiment'].regle.chiffre}</span>
						</button>
						<div
							className="metier-contenu"
							id="metier-batiment"
							role="tabpanel"
							aria-labelledby="onglet-batiment"
						>
							<div className="m-pendu" aria-hidden="true">
								<span className="m-fil" />
								<div className="m-etiquette">
									<span className="etq-papier">
										<span className="etq-oeillet" />
										<span className="etq-pli" />
										<span className="etq-label">La règle du métier</span>
										<b className="m-grand">{M['batiment'].regle.chiffre}</b>
										<span className="m-sous">{M['batiment'].regle.sous}</span>
									</span>
								</div>
							</div>
							<div className="m-carte" aria-hidden="true">
								<span className={`m-av ${M['batiment'].carte.famille}`}>
									{M['batiment'].carte.initiales}
								</span>
								<span className="m-carte-texte">
									<span className="m-l1">
										<b>{M['batiment'].carte.client}</b>
										<b className="m-montant">{M['batiment'].carte.montant}</b>
									</span>
									<span className="m-l2">
										<span>{M['batiment'].carte.libelle}</span>
										<span>{M['batiment'].carte.quand}</span>
									</span>
								</span>
								<i className="m-exemple">Exemple</i>
							</div>
							<div className="metier-texte">
								<span className="metier-public">{M['batiment'].public}</span>
								<h3>{M['batiment'].nom}</h3>
								<p>
									Chaque facture et chaque situation est suivie jusqu’au paiement. Les relances
									partent à votre nom, du premier rappel à la lettre officielle, quand vous l’avez
									décidé.
								</p>
								<Link
									className="metier-lien"
									to="/secteurs/$secteur"
									params={{ secteur: 'batiment' }}
								>
									Voir la page du bâtiment{' '}
									<svg viewBox="0 0 10 10" aria-hidden="true">
										<path d="M0 5h7" />
										<path d="M4.4 1.6L7.8 5 4.4 8.4" />
									</svg>
								</Link>
							</div>
						</div>
					</article>
					<article className="metier" data-metier="2" data-carte="gauche">
						<img
							className="metier-photo"
							src={M['services-aux-entreprises'].photo}
							alt={M['services-aux-entreprises'].description}
							style={{ objectPosition: '62% 40%' }}
							loading="lazy"
							decoding="async"
						/>
						<span className="metier-voile" aria-hidden="true" />{' '}
						<span className="metier-progres" aria-hidden="true" />
						<button
							type="button"
							className="metier-onglet"
							role="tab"
							id="onglet-services"
							aria-selected="false"
							aria-controls="metier-services"
							data-metier-onglet=""
						>
							<span className="metier-court-nom">Services</span>
							<span className="sr">{` : ${M['services-aux-entreprises'].nom}`}</span>{' '}
							<span className="metier-court-chiffre">
								{M['services-aux-entreprises'].regle.chiffre}
							</span>
						</button>
						<div
							className="metier-contenu"
							id="metier-services"
							role="tabpanel"
							aria-labelledby="onglet-services"
						>
							<div className="m-pendu" aria-hidden="true">
								<span className="m-fil" />
								<div className="m-etiquette">
									<span className="etq-papier">
										<span className="etq-oeillet" />
										<span className="etq-pli" />
										<span className="etq-label">La règle du métier</span>
										<b className="m-grand">{M['services-aux-entreprises'].regle.chiffre}</b>
										<span className="m-sous">{M['services-aux-entreprises'].regle.sous}</span>
									</span>
								</div>
							</div>
							<div className="m-carte" aria-hidden="true">
								<span className={`m-av ${M['services-aux-entreprises'].carte.famille}`}>
									{M['services-aux-entreprises'].carte.initiales}
								</span>
								<span className="m-carte-texte">
									<span className="m-l1">
										<b>{M['services-aux-entreprises'].carte.client}</b>
										<b className="m-montant">{M['services-aux-entreprises'].carte.montant}</b>
									</span>
									<span className="m-l2">
										<span>{M['services-aux-entreprises'].carte.libelle}</span>
										<span>{M['services-aux-entreprises'].carte.quand}</span>
									</span>
								</span>
								<i className="m-exemple">Exemple</i>
							</div>
							<div className="metier-texte">
								<span className="metier-public">{M['services-aux-entreprises'].public}</span>
								<h3>{M['services-aux-entreprises'].nom}</h3>
								<p>
									Letikette lit vos factures, chiffre ce que chaque client vous doit et le relance à
									votre nom, sans commission sur ce qui rentre.
								</p>
								<Link
									className="metier-lien"
									to="/secteurs/$secteur"
									params={{ secteur: 'services-aux-entreprises' }}
								>
									Voir la page des services{' '}
									<svg viewBox="0 0 10 10" aria-hidden="true">
										<path d="M0 5h7" />
										<path d="M4.4 1.6L7.8 5 4.4 8.4" />
									</svg>
								</Link>
							</div>
						</div>
					</article>
					<article className="metier" data-metier="3" data-carte="gauche">
						<img
							className="metier-photo"
							src={M['fournisseurs-publics'].photo}
							alt={M['fournisseurs-publics'].description}
							style={{ objectPosition: '82% 30%' }}
							loading="lazy"
							decoding="async"
						/>
						<span className="metier-voile" aria-hidden="true" />{' '}
						<span className="metier-progres" aria-hidden="true" />
						<button
							type="button"
							className="metier-onglet"
							role="tab"
							id="onglet-publics"
							aria-selected="false"
							aria-controls="metier-publics"
							data-metier-onglet=""
						>
							<span className="metier-court-nom">Secteur public</span>
							<span className="sr">{` : ${M['fournisseurs-publics'].nom}`}</span>{' '}
							<span className="metier-court-chiffre">
								{M['fournisseurs-publics'].regle.chiffre}
							</span>
						</button>
						<div
							className="metier-contenu"
							id="metier-publics"
							role="tabpanel"
							aria-labelledby="onglet-publics"
						>
							<div className="m-pendu" aria-hidden="true">
								<span className="m-fil" />
								<div className="m-etiquette">
									<span className="etq-papier">
										<span className="etq-oeillet" />
										<span className="etq-pli" />
										<span className="etq-label">La règle du métier</span>
										<b className="m-grand">{M['fournisseurs-publics'].regle.chiffre}</b>
										<span className="m-sous">{M['fournisseurs-publics'].regle.sous}</span>
									</span>
								</div>
							</div>
							<div className="m-carte" aria-hidden="true">
								<span className={`m-av ${M['fournisseurs-publics'].carte.famille}`}>
									{M['fournisseurs-publics'].carte.initiales}
								</span>
								<span className="m-carte-texte">
									<span className="m-l1">
										<b>{M['fournisseurs-publics'].carte.client}</b>
										<b className="m-montant">{M['fournisseurs-publics'].carte.montant}</b>
									</span>
									<span className="m-l2">
										<span>{M['fournisseurs-publics'].carte.libelle}</span>
										<span>{M['fournisseurs-publics'].carte.quand}</span>
									</span>
								</span>
								<i className="m-exemple">Exemple</i>
							</div>
							<div className="metier-texte">
								<span className="metier-public">{M['fournisseurs-publics'].public}</span>
								<h3>{M['fournisseurs-publics'].nom}</h3>
								<p>
									{`Les pénalités et les frais sont calculés au barème de la commande publique, facture par facture. La demande de paiement est préparée à votre nom\u202f: vous la relisez, vous l’envoyez.`}
								</p>
								<Link
									className="metier-lien"
									to="/secteurs/$secteur"
									params={{ secteur: 'fournisseurs-publics' }}
								>
									Voir la page des fournisseurs publics{' '}
									<svg viewBox="0 0 10 10" aria-hidden="true">
										<path d="M0 5h7" />
										<path d="M4.4 1.6L7.8 5 4.4 8.4" />
									</svg>
								</Link>
							</div>
						</div>
					</article>
				</div>
				<p className="metiers-suite">
					{`Un autre métier\u202f? Les règles générales s’appliquent à toutes les factures entre professionnels, et Letikette les calcule pour vous.`}
				</p>
			</div>
		</section>
	);
}
