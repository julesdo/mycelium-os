import {
	BoutonPrincipal,
	BoutonTexte,
	CadrePremiersPas,
	CeQuiPartira,
	EnTeteDEtape,
	MessageErreur,
	NOM_DU_PILOTE,
	Plume,
	type ProgressionPremiersPas
} from '../../ui';

/**
 * LES RELANCES — le gérant décide s'il laisse Plume écrire (13/10/2026).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LA LIGNE ROUGE N° 1, À LA LETTRE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Les relances partent seules une fois qu'un ADMINISTRATEUR l'a activé, après
 * avoir LU ce qui partira. L'écran montre donc le plan et ses règles en entier
 * (`CeQuiPartira`, le même texte que la feuille de l'accueil), puis deux
 * réponses de même rang : « Activer les relances », « Pas maintenant ». Rien
 * n'est coché d'avance, et ne pas répondre ne vaut pas accord.
 *
 * ⚠️ UN MEMBRE NE PEUT PAS ACTIVER (`requireOrgAdmin`) : il lit le plan, et
 * l'écran le lui dit au lieu de lui tendre un bouton qui refuserait.
 *
 * ⚠️ ET RIEN NE PART AUJOURD'HUI. Un dossier que Plume ouvre seul attend que le
 * gérant le DÉMARRE (`aDemarrer`) : l'activation ne relance personne tant
 * qu'aucun dossier n'est démarré. L'écran le dit, parce que c'est ce qui permet
 * d'activer sans appréhension.
 */
export function EcranRelances({
	progression,
	administrateur,
	enTeteIncomplet,
	enCours,
	erreur,
	onActiver,
	onPasMaintenant
}: {
	readonly progression: ProgressionPremiersPas;
	readonly administrateur: boolean;
	/** Le signataire ou l'adresse manquent : la première relance attendra. */
	readonly enTeteIncomplet: boolean;
	readonly enCours: boolean;
	readonly erreur: string | null;
	readonly onActiver: () => void;
	readonly onPasMaintenant: () => void;
}) {
	return (
		<CadrePremiersPas
			progression={progression}
			cle="relances"
			pied={
				administrateur ? (
					<>
						{erreur === null ? null : <MessageErreur>{erreur}</MessageErreur>}
						<BoutonPrincipal pleineLargeur loading={enCours} readOnly={enCours} onClick={onActiver}>
							Activer les relances
						</BoutonPrincipal>
						<BoutonTexte className="self-center" onClick={onPasMaintenant}>
							Pas maintenant
						</BoutonTexte>
					</>
				) : (
					<BoutonPrincipal pleineLargeur onClick={onPasMaintenant}>
						Continuer
					</BoutonPrincipal>
				)
			}
		>
			<EnTeteDEtape
				personnage={<Plume humeur="ecoute" taille={72} sol />}
				titre="Je relance pour vous ?"
				explication={`Sur les dossiers que vous aurez démarrés, et sur eux seuls : rien ne part tant que vous n’en avez démarré aucun. Voici ce que ${NOM_DU_PILOTE} enverra, et quand.`}
			/>

			<CeQuiPartira />

			{enTeteIncomplet ? (
				<p className="px-1 text-cladd-2xs leading-relaxed text-cladd-fg-soft">
					Il me manque encore qui signe ou votre adresse : la première relance attendra que vous les
					donniez, et je vous le rappellerai.
				</p>
			) : null}

			{administrateur ? null : (
				<p className="px-1 text-cladd-2xs leading-relaxed text-cladd-fg-soft">
					Seul un administrateur de votre entreprise peut activer les relances.
				</p>
			)}
		</CadrePremiersPas>
	);
}
