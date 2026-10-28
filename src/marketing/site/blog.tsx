import { Link } from '@tanstack/react-router';
import type { CSSProperties } from 'react';
import type { ArticleDuSite } from './blog-demo';

/**
 * LE BLOG (maquette V26) : les quatre derniers articles en récit, comme les capacités de Plume.
 * Une barre par article ; sur la plaque, la feuille de l'article (son « En bref ») et son
 * étiquette pendue, et le massif qui change d'heure à chaque article.
 *
 * ⚠️ LES ARTICLES SONT CEUX QUI SONT SORTIS (`blog-demo.ts`), lus dans leur en-tête : le titre,
 * la description, l'« En bref », la durée de lecture et l'étiquette, dont la valeur en grand se
 * lit au registre. Le récit avance seul et se balaie au téléphone (`ui/site/blog.ts`,
 * `ui/site/balayage.ts`).
 */
const variables = (v: Record<string, string>): CSSProperties => v as CSSProperties;

function Fleche() {
	return (
		<svg viewBox="0 0 10 10" aria-hidden="true">
			<path d="M0 5h7" />
			<path d="M4.4 1.6L7.8 5 4.4 8.4" />
		</svg>
	);
}

export function SectionBlog({
	articles,
	prochain
}: {
	articles: readonly ArticleDuSite[];
	prochain: { readonly jour: string; readonly titre: string } | null;
}) {
	const premier = articles[0];
	if (!premier) return null;
	return (
		<section className="section blog" id="blog">
			<div className="enveloppe">
				<div className="revele">
					<h2>
						Ce qu’on vous doit, <span className="ton">expliqué sans jargon.</span>
					</h2>
					<p className="chapeau">
						{
							'Deux articles par semaine, le mardi et le jeudi\u202f: la loi, les procédures et la trésorerie, écrits pour les dirigeants qui n’ont pas le temps.'
						}
					</p>
				</div>
				<div className="plume-grille blog-grille" data-blog="">
					<div className="capacites" role="tablist" aria-label="Les derniers articles">
						{articles.map((a, k) => (
							<button
								key={a.adresse}
								className={k === 0 ? 'capacite active' : 'capacite'}
								role="tab"
								aria-selected={k === 0 ? 'true' : 'false'}
								aria-controls="b-feuille"
								style={variables({ '--k': String(k) })}
								data-b-article={k}
							>
								<span className="progres" />
								<span className="b-meta">
									{a.rubrique}
									<i>·</i>
									{a.date}
								</span>
								<h3>{a.titre}</h3>
								<p>{a.description}</p>
							</button>
						))}
					</div>
					<div className="plaque-ombre ombre">
						<div className="plaque etiquette grain" data-vivant="" data-b-plaque="">
							<canvas data-b-toile="" aria-hidden="true" />
							<canvas className="b-toile-b" data-b-toile="" aria-hidden="true" />
							<span className="pli" />
							<div
								className="b-pendu"
								data-b-pendu=""
								aria-hidden="true"
								hidden={premier.etiquette === null}
							>
								<span className="b-fil" />
								<div className="b-etiquette">
									<span className="etq-papier">
										<span className="etq-oeillet" />
										<span className="etq-pli" />
										<span className="etq-label" data-b-etq-label="">
											{premier.etiquette?.[0]}
										</span>
										<b className="b-etq-grand" data-b-etq-grand="">
											{premier.etiquette?.[1]}
										</b>
										<span className="b-etq-sous" data-b-etq-sous="">
											{premier.etiquette?.[2]}
										</span>
									</span>
								</div>
							</div>
							<article
								className="b-feuille"
								id="b-feuille"
								role="tabpanel"
								aria-live="polite"
								data-b-feuille=""
							>
								<svg className="trombone b-trombone" viewBox="0 0 24 60" aria-hidden="true">
									<path d="M8 44 V12 a5 5 0 0 1 10 0 V46 a8 8 0 0 1 -16 0 V18" />
								</svg>
								<div className="b-papier" data-b-papier="">
									<span className="b-rubrique" data-b-rubrique="">
										{`${premier.rubrique} · ${premier.date}`}
									</span>
									<h3 className="b-titre" data-b-titre="">
										{premier.titre}
									</h3>
									<span className="b-bref-titre">En bref</span>
									<ol className="b-bref" data-b-bref="">
										{premier.bref.map((p) => (
											<li key={p}>{p}</li>
										))}
									</ol>
									<span className="b-bas">
										<span data-b-min="">{`${premier.minutes}\u00a0min de lecture`}</span>
										{/* Un lien simple : le moteur en change l'adresse à chaque article. */}
										<a className="b-lire" href={`/blog/${premier.adresse}`} data-b-lire="">
											Lire l’article <Fleche />
										</a>
									</span>
								</div>
							</article>
						</div>
					</div>
				</div>
				<p className="b-suite">
					{prochain ? (
						<span>
							<b>{prochain.jour}</b>
							{prochain.titre}
						</span>
					) : (
						<span />
					)}
					<Link className="b-tous" to="/blog">
						Tous les articles <Fleche />
					</Link>
				</p>
			</div>
		</section>
	);
}
