import { getLegalEmailAddress } from '../../lib/config/legal';
import {
	DUREE_ESSAI_JOURS,
	JOURS_DE_REMBOURSEMENT,
	historiqueDeDecouverte
} from '../../lib/config/tarifs';
import { Plume } from '../../ui';
import {
	COMPARATIF,
	MOIS_OFFERTS,
	PLUS_QUE_PRO,
	PRIX,
	type Case,
	type LigneDePrix
} from './tarifs-demo';

/**
 * LES TARIFS (maquette V26). Trois étiquettes pendues à un fil, Plume perché dessus, et une seule
 * bascule : à l'année ou au mois. Puis Découverte et le sur-mesure, le comparatif replié, et ce
 * qui lève le risque.
 *
 * ⚠️ TOUT CE QUI EST CHIFFRÉ SE LIT DANS LA GRILLE (`config/tarifs.ts`, par `tarifs-demo.ts`) :
 * les prix, les mois offerts, les limites de chaque formule, le comparatif (`CE_QUI_EST_INCLUS`),
 * l'essai et le remboursement. Les étiquettes se balancent sous la main (`ui/site/tarifs.ts`).
 *
 * `complet` : sur la page `/tarifs`, le comparatif s'ouvre d'emblée.
 */
function Coche() {
	return (
		<svg className="t-coche" viewBox="0 0 16 16" aria-hidden="true">
			<path d="M4.4 8.4l2.4 2.4 4.8-5.2" />
		</svg>
	);
}
function Fleche() {
	return (
		<svg viewBox="0 0 10 10" aria-hidden="true">
			<path d="M0 5h7" />
			<path d="M4.4 1.6L7.8 5 4.4 8.4" />
		</svg>
	);
}

function Ligne({ ligne }: { ligne: LigneDePrix }) {
	return (
		<li>
			<Coche />
			{'texte' in ligne ? (
				<span>{ligne.texte}</span>
			) : (
				<span>
					{ligne.avant}
					<b>{ligne.gras}</b>
					{ligne.apres}
				</span>
			)}
		</li>
	);
}

function Etiquette({ prix }: { prix: (typeof PRIX)[number] }) {
	const id = `prix-${prix.formule}`;
	return (
		<article
			className={prix.recommandee ? 'prix devant recommandee' : 'prix'}
			data-formule={prix.formule}
			aria-labelledby={id}
		>
			<div className="prix-pendu">
				<div className="prix-papier">
					<span className="etq-oeillet prix-oeillet" aria-hidden="true" />{' '}
					<span className="etq-pli" aria-hidden="true" />
					<div className="prix-tete">
						<h3 id={id}>{prix.nom}</h3>
						{prix.recommandee ? <span className="pastille-reco">Recommandée</span> : null}
					</div>
					<p className="prix-pour">{prix.pour}</p>
					<p className="prix-montant">
						<b data-montant="" data-mensuel={prix.mensuel} data-annuel={prix.annuel}>
							{prix.annuel}
						</b>
						<span className="prix-rythme">
							<span data-rythme-texte="">HT par an</span>
							<small data-rythme-sous="">{MOIS_OFFERTS}</small>
						</span>
					</p>
					<ul className="prix-lignes">
						{prix.lignes.map((l, i) => (
							<Ligne key={i} ligne={l} />
						))}
					</ul>
					<a className="prix-essai" href="#appel">
						{`Essayer ${DUREE_ESSAI_JOURS} jours `}
						<Fleche />
					</a>
				</div>
			</div>
		</article>
	);
}

function CaseDuComparatif({ c }: { c: Case }) {
	if ('oui' in c)
		return (
			<span className="t-oui">
				<Coche />
				<span className="sr">Compris</span>
			</span>
		);
	if ('non' in c)
		return (
			<span className="t-non" aria-label="Non compris">
				—
			</span>
		);
	return <>{c.texte}</>;
}

export function SectionTarifs({ complet = false }: { complet?: boolean }) {
	return (
		<section className="section tarifs" id="tarifs">
			<div className="enveloppe">
				<div className="revele tarifs-tete">
					<h2>
						Un abonnement.
						<br /> <span className="ton">Jamais une commission.</span>
					</h2>
					<p className="chapeau">
						Trois formules, et Découverte, gratuite. Ce que vos clients vous règlent arrive sur
						votre compte, en entier.
					</p>
					<div
						className="segment segment-rythme"
						role="radiogroup"
						aria-label="Rythme de paiement"
						data-rythme=""
					>
						<span className="segment-glisseur" aria-hidden="true" />
						<button type="button" role="radio" aria-checked="true" data-valeur="annuel">
							À l’année <em>{MOIS_OFFERTS}</em>
						</button>
						<button
							type="button"
							role="radio"
							aria-checked="false"
							tabIndex={-1}
							data-valeur="mensuel"
						>
							Au mois
						</button>
					</div>
				</div>
				<div className="tableau-prix-ombre ombre revele" data-tarifs="">
					<div className="tableau-prix etiquette grain" data-vivant="">
						<canvas data-paysage="midi" aria-hidden="true" />
						<span className="pli" />
						<div className="fil-prix">
							<div className="plume-fil" data-plume-fil="">
								<Plume humeur="content" className="clair" />
							</div>
							<p className="conseil" data-conseil="">
								{`Essayez ${DUREE_ESSAI_JOURS} jours, je vous préviens avant tout prélèvement.`}
							</p>
							<div className="etiquettes-prix" data-etiquettes="">
								<svg className="corde" data-corde="" aria-hidden="true">
									<path className="corde-ombre" data-corde-ombre="" />
									<path className="corde-trait" data-corde-trait="" />
								</svg>
								{PRIX.map((p) => (
									<Etiquette key={p.formule} prix={p} />
								))}
							</div>
						</div>
					</div>
				</div>
				<p className="dans-les-trois">
					Dans les trois formules : vos factures lues, ce qu’on vous doit au centime, les relances
					et la lettre officielle à votre nom, la page de paiement et le coffre-fort.
				</p>
				<div className="portes">
					<div className="porte">
						<h3>Découverte, gratuite</h3>
						<p>
							{`Déposez vos factures : vous voyez ce qu’on vous doit sur ${historiqueDeDecouverte()}, sans carte et sans limite de temps. Rien ne part tant que vous n’avez pas choisi.`}
						</p>
						<a className="lien-porte" href="#appel">
							Voir ce qu’on me doit <Fleche />
						</a>
					</div>
					<div className="porte">
						<h3>Sur mesure</h3>
						<p>
							{`Plusieurs établissements, plus de ${PLUS_QUE_PRO} personnes, un volume qui dépasse Pro ? On construit la formule avec vous.`}
						</p>
						<a
							className="lien-porte"
							href={`mailto:${getLegalEmailAddress()}?subject=Formule%20sur%20mesure`}
						>
							Nous écrire <Fleche />
						</a>
					</div>
				</div>
				<div className={complet ? 'comparer ouvert' : 'comparer'} data-comparer="">
					<button
						type="button"
						className="comparer-bouton"
						aria-expanded={complet ? 'true' : 'false'}
						aria-controls="comparaison"
						data-comparer-bouton=""
					>
						<span>{complet ? 'Masquer la comparaison' : 'Comparer les formules'}</span>
						<svg viewBox="0 0 10 10" aria-hidden="true">
							<path d="M2 3.6l3 3 3-3" />
						</svg>
					</button>
					<div className="comparaison" id="comparaison">
						<div className="comparaison-int">
							<table className="releve-prix">
								<thead>
									<tr>
										<th scope="col">
											<span className="sr">Ce qui est compris</span>
										</th>
										{COMPARATIF.tete.map((t) => (
											<th scope="col" data-col={t.palier} key={t.palier}>
												{t.nom}
												{'prix' in t ? (
													<small>{t.prix}</small>
												) : (
													<small data-montant="" data-mensuel={t.mensuel} data-annuel={t.annuel}>
														{t.annuel}
													</small>
												)}
											</th>
										))}
									</tr>
								</thead>
								<tbody>
									{COMPARATIF.lignes.map((l) => (
										<tr key={l.libelle}>
											<th scope="row">{l.libelle}</th>
											{l.cases.map((c, i) => (
												<td data-col={COMPARATIF.paliers[i]} key={COMPARATIF.paliers[i]}>
													<CaseDuComparatif c={c} />
												</td>
											))}
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				</div>
				<ul className="levees-prix">
					<li>
						<Coche />
						{'0\u00a0% de commission sur ce qui rentre'}
					</li>
					<li>
						<Coche />
						Résiliable en deux gestes
					</li>
					<li>
						<Coche />
						{`Remboursé sur demande sous ${JOURS_DE_REMBOURSEMENT}\u00a0jours`}
					</li>
				</ul>
				<p className="note-prix">
					Prix hors taxes. Paddle, notre revendeur, encaisse votre abonnement, émet la facture et
					ajoute la TVA de votre pays.
				</p>
			</div>
		</section>
	);
}
