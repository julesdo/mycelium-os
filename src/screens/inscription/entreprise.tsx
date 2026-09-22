import { Button, Input, Surface } from '@cladd-ui/react';
import { Building2Icon, SearchIcon } from 'lucide-react';
import {
	BoutonPrincipal,
	CadreAuth,
	Champ,
	ListeCandidatsRegistre,
	MessageErreur,
	sirenLisible,
	type EtablissementPropose,
	type EtatRecherche
} from '../../ui';
import { qualiteCommercantDeLaForme } from '../../lib/verticales/recouvrement/pays/france/commercialite';

/**
 * LE PREMIER ÉCRAN, ET LA PREMIÈRE FOIS OÙ LE PRODUIT VA CHERCHER À LA PLACE
 * DU GÉRANT.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QUI SE TAPAIT TROIS FOIS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le nom de l'entreprise se saisissait ici, puis dans « Votre établissement »,
 * puis dans « Identité de créancier » — cette dernière avec le numéro, la forme
 * juridique et l'adresse. La recherche au registre existait déjà, mais seulement
 * dans le compte, APRÈS COUP : le gérant la découvrait une fois qu'il avait tout
 * recopié de mémoire.
 *
 * C'est la règle d'écran n° 1 prise à l'envers : « un champ vide que le logiciel
 * aurait pu remplir est un défaut ».
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ ET LE SIRET EST REVENU ICI — PAS COMME SAISIE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Il avait quitté cet écran parce qu'il s'y tapait pour rien : il alimentait
 * `organizations.siret`, qu'aucune règle du domaine ne consulte, pendant que
 * `profilsCreancier.siren` — celui que le décompte et le verrou de l'accueil
 * lisent — restait vide. Ce qui le ramène n'est donc pas un champ, c'est le
 * registre : le gérant touche son entreprise, et le numéro arrive avec elle,
 * vers la table qui le lit.
 *
 * ⚠️ ET LA RECHERCHE NE SE DEMANDE PAS. Elle part dès que le nom est écrit.
 * Un bouton « Chercher » aurait été le dernier geste inutile de cet écran : le
 * logiciel savait quoi chercher, il savait quand, et il attendait quand même un
 * doigt. Il n'en reste qu'un « Chercher à nouveau », pour reprendre un silence
 * du registre ou une panne.
 *
 * ⚠️ RIEN NE BLOQUE SUR LE REGISTRE. Le BODACC ne publie que ce qui a fait
 * l'objet d'une annonce de greffe : une entreprise qui n'en a jamais eu n'y
 * figure pas, et doit pouvoir s'inscrire quand même, avec son seul nom. Le
 * verrou « Votre identité de créancier » reste alors levé dans le compte, comme
 * aujourd'hui.
 *
 * ⚠️ ET « RIEN TROUVÉ » N'EST PAS « LE REGISTRE N'A PAS RÉPONDU ». Les deux
 * mènent à des gestes opposés — continuer sans, ou réessayer — et les confondre
 * serait un repli silencieux, donc un mensonge.
 *
 * ⚠️ AUCUN ÉTAT DANS CET ÉCRAN. Tout lui arrive en propriétés, et la déduction
 * se dérive au rendu : c'est la route qui tient la recherche, et la salle
 * d'exposition qui montre les cinq phases sans rien avoir à cliquer.
 */
export function EcranBienvenue({
	nom,
	onNom,
	recherche,
	retenu,
	onChercher,
	onRetenir,
	onChanger,
	enCours,
	erreur,
	onCreer
}: {
	nom: string;
	onNom: (valeur: string) => void;
	recherche: EtatRecherche;
	/** L'établissement que le gérant a touché dans la liste, s'il en a touché un. */
	retenu: EtablissementPropose | null;
	/** Reprendre une recherche qui n'a rien donné, ou qui n'a pas abouti. La première part seule. */
	onChercher: () => void;
	onRetenir: (etablissement: EtablissementPropose) => void;
	/** Défaire un choix : un numéro retenu par erreur doit pouvoir se reprendre. */
	onChanger: () => void;
	enCours: boolean;
	erreur: string | null;
	onCreer: () => void;
}) {
	/*
	  CE QUE LA FORME RELEVÉE PERMET DE DÉDUIRE. Dérivé au rendu, jamais posé dans
	  un effet : un état de plus finirait par dire autre chose que la forme
	  affichée à côté de lui.
	*/
	const deduction = qualiteCommercantDeLaForme(retenu?.formeJuridique);

	return (
		<CadreAuth
			large
			titre="Votre entreprise"
			explication="Son nom suffit. S’il est publié au registre public des annonces, nous en tirons votre numéro, votre forme juridique et votre adresse."
		>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					onCreer();
				}}
				className="flex flex-col gap-cladd-2xs"
			>
				<Champ etiquette="Nom de l’entreprise">
					<Input size="lg" value={nom} onChange={onNom} name="organisation" required />
				</Champ>

				{retenu === null ? (
					<Surface
						variant="transparent"
						outline={false}
						className="verre-carte rounded-cladd-xl"
						contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs"
					>
						{recherche.phase === 'TROUVE' && recherche.candidats.length > 0 ? (
							<ListeCandidatsRegistre
								candidats={recherche.candidats}
								aide="Touchez celle qui est la vôtre : son numéro et son adresse partent avec elle, et rien n’est écrit avant que vous créiez l’entreprise. L’adresse est celle de l’annonce, à sa date."
								onRetenir={onRetenir}
							/>
						) : null}

						{/*
						  ⚠️ LE TRAITEMENT SE VOIT SANS QU'ON LE DEMANDE — règle d'écran n° 2.
						  La recherche part toute seule : sans cette ligne, le gérant taperait
						  son nom devant une carte immobile, et ne saurait pas qu'on cherche.
						*/}
						{recherche.phase === 'EN_COURS' ? (
							<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft" aria-live="polite">
								Recherche de « {nom.trim()} » au registre public…
							</p>
						) : null}

						{recherche.phase === 'AUCUN' ? (
							<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
								Le registre ne publie aucune annonce au nom de « {nom.trim()} ». Il ne contient que
								les sociétés ayant fait l’objet d’une publication de greffe : c’est un silence du
								registre, pas une réponse sur votre entreprise. Continuez : votre numéro se
								renseignera depuis votre compte.
							</p>
						) : null}

						{recherche.phase === 'ECHEC' ? (
							<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft" role="alert">
								{recherche.message} Vous pouvez continuer sans : rien de votre inscription n’en
								dépend.
							</p>
						) : null}

						{recherche.phase === 'REPOS' ? (
							<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
								Le registre public rend la dénomination, le numéro et l’adresse du siège : les trois
								lignes qui s’impriment en tête d’un décompte, et le numéro dont dépend la
								surveillance de vos clients. Écrivez le nom, nous cherchons.
							</p>
						) : null}

						{/*
						  ⚠️ LE BOUTON NE SERT PLUS QU'À REPRENDRE, et c'est ce qui reste
						  quand la recherche part toute seule. « Chercher » était le dernier
						  geste inutile de cet écran : le logiciel savait quoi chercher, il
						  savait quand, et il attendait quand même un doigt.
						  `min-h-12` : 48 px, le plancher tactile du projet.
						*/}
						{recherche.phase === 'AUCUN' || recherche.phase === 'ECHEC' ? (
							<Button
								size="sm"
								variant="transparent"
								outline={false}
								hoverable={false}
								className="verre verre-bouton min-h-12 self-start rounded-full px-3 text-cladd-2xs"
								onClick={onChercher}
							>
								<SearchIcon size={16} />
								Chercher à nouveau
							</Button>
						) : null}
					</Surface>
				) : (
					/*
					  LE CAS RÉSOLU. Plus aucun champ : l'écran affiche ce que le registre
					  dit, et ce que le logiciel en tire. « Changer » rouvre la recherche,
					  parce qu'un numéro retenu par erreur désigne une AUTRE entreprise —
					  la seule erreur de ce produit qui rende une réponse rassurante ET
					  fausse.
					*/
					<Surface
						variant="transparent"
						outline={false}
						className="verre-carte rounded-cladd-xl"
						contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs"
					>
						<div className="flex items-start gap-cladd-3xs">
							<Building2Icon size={18} className="mt-0.5 shrink-0 text-cladd-fg-softer" aria-hidden />
							<div className="flex min-w-0 flex-1 flex-col gap-0.5">
								<span className="truncate text-cladd-xs font-medium">{retenu.denomination}</span>
								<span className="text-cladd-2xs text-cladd-fg-soft">
									SIREN {sirenLisible(retenu.siren)}
									{retenu.formeJuridique === undefined ? null : ` · ${retenu.formeJuridique}`}
								</span>
								{retenu.adresse === undefined ? null : (
									<span className="text-cladd-2xs text-cladd-fg-softest">{retenu.adresse}</span>
								)}
							</div>
							<Button
								size="sm"
								variant="transparent"
								outline={false}
								hoverable={false}
								className="verre verre-bouton min-h-12 shrink-0 rounded-full px-3 text-cladd-2xs"
								onClick={onChanger}
							>
								Changer
							</Button>
						</div>

						{/*
						  ⚠️ UNE DÉDUCTION S'AFFICHE COMME UNE DÉDUCTION. Le logiciel dit ce
						  qu'il a lu, ce qu'il en tire et le texte sur lequel il s'appuie.
						  Une case cochée sans explication se lirait comme une saisie du
						  gérant, et personne ne saurait plus qui a répondu.

						  ⚠️ ET « INDÉTERMINÉ » EST LE BON RÉSULTAT POUR UNE ENTREPRISE
						  INDIVIDUELLE : la forme ne distingue plus commerçant, artisan et
						  libéral depuis la fusion des catégories de 2018. La question se
						  reposera dans le compte, en disant pourquoi elle se pose.
						*/}
						<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
							{deduction.etat === 'ok'
								? 'Déduit de votre forme juridique : vous êtes commerçant. '
								: deduction.etat === 'ko'
									? 'Déduit de votre forme juridique : vous n’êtes pas commerçant. '
									: ''}
							{deduction.fondement}
						</p>
					</Surface>
				)}

				{erreur === null ? null : <MessageErreur>{erreur}</MessageErreur>}

				<BoutonPrincipal type="submit" loading={enCours} readOnly={enCours}>
					Créer mon entreprise
				</BoutonPrincipal>
			</form>
		</CadreAuth>
	);
}
