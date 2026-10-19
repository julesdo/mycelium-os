import { useEffect, useState } from 'react';
import { Input } from '@cladd-ui/react';
import { ExternalLinkIcon, PlusIcon, RefreshCwIcon, SendIcon } from 'lucide-react';
import {
	BoutonPrincipal,
	BoutonSecondaire,
	BoutonTexte,
	CarteLien,
	ListeDeCartes,
	EnTeteDeGroupe,
	Lien,
	PageEcran,
	type Lecture
} from '../../ui';
import { BlocDeFiche } from '../../ui/admin';
import { TableauCrm, type ColonneTableau } from '../../ui/admin-vues';
import {
	CadreDApercu,
	ChampAvecCompteur,
	ChoixDEntete,
	EditeurEnDeuxVolets,
	PanneauDeRelecture,
	PastilleDArticle,
	PhrasesEnBref,
	ZoneDeCorps,
	type StatutArticle
} from '../../ui/cms';
import { CATEGORIES, ILLUSTRATIONS, PILIERS } from '../../marketing/motifs-blog';
import { COMPOSANTS_MDX } from '../../marketing/mdx';
import { AUTEUR_PAR_DEFAUT, schemaEnteteArticle } from '../../lib/blog/schema';
import {
	adresseDepuisTitre,
	ecrireArticle,
	erreursLisibles,
	lireArticle,
	relireArticle,
	type ArticleConnu
} from '../../lib/blog/source';
import { useApercuMdx } from '../../app/apercu-mdx';
import { EXTRAITS } from '../../lib/blog/extraits';

/**
 * LE CMS DU BLOG (19/10/2026). Le fondateur : « brancher sur l'admin un système qui
 * permette de pousser le contenu statique des articles, pouvoir les modifier, un vrai
 * headless CMS GitHub via Convex ».
 *
 * Les articles restent les fichiers `content/blog/*.mdx` du dépôt. La liste les lit sur
 * GitHub ; l'éditeur les réécrit, relit la charte, montre l'aperçu fidèle, et publie : un
 * commit sur la branche que Vercel déploie. Un article daté du futur attend son jour.
 */

// ─── La liste ────────────────────────────────────────────────────────────────

export interface ArticleDeLaListe {
	readonly adresse: string;
	readonly sha: string;
	readonly titre: string | null;
	readonly description: string | null;
	readonly date: string | null;
	readonly categorie: string | null;
	readonly pilier: string | null;
	readonly brouillon: boolean;
	readonly erreurs: readonly string[];
}

export function statutDe(
	article: Pick<ArticleDeLaListe, 'date' | 'brouillon' | 'erreurs'>,
	aujourdHui: string
): StatutArticle {
	if (article.erreurs.length > 0 || article.date === null) return 'casse';
	if (article.brouillon) return 'brouillon';
	return article.date > aujourdHui ? 'programme' : 'publie';
}

const LIBELLES_STATUT_LISTE: Readonly<Record<StatutArticle, string>> = {
	publie: 'Publié',
	programme: 'Programmé',
	brouillon: 'Brouillon',
	casse: 'En-tête invalide'
};

function dateLisible(iso: string | null): string {
	if (iso === null) return '';
	const [a, m, j] = iso.split('-');
	return `${j}/${m}/${a}`;
}

export function EcranBlog({
	lecture,
	depot,
	aujourdHui,
	onRecharger
}: {
	readonly lecture: Lecture<readonly ArticleDeLaListe[]> | { readonly etat: 'dormant' };
	readonly depot: string | null;
	readonly aujourdHui: string;
	readonly onRecharger: () => void;
}) {
	const entete = {
		genre: 'onglet' as const,
		titre: 'Blog',
		actions: (
			<span className="ml-auto flex items-center gap-2">
				<BoutonTexte onClick={onRecharger}>
					<RefreshCwIcon aria-hidden />
					Recharger
				</BoutonTexte>
				<BoutonPrincipal as={Lien} to="/admin/blog/nouveau">
					<PlusIcon aria-hidden />
					Nouvel article
				</BoutonPrincipal>
			</span>
		)
	};

	if (lecture.etat === 'dormant') {
		return (
			<PageEcran entete={{ genre: 'onglet', titre: 'Blog' }}>
				<BlocDeFiche titre="Brancher GitHub">
					<div className="flex flex-col gap-2 px-1 text-cladd-2xs leading-relaxed text-cladd-fg-soft">
						<p>
							Le CMS lit et publie les articles dans le dépôt GitHub du site. Il lui faut un jeton à
							portée fine, limité à ce dépôt, avec le droit « Contents : Read and write ».
						</p>
						<p>
							Créez-le sur GitHub (Settings, Developer settings, Fine-grained tokens), puis posez-le
							dans Convex sous le nom GITHUB_CMS_TOKEN. Le jeton ne quitte jamais le serveur.
						</p>
					</div>
				</BlocDeFiche>
			</PageEcran>
		);
	}
	if (lecture.etat !== 'pret') return <PageEcran entete={entete} etat={lecture.etat} />;

	const articles = lecture.valeur.map((a) => ({ ...a, id: a.adresse }));
	const colonnes: readonly ColonneTableau<(typeof articles)[number]>[] = [
		{
			cle: 'titre',
			libelle: 'Article',
			rendu: (a) => (
				<span className="flex flex-col">
					<span className="font-medium">{a.titre ?? a.adresse}</span>
					<span className="text-cladd-3xs text-cladd-fg-soft">/blog/{a.adresse}</span>
				</span>
			),
			tri: (x, y) => (x.titre ?? '').localeCompare(y.titre ?? '')
		},
		{
			cle: 'statut',
			libelle: 'État',
			rendu: (a) => <PastilleDArticle statut={statutDe(a, aujourdHui)} />,
			tri: (x, y) => statutDe(x, aujourdHui).localeCompare(statutDe(y, aujourdHui))
		},
		{
			cle: 'date',
			libelle: 'Date',
			rendu: (a) => <span className="tabular-nums">{dateLisible(a.date)}</span>,
			tri: (x, y) => (x.date ?? '').localeCompare(y.date ?? '')
		},
		{ cle: 'pilier', libelle: 'Pilier', rendu: (a) => a.pilier ?? '' },
		{ cle: 'categorie', libelle: 'Catégorie', rendu: (a) => a.categorie ?? '' }
	];
	const programmes = articles.filter((a) => statutDe(a, aujourdHui) === 'programme').length;

	return (
		<PageEcran entete={entete} largeur="large">
			<div className="flex flex-col gap-cladd-xs">
				<EnTeteDeGroupe
					libelle={
						programmes === 0 ? 'Les articles' : `Les articles, dont ${programmes} à paraître`
					}
					nombre={articles.length}
				/>
				{/* Au téléphone, des cartes ; au bureau, le tableau triable. */}
				<div className="lg:hidden">
					<ListeDeCartes>
						{articles.map((a) => (
							<CarteLien
								key={a.adresse}
								vers="/admin/blog/$adresse"
								parametres={{ adresse: a.adresse }}
								titre={a.titre ?? a.adresse}
								montant={dateLisible(a.date)}
								ligne={[LIBELLES_STATUT_LISTE[statutDe(a, aujourdHui)], a.pilier]
									.filter(Boolean)
									.join(' · ')}
							/>
						))}
					</ListeDeCartes>
				</div>
				<div className="hidden lg:block">
					<TableauCrm
						libelle="Les articles du blog"
						colonnes={colonnes}
						lignes={articles}
						triInitial={{ cle: 'date', sens: 'desc' }}
						lien={(a) => ({ vers: '/admin/blog/$adresse', parametres: { adresse: a.adresse } })}
					/>
				</div>
				{depot === null ? null : (
					<p className="px-1 text-cladd-3xs text-cladd-fg-soft">Lu sur GitHub, dépôt {depot}.</p>
				)}
			</div>
		</PageEcran>
	);
}

// ─── L'éditeur ───────────────────────────────────────────────────────────────

const CORPS_NOUVEAU =
	'Le premier paragraphe pose la question que se pose le gérant.\n\n## Un intertitre\n\nTrois ou quatre lignes par paragraphe.\n\n## Ce que fait Letikette\n\nDeux phrases, sans forcer.\n\n---\n\nCet article présente des règles générales. Il ne constitue pas un conseil juridique : la décision\nd’agir, et la manière de le faire, restent les vôtres.\n';

interface Saisie {
	titre: string;
	description: string;
	date: string;
	categorie: string;
	pilier: string;
	illustration: string;
	enBref: string[];
	brouillon: boolean;
	auteur: string;
	corps: string;
}

function saisieDepuis(source: string | null, aujourdHui: string): Saisie {
	const lu = source === null ? null : lireArticle(source);
	if (lu === null || 'erreurs' in lu) {
		return {
			titre: '',
			description: '',
			date: aujourdHui,
			categorie: CATEGORIES[0],
			pilier: '',
			illustration: 'facture',
			enBref: [],
			brouillon: true,
			auteur: AUTEUR_PAR_DEFAUT,
			corps: lu === null ? CORPS_NOUVEAU : (source ?? '')
		};
	}
	return {
		titre: lu.entete.titre,
		description: lu.entete.description,
		date: lu.entete.date,
		categorie: lu.entete.categorie,
		pilier: lu.entete.pilier ?? '',
		illustration: lu.entete.illustration,
		enBref: [...(lu.entete.enBref ?? [])],
		brouillon: lu.entete.brouillon,
		auteur: lu.entete.auteur,
		corps: lu.corps
	};
}

/** La saisie validée par le schéma du build, ou ses erreurs en français. */
function valider(saisie: Saisie) {
	const resultat = schemaEnteteArticle.safeParse({
		titre: saisie.titre.trim(),
		description: saisie.description.trim(),
		date: saisie.date,
		categorie: saisie.categorie,
		...(saisie.pilier === '' ? {} : { pilier: saisie.pilier }),
		illustration: saisie.illustration,
		...(saisie.enBref.length === 0 ? {} : { enBref: saisie.enBref.map((p) => p.trim()) }),
		brouillon: saisie.brouillon,
		auteur: saisie.auteur
	});
	return resultat.success
		? { entete: resultat.data, erreurs: [] as string[] }
		: { entete: null, erreurs: erreursLisibles(resultat.error) };
}

/** Ce que la publication a rendu : le commit, et son adresse sur GitHub. */
export interface Publication {
	readonly commit: string;
	readonly url: string;
	readonly sha: string;
}

export function EcranEditeurArticle({
	adresseInitiale,
	source,
	sha,
	connus,
	aujourdHui,
	peutPublier,
	onPublier
}: {
	/** `null` pour un nouvel article : l'adresse se déduit du titre. */
	readonly adresseInitiale: string | null;
	readonly source: string | null;
	readonly sha: string | undefined;
	readonly connus: readonly ArticleConnu[];
	readonly aujourdHui: string;
	readonly peutPublier: boolean;
	readonly onPublier: (
		adresse: string,
		source: string,
		sha: string | undefined
	) => Promise<Publication>;
}) {
	const [saisie, setSaisie] = useState<Saisie>(() => saisieDepuis(source, aujourdHui));
	const [adresseSaisie, setAdresseSaisie] = useState<string | null>(adresseInitiale);
	const [empreinte, setEmpreinte] = useState<string | undefined>(sha);
	const [envoi, setEnvoi] = useState<
		| { etat: 'repos' }
		| { etat: 'envoi' }
		| { etat: 'fait'; publication: Publication }
		| { etat: 'erreur'; message: string }
	>({ etat: 'repos' });

	const nouveau = adresseInitiale === null && empreinte === undefined;
	const adresse = adresseSaisie ?? adresseDepuisTitre(saisie.titre);
	const changer =
		<K extends keyof Saisie>(cle: K) =>
		(valeur: Saisie[K]) =>
			setSaisie((s) => ({ ...s, [cle]: valeur }));

	// Un brouillon local, par article : une fermeture d'onglet ne perd rien. Confort seulement.
	const cleLocale = `cms-blog:${adresseInitiale ?? 'nouveau'}`;
	useEffect(() => {
		const minuterie = setTimeout(() => {
			try {
				localStorage.setItem(cleLocale, JSON.stringify(saisie));
			} catch {
				// Stockage indisponible : rien de grave, l'article reste dans l'écran.
			}
		}, 800);
		return () => clearTimeout(minuterie);
	}, [cleLocale, saisie]);
	const [brouillonLocal] = useState<Saisie | null>(() => {
		try {
			const brut = localStorage.getItem(cleLocale);
			return brut === null ? null : (JSON.parse(brut) as Saisie);
		} catch {
			return null;
		}
	});
	const [brouillonIgnore, setBrouillonIgnore] = useState(false);
	const brouillonDifferent =
		!brouillonIgnore &&
		brouillonLocal !== null &&
		JSON.stringify(brouillonLocal) !== JSON.stringify(saisieDepuis(source, aujourdHui));

	const { entete, erreurs } = valider(saisie);
	const apercu = useApercuMdx(saisie.corps);
	const relecture =
		entete === null
			? { bloquants: [], avertissements: [] }
			: relireArticle(
					adresse,
					{ entete, corps: saisie.corps },
					connus.filter((c) => c.adresse !== adresse)
				);
	const adresseDejaPrise = nouveau && connus.some((c) => c.adresse === adresse);
	const bloquants = [
		...erreurs,
		...relecture.bloquants,
		...(apercu.etat === 'erreur' ? [`Le corps ne se compile pas : ${apercu.message}`] : []),
		...(adresseDejaPrise ? [`Un article porte déjà l’adresse /blog/${adresse}.`] : [])
	];
	const pret = entete !== null && bloquants.length === 0 && apercu.etat === 'pret';
	const statut = statutDe({ date: saisie.date, brouillon: saisie.brouillon, erreurs }, aujourdHui);

	async function publier() {
		if (entete === null) return;
		setEnvoi({ etat: 'envoi' });
		try {
			const publication = await onPublier(
				adresse,
				ecrireArticle({ entete, corps: saisie.corps }),
				empreinte
			);
			setEmpreinte(publication.sha);
			setAdresseSaisie(adresse);
			setEnvoi({ etat: 'fait', publication });
			try {
				localStorage.removeItem(cleLocale);
			} catch {
				// Rien à retirer.
			}
		} catch (e) {
			const donnees = (e as { data?: unknown }).data;
			setEnvoi({
				etat: 'erreur',
				message:
					typeof donnees === 'string'
						? donnees
						: 'La publication a échoué. Réessayez dans un instant.'
			});
		}
	}

	const libelleBouton =
		statut === 'programme'
			? `Programmer au ${dateLisible(saisie.date)}`
			: statut === 'brouillon'
				? 'Enregistrer en brouillon'
				: 'Publier';

	const edition = (
		<>
			{brouillonDifferent ? (
				<div className="verre-carte flex flex-wrap items-center justify-between gap-2 rounded-cladd-xl px-3.5 py-2.5 text-cladd-2xs">
					<span>Une version non publiée de cet article est restée dans ce navigateur.</span>
					<span className="flex gap-2">
						<BoutonTexte
							onClick={() => {
								if (brouillonLocal !== null) setSaisie(brouillonLocal);
								setBrouillonIgnore(true);
							}}
						>
							La reprendre
						</BoutonTexte>
						<BoutonTexte onClick={() => setBrouillonIgnore(true)}>L’ignorer</BoutonTexte>
					</span>
				</div>
			) : null}

			<BlocDeFiche titre="L’en-tête">
				<div className="flex flex-col gap-cladd-2xs">
					<ChampAvecCompteur
						libelle="Titre"
						valeur={saisie.titre}
						onChange={changer('titre')}
						min={10}
						max={90}
						aide="La question que se pose le gérant. Aucun chiffre de la loi : l’en-tête ne lit pas le registre."
					/>
					<ChampAvecCompteur
						libelle="Description"
						valeur={saisie.description}
						onChange={changer('description')}
						min={50}
						max={170}
						aide="Le résumé que Google affiche."
					/>
					<label className="flex flex-col gap-1.5">
						<span className="px-1 text-cladd-2xs text-cladd-fg-soft">
							Adresse{' '}
							{nouveau ? '(déduite du titre, modifiable avant la première publication)' : ''}
						</span>
						<Input
							size="lg"
							value={adresse}
							disabled={!nouveau}
							onChange={(v: string) => setAdresseSaisie(v)}
						/>
					</label>
					<div className="grid gap-cladd-2xs sm:grid-cols-2">
						<label className="flex flex-col gap-1.5">
							<span className="px-1 text-cladd-2xs text-cladd-fg-soft">
								Date de parution (à Paris)
							</span>
							<Input size="lg" type="date" value={saisie.date} onChange={changer('date')} />
						</label>
						<ChoixDEntete
							libelle="Catégorie"
							valeur={saisie.categorie}
							options={CATEGORIES}
							onChange={changer('categorie')}
						/>
						<ChoixDEntete
							libelle="Pilier"
							valeur={saisie.pilier}
							options={PILIERS}
							onChange={changer('pilier')}
							vide="Aucun"
						/>
						<ChoixDEntete
							libelle="Illustration"
							valeur={saisie.illustration}
							options={ILLUSTRATIONS}
							onChange={changer('illustration')}
						/>
					</div>
					<PhrasesEnBref phrases={saisie.enBref} onChange={changer('enBref')} />
					<label className="flex items-center gap-2 px-1 text-cladd-2xs">
						<input
							type="checkbox"
							checked={saisie.brouillon}
							onChange={(e) => changer('brouillon')(e.target.checked)}
						/>
						Brouillon : jamais en ligne, visible seulement en développement
					</label>
				</div>
			</BlocDeFiche>

			<ZoneDeCorps valeur={saisie.corps} onChange={changer('corps')} extraits={EXTRAITS} />

			<BlocDeFiche titre="Relecture" droite={<PastilleDArticle statut={statut} />}>
				<PanneauDeRelecture bloquants={bloquants} avertissements={relecture.avertissements} />
			</BlocDeFiche>

			<div className="flex flex-col gap-2">
				{peutPublier ? (
					<BoutonPrincipal
						pleineLargeur
						disabled={!pret || envoi.etat === 'envoi'}
						onClick={() => void publier()}
					>
						<SendIcon aria-hidden />
						{envoi.etat === 'envoi' ? 'Envoi sur GitHub…' : libelleBouton}
					</BoutonPrincipal>
				) : (
					<p className="px-1 text-cladd-2xs text-cladd-fg-soft">
						Lecture seule : seul un fondateur publie sur le blog.
					</p>
				)}
				{envoi.etat === 'fait' ? (
					<p className="verre-carte flex flex-wrap items-center gap-2 rounded-cladd-xl px-3.5 py-2.5 text-cladd-2xs">
						Envoyé sur GitHub. Le site se reconstruit et l’article paraît{' '}
						{statut === 'programme' ? `le ${dateLisible(saisie.date)}` : 'dans quelques minutes'}.
						<BoutonSecondaire as="a" href={envoi.publication.url} target="_blank" rel="noreferrer">
							<ExternalLinkIcon aria-hidden />
							Le commit
						</BoutonSecondaire>
					</p>
				) : null}
				{envoi.etat === 'erreur' ? (
					<p className="text-cladd-red px-1 text-cladd-2xs font-medium">{envoi.message}</p>
				) : null}
			</div>
		</>
	);

	const apercuRendu = (
		<CadreDApercu titre={saisie.titre} description={saisie.description} enBref={saisie.enBref}>
			{apercu.etat === 'pret' ? (
				<apercu.Contenu components={COMPOSANTS_MDX} />
			) : apercu.etat === 'erreur' ? (
				<p className="text-cladd-md">L’aperçu attend un corps qui se compile : {apercu.message}</p>
			) : (
				<p className="text-cladd-md">Compilation de l’aperçu…</p>
			)}
		</CadreDApercu>
	);

	return (
		<PageEcran
			entete={{
				genre: 'poussee',
				retour: { vers: '/admin/blog', libelle: 'Blog' },
				titre: saisie.titre === '' ? 'Nouvel article' : saisie.titre
			}}
			largeur="large"
		>
			<EditeurEnDeuxVolets edition={edition} apercu={apercuRendu} />
		</PageEcran>
	);
}
