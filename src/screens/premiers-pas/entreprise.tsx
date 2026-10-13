import { Input } from '@cladd-ui/react';
import { Building2Icon, SearchIcon } from 'lucide-react';
import {
	AvatarPlume,
	BoutonPrincipal,
	BoutonSecondaire,
	CadrePremiersPas,
	EnTeteDEtape,
	ListeCandidatsRegistre,
	MessageErreur,
	sirenLisible,
	type EtablissementPropose,
	type EtatRecherche,
	type ProgressionPremiersPas
} from '../../ui';
import { qualiteCommercantDeLaForme } from '../../lib/verticales/recouvrement/pays/france/commercialite';

/**
 * VOTRE ENTREPRISE — et la première fois où le produit va chercher à la place
 * du gérant (refait le 13/10/2026 dans la coquille des premiers pas).
 *
 * ⚠️ CE QUI NE CHANGE PAS, ET QUI A ÉTÉ CHÈREMENT APPRIS (voir l'historique de
 * l’ancien `screens/inscription/entreprise.tsx`, que cet écran remplace) :
 *
 *   · le numéro ne se tape nulle part : le gérant écrit le nom, le registre
 *     public propose, il touche, et le SIREN, la forme et l'adresse partent avec
 *     l'entreprise, dans la MÊME mutation que la création ;
 *   · la recherche part seule, une fois la frappe posée (la route la tient) ;
 *   · rien ne bloque sur le registre : une entreprise qui n'y figure pas
 *     s'inscrit avec son seul nom ;
 *   · « rien trouvé » n'est pas « le registre n'a pas répondu » ;
 *   · deux homonymes se montrent tous les deux, et rien n'est retenu d'office.
 *
 * ⚠️ CE QUI CHANGE : les longs paragraphes d'explication. Plume dit d'une ligne
 * ce qu'il fait (« Je cherche… au registre public »), et le bouton dit ce qui
 * va se passer : « C'est mon entreprise », ou « Continuer avec ce nom ».
 */
export function EcranEntreprise({
	progression,
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
	readonly progression: ProgressionPremiersPas;
	readonly nom: string;
	readonly onNom: (valeur: string) => void;
	readonly recherche: EtatRecherche;
	/** L'établissement que le gérant a touché dans la liste, s'il en a touché un. */
	readonly retenu: EtablissementPropose | null;
	/** Reprendre une recherche qui n'a rien donné, ou qui n'a pas abouti. */
	readonly onChercher: () => void;
	readonly onRetenir: (etablissement: EtablissementPropose) => void;
	/** Défaire un choix : un numéro retenu par erreur doit pouvoir se reprendre. */
	readonly onChanger: () => void;
	readonly enCours: boolean;
	readonly erreur: string | null;
	readonly onCreer: () => void;
}) {
	// Dérivé au rendu, jamais posé dans un effet.
	const deduction = qualiteCommercantDeLaForme(retenu?.formeJuridique);
	const cherche = nom.trim();

	return (
		<CadrePremiersPas
			progression={progression}
			cle="entreprise"
			pied={
				<>
					{erreur === null ? null : <MessageErreur>{erreur}</MessageErreur>}
					<BoutonPrincipal
						type="submit"
						form="premiers-pas-entreprise"
						pleineLargeur
						loading={enCours}
						readOnly={enCours}
						disabled={cherche === '' && retenu === null}
					>
						{retenu === null ? 'Continuer avec ce nom' : 'C’est mon entreprise'}
					</BoutonPrincipal>
				</>
			}
		>
			<EnTeteDEtape
				titre="Quelle est votre entreprise ?"
				explication="Son nom suffit : je cherche son numéro, sa forme juridique et son adresse au registre public."
			/>

			{/*
			  ⚠️ LE FORMULAIRE NE PORTE QUE LE CHAMP. Un bouton du kit posé dans un
			  `<form>` l'ENVOIE (aucun `type` par défaut) : toucher une entreprise
			  proposée, « Changer » ou « Chercher à nouveau » créait l'entreprise
			  avant que le choix soit pris en compte — avec le nom tapé, sans son
			  numéro (relevé le 13/10/2026). Tout le reste vit donc hors du formulaire,
			  et le bouton du pied le vise par `form=`.
			*/}
			<form
				id="premiers-pas-entreprise"
				onSubmit={(e) => {
					e.preventDefault();
					onCreer();
				}}
				className="flex flex-col"
			>
				{retenu === null ? (
					<Input
						size="lg"
						value={nom}
						onChange={onNom}
						name="organisation"
						placeholder="Le nom de votre entreprise"
						icon={<Building2Icon size={18} />}
						// `aria-label` passe par l'élément saisi : le kit ne le relaie pas d'en haut.
						inputComponentProps={{
							autoComplete: 'organization',
							'aria-label': 'Nom de l’entreprise'
						}}
						autoFocus
						required
					/>
				) : null}
			</form>

			<div className="flex flex-col gap-cladd-2xs">
				{retenu === null ? (
					<>
						{recherche.phase === 'EN_COURS' ? (
							<p
								className="flex items-center gap-cladd-3xs text-cladd-2xs text-cladd-fg-soft"
								aria-live="polite"
							>
								<AvatarPlume humeur="travaille" taille={28} />
								Je cherche « {cherche} » au registre public…
							</p>
						) : null}

						{recherche.phase === 'TROUVE' && recherche.candidats.length > 0 ? (
							<ListeCandidatsRegistre
								candidats={recherche.candidats}
								aide="Touchez la vôtre : son numéro et son adresse partent avec elle. Rien n’est écrit avant que vous continuiez."
								onRetenir={onRetenir}
							/>
						) : null}

						{recherche.phase === 'AUCUN' ? (
							<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
								Le registre ne publie aucune annonce au nom de « {cherche} ». Il ne connaît que les
								sociétés qui ont fait l’objet d’une publication : c’est un silence, pas une réponse
								sur votre entreprise. Continuez avec ce nom, votre numéro se renseignera plus tard.
							</p>
						) : null}

						{recherche.phase === 'ECHEC' ? (
							<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft" role="alert">
								{recherche.message} Vous pouvez continuer sans : rien de votre inscription n’en
								dépend.
							</p>
						) : null}

						{recherche.phase === 'AUCUN' || recherche.phase === 'ECHEC' ? (
							<BoutonSecondaire className="self-start" onClick={onChercher}>
								<SearchIcon size={16} />
								Chercher à nouveau
							</BoutonSecondaire>
						) : null}
					</>
				) : (
					/*
					  LE CAS RÉSOLU : plus aucun champ. L'écran dit ce que le registre
					  publie, et « Changer » rouvre la recherche, parce qu'un numéro retenu
					  par erreur désigne une AUTRE entreprise.
					*/
					<div className="verre-carte flex flex-col gap-cladd-3xs rounded-cladd-xl p-cladd-2xs">
						<div className="flex items-start gap-cladd-3xs">
							<Building2Icon
								size={18}
								className="mt-0.5 shrink-0 text-cladd-fg-softer"
								aria-hidden
							/>
							<div className="flex min-w-0 flex-1 flex-col gap-0.5">
								<span className="text-cladd-xs font-medium">{retenu.denomination}</span>
								<span className="text-cladd-2xs text-cladd-fg-soft">
									SIREN {sirenLisible(retenu.siren)}
									{retenu.formeJuridique === undefined ? null : ` · ${retenu.formeJuridique}`}
								</span>
								{retenu.adresse === undefined ? null : (
									<span className="text-cladd-2xs text-cladd-fg-softest">{retenu.adresse}</span>
								)}
							</div>
							<BoutonSecondaire className="shrink-0" onClick={onChanger}>
								Changer
							</BoutonSecondaire>
						</div>
						{/*
						  ⚠️ UNE DÉDUCTION S'AFFICHE COMME UNE DÉDUCTION : ce qui est lu, ce
						  qu'on en tire, le texte qui le fonde. « Indéterminé » est le bon
						  résultat pour une entreprise individuelle.
						*/}
						<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
							{deduction.etat === 'ok'
								? 'Proposé d’après votre forme juridique, à confirmer : vous êtes commerçant. '
								: deduction.etat === 'ko'
									? 'Proposé d’après votre forme juridique, à confirmer : vous n’êtes pas commerçant. '
									: ''}
							{deduction.fondement}
						</p>
					</div>
				)}
			</div>
		</CadrePremiersPas>
	);
}
