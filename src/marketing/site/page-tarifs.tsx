import { useState } from 'react';
import { nomDeLOffre, type OffreDemandable } from '../../lib/crm/demande';
import { questionsDeFacturation, questionsDeLAccueil, type QuestionReponse } from '../faq';
import { FeuilleDeDemande, cartesDesOffres } from '../offres';
import { SectionAppel } from './appel';
import { CoquilleDuSite } from './coquille';
import { SectionTarifs } from './tarifs';

/**
 * LA PAGE DES TARIFS, D'APRÈS LA MAQUETTE V26 (28/10/2026).
 *
 * La section des tarifs de l'accueil, son comparatif ouvert d'emblée, puis ce que la maquette
 * n'avait pas dessiné et que la page portait déjà :
 * - les offres sur demande (`cartesDesOffres`, lues dans la grille) ;
 * - les questions de l'accueil d'avant (`questionsDeLAccueil`), puis celles qu'on se pose avant de
 *   payer (`questionsDeFacturation`).
 *
 * Elles prennent les formes de la section des tarifs : les « portes » de Découverte et du sur
 * mesure, le filet du comparatif. « Demander » ouvre la feuille de l'application
 * (`FeuilleDeDemande`), qui crée le prospect au CRM : un devis, jamais un paiement en ligne.
 */
function Fleche() {
	return (
		<svg viewBox="0 0 10 10" aria-hidden="true">
			<path d="M0 5h7" />
			<path d="M4.4 1.6L7.8 5 4.4 8.4" />
		</svg>
	);
}

export function SectionSurDemande() {
	const [ouverte, setOuverte] = useState<OffreDemandable | null>(null);
	return (
		<section className="section sur-demande" id="sur-demande">
			<div className="enveloppe">
				<div className="revele">
					<h2>
						Sur demande. <span className="ton">Un devis, par e-mail.</span>
					</h2>
					<p className="chapeau">
						Quand une formule ne suffit pas : un diagnostic de tout votre historique, une
						réclamation préparée pour vos clients publics, ou une mise en place accompagnée.
					</p>
				</div>
				<div className="portes portes-offres">
					{cartesDesOffres().map((c) => (
						<div className="porte" key={c.cle}>
							<h3>{nomDeLOffre(c.cle)}</h3>
							<span className="porte-prix">{c.prix}</span>
							<p>{c.pour}</p>
							<ul className="porte-conditions">
								{c.conditions.map((condition) => (
									<li key={condition}>{condition}</li>
								))}
							</ul>
							<button type="button" className="lien-porte" onClick={() => setOuverte(c.cle)}>
								Demander <Fleche />
							</button>
						</div>
					))}
				</div>
			</div>
			<FeuilleDeDemande
				key={ouverte ?? 'aucune'}
				offre={ouverte}
				onFermer={() => setOuverte(null)}
			/>
		</section>
	);
}

/** Des questions et leurs réponses, en `<details>` : chacune s'ouvre sans une ligne de script. */
export function SectionQuestions({
	id,
	titre,
	ton,
	questions
}: {
	id: string;
	titre: string;
	ton: string;
	questions: readonly QuestionReponse[];
}) {
	return (
		<section className="section faq-site" id={id}>
			<div className="enveloppe faq-grille">
				<div className="revele">
					<h2>
						{titre} <span className="ton">{ton}</span>
					</h2>
				</div>
				<div className="faq-liste">
					{questions.map(({ question, reponse }) => (
						<details className="faq-item" key={question}>
							<summary>
								<span>{question}</span>
								<svg viewBox="0 0 10 10" aria-hidden="true">
									<path d="M2 3.6l3 3 3-3" />
								</svg>
							</summary>
							<p>{reponse}</p>
						</details>
					))}
				</div>
			</div>
		</section>
	);
}

export function PageTarifs() {
	return (
		<CoquilleDuSite>
			<SectionTarifs complet />
			<SectionSurDemande />
			<SectionQuestions
				id="vos-questions"
				titre="Vos questions."
				ton="Nos réponses."
				questions={questionsDeLAccueil()}
			/>
			<SectionQuestions
				id="questions"
				titre="Avant de payer."
				ton="Ce qu’on nous demande."
				questions={questionsDeFacturation()}
			/>
			<SectionAppel />
		</CoquilleDuSite>
	);
}
