import {
	BoutonPrincipal,
	Lien,
	ListeDesDossiers,
	PageBody,
	PageEcran,
	VoletDuDossier,
	grouperParEcheance,
	pluriel,
	rangDuDossier,
	type DossierEngage,
	type Lecture
} from '../ui';

/**
 * Ce qu'une rangée de cet écran porte. Le type vit dans `ui/dossier.tsx`, avec
 * la carte qui le rend : deux déclarations du même dossier finiraient par
 * diverger, et la divergence ne casserait rien.
 */
export type DossierAffiche = DossierEngage;

/** Ce que l'écran affiche une fois les dossiers de procédure chargés. */
export interface ProceduresAffichees {
	readonly dossiers: readonly DossierAffiche[];
	/** Le dossier ouvert, lu dans l'adresse (`?p=`). */
	readonly ouvertId: string | null;
	/**
	 * LE JOUR, DONNÉ ET JAMAIS LU ICI.
	 *
	 * ⚠️ TOUT CET ÉCRAN EST UNE SOUSTRACTION DE DATES. Un composant qui
	 * interrogerait l'horloge lui-même ne se regarderait pas dans la salle : la
	 * démonstration doit pouvoir poser un jour fixe pour que les quatre rangs —
	 * dépassé, proche, plus tard, non compté — soient visibles ensemble. La route
	 * le prend à `aujourdHuiISO`, seule lecture d'horloge de l'interface.
	 */
	readonly aujourdHui: string;
	readonly onFermer: () => void;
}

/**
 * LES DOSSIERS ENGAGÉS — la troisième destination de la barre.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI CET ÉCRAN COMPTE PLUS QUE SA TAILLE NE LE LAISSE CROIRE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * C'est le seul endroit du produit où un droit s'éteint à DATE FIXE. Ailleurs,
 * une prescription se voit venir sur des années ; ici, une ordonnance devient
 * caduque trois mois après avoir été rendue, et ce jour-là tout est à reprendre
 * pendant que la prescription continue de courir. L'écran est donc rangé par
 * l'échéance qui APPROCHE, et jamais par date d'engagement : ce qui expire en
 * premier se lit en premier.
 *
 * ⚠️ DES SECTIONS, PAS DES ONGLETS. Les quatre rangs sont des intitulés dans un
 * seul défilement (`SectionTitle`). Un filtre à quatre positions ferait trancher
 * avant de lire, et cacherait trois quarts de ce qui court.
 *
 * ⚠️ LE VIDE MONTRE LE CHEMIN, JAMAIS UN CADRAN À ZÉRO. Un gérant qui n'a rien
 * engagé est le cas courant, et de loin. L'écran lui dit ce que le logiciel
 * comptera le jour où il engagera, et il offre une sortie. Il ne lui propose
 * aucune voie : ce serait recommander une procédure.
 *
 * ⚠️ IL NE SAIT PAS INTERROGER CONVEX, comme tout ce qui vit dans `screens/`.
 * La route lui passe des dossiers, la salle d'exposition lui en passe d'autres :
 * c'est ce qui permet de l'ouvrir aux quatre largeurs de référence sans backend
 * ni authentification.
 *
 * ⚠️ AUCUN `onOuvrir` : LES CARTES SONT DES LIENS. `CarteDossier` navigue
 * elle-même vers `?p=<id>`, donc une callback d'ouverture serait déclarée, lue
 * par personne et jamais appelée — exactement le défaut « déclaré, lu, jamais
 * alimenté » que ce dépôt traque. La fermeture, elle, reste nécessaire : sous
 * 1024 px la preuve est une feuille, et c'est `TwoPane` qui la referme.
 */
export function EcranProcedures({ donnees }: { donnees: Lecture<ProceduresAffichees> }) {
	const entete = { genre: 'onglet', titre: 'Dossiers' } as const;

	if (donnees.etat !== 'pret') {
		// `disposition="volets"` : l'attente se dessine déjà en deux volets, et la
		// page ne saute pas quand les dossiers arrivent. Voir `PageEcran`.
		return <PageEcran entete={entete} etat={donnees.etat} disposition="volets" />;
	}

	const { dossiers, ouvertId, aujourdHui, onFermer } = donnees.valeur;

	if (dossiers.length === 0) {
		return (
			<PageEcran
				entete={entete}
				etat={{
					vide: {
						/*
						  ⚠️ AUCUNE VOIE N'EST PROPOSÉE ICI. Un écran vide qui suggérerait
						  « engagez une injonction de payer » recommanderait une procédure,
						  et c'est la troisième ligne rouge. Il dit ce que le logiciel
						  COMPTERA, et il rend la main.
						*/
						illustration: '⚖️',
						titre: 'Aucun dossier engagé',
						explication:
							'Le jour où vous engagerez une voie, c’est ici que seront comptés les délais qui en découlent, et ceux dont l’oubli fait tout reprendre.',
						etapes: [
							'Vous déclarez ce que vous avez engagé, et à quelle date.',
							'Le logiciel compte les délais qui en découlent, et nomme ceux qu’il ne sait pas compter.',
							'Vous consignez ce qui se passe ; la frise avance tout seule.'
						],
						action: (
							<BoutonPrincipal as={Lien} to="/app/clients">
								Voir mes clients
							</BoutonPrincipal>
						)
					}
				}}
			/>
		);
	}

	const groupes = grouperParEcheance(dossiers, aujourdHui);
	const ouvert = dossiers.find((dossier) => dossier.creanceId === ouvertId) ?? null;

	/*
	  LE SOUS-TITRE DIT CE QUI PRESSE, ET SE TAIT QUAND RIEN NE PRESSE.

	  ⚠️ IL COMPTE CE QUE LES SECTIONS MONTRENT, par la MÊME fonction. Un second
	  décompte écrit ici — « les échéances à moins de trente jours » — divergerait
	  des sections le jour où le préavis change, et l'en-tête annoncerait un
	  nombre que la liste ne montre pas.

	  ⚠️ UN COMPTE À ZÉRO NE S'ÉCRIT PAS. « 0 date dépassée » est un cadran à
	  zéro : il occupe la place de ce qui compte pour dire qu'il n'y a rien à
	  dire.
	*/
	const compter = (rang: 'DEPASSEE' | 'APPROCHE') =>
		dossiers.filter((dossier) => rangDuDossier(dossier, aujourdHui) === rang).length;
	const depassees = compter('DEPASSEE');
	const proches = compter('APPROCHE');

	const parties = [`${dossiers.length} engagé${pluriel(dossiers.length)}`];
	if (depassees > 0) {
		parties.push(`${depassees} date${pluriel(depassees)} dépassée${pluriel(depassees)}`);
	}
	if (proches > 0) {
		parties.push(`${proches} échéance${pluriel(proches)} proche${pluriel(proches)}`);
	}
	const sousTitre = parties.join(' · ');

	return (
		<PageEcran
			entete={{ ...entete, sousTitre }}
			volets={{
				liste: (
					<PageBody>
						<ListeDesDossiers groupes={groupes} ouvertId={ouvertId} aujourdHui={aujourdHui} />
					</PageBody>
				),
				preuve:
					ouvert === null ? null : <VoletDuDossier dossier={ouvert} aujourdHui={aujourdHui} />,
				preuveOuverte: ouvert !== null,
				onFermerPreuve: onFermer
			}}
		/>
	);
}
