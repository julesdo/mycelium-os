import { Chip } from '@cladd-ui/react';
import { Link } from '@tanstack/react-router';
import { EyeOffIcon } from 'lucide-react';
import {
	BoutonPrincipal,
	LigneAnalyse,
	ListeAnalyses,
	PageBody,
	PageEcran,
	RailProcedure,
	dateCourte,
	type EtapeAffichee,
	type Lecture
} from '../ui';

export interface DossierAffiche {
	readonly creanceId: string;
	readonly debiteur: string;
	readonly libelle: string;
	readonly engageeLe: string;
	readonly intervenant: string | null;
	readonly prochaineEcheance: {
		readonly libelle: string;
		readonly dateLimite: string;
		readonly gravite: 'CADUCITE' | 'INFORMATIVE';
		readonly consequence: string;
	} | null;
	readonly anglesMorts: readonly string[];
	readonly etapes: readonly EtapeAffichee[];
}

/**
 * L'ONGLET DES PROCÉDURES.
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
 * ⚠️ AUCUN `onOuvrir` : LES RANGÉES SONT DES LIENS. `LigneAnalyse` navigue
 * elle-même vers `?p=<id>`, donc une callback d'ouverture serait déclarée, lue
 * par personne et jamais appelée — exactement le défaut « déclaré, lu, jamais
 * alimenté » que ce dépôt traque. La fermeture, elle, reste nécessaire : sous
 * 1024 px la preuve est une feuille, et c'est `TwoPane` qui la referme.
 */
export interface ProceduresAffichees {
	readonly dossiers: readonly DossierAffiche[];
	/** Le dossier ouvert, lu dans l'adresse (`?p=`). */
	readonly ouvertId: string | null;
	readonly onFermer: () => void;
}

export function EcranProcedures({ donnees }: { donnees: Lecture<ProceduresAffichees> }) {
	if (donnees.etat !== 'pret') {
		// `disposition="volets"` : l'attente se dessine déjà en deux volets, et la
		// page ne saute pas quand les dossiers arrivent. Voir `PageEcran`.
		return (
			<PageEcran
				entete={{ genre: 'onglet', titre: 'Procédures' }}
				etat={donnees.etat}
				disposition="volets"
			/>
		);
	}

	const { dossiers, ouvertId, onFermer } = donnees.valeur;
	const ouvert = dossiers.find((d) => d.creanceId === ouvertId) ?? null;

	if (dossiers.length === 0) {
		return (
			<PageEcran
				entete={{ genre: 'onglet', titre: 'Procédures' }}
				etat={{
					vide: {
						/*
						  ⚠️ AUCUNE VOIE N'EST PROPOSÉE ICI. Un écran vide qui suggérerait
						  « engagez une injonction de payer » recommanderait une procédure,
						  et c'est la troisième ligne rouge. Il dit ce que le logiciel
						  COMPTERA, et il rend la main.
						*/
						illustration: '⚖️',
						titre: 'Rien d’engagé aujourd’hui',
						explication:
							'Le jour où vous engagerez une voie, c’est ici que seront comptés les délais qui en découlent, et ceux dont l’oubli fait tout reprendre.',
						etapes: [
							'Vous déclarez ce que vous avez engagé, et à quelle date.',
							'Le logiciel compte les délais qui en découlent, et nomme ceux qu’il ne sait pas compter.',
							'Vous consignez ce qui se passe ; le rail avance tout seul.'
						],
						action: (
							<BoutonPrincipal as={Link} to="/app/debiteurs">
								Voir mes débiteurs
							</BoutonPrincipal>
						)
					}
				}}
			/>
		);
	}

	return (
		<PageEcran
			entete={{
				genre: 'onglet',
				titre: 'Procédures',
				sousTitre: `${dossiers.length} engagée${dossiers.length > 1 ? 's' : ''}`
			}}
			volets={{
				liste: (
					<PageBody>
						<ListeAnalyses>
							{dossiers.map((dossier) => (
								<LigneAnalyse
									key={dossier.creanceId}
									vers="/app/procedures"
									recherche={{ p: dossier.creanceId }}
									titre={dossier.debiteur}
									precision={dossier.libelle}
									valeur={
										dossier.prochaineEcheance === null
											? undefined
											: dateCourte(dossier.prochaineEcheance.dateLimite)
									}
									attention={dossier.prochaineEcheance?.gravite === 'CADUCITE'}
								/>
							))}
						</ListeAnalyses>
					</PageBody>
				),
				preuve: ouvert === null ? null : <VoletDossier dossier={ouvert} />,
				preuveOuverte: ouvert !== null,
				onFermerPreuve: onFermer
			}}
		/>
	);
}

function VoletDossier({ dossier }: { dossier: DossierAffiche }) {
	return (
		<div className="flex flex-col gap-cladd-xs p-cladd-2xs">
			<div>
				<h2 className="text-cladd-md font-bold tracking-tight">{dossier.debiteur}</h2>
				<p className="text-cladd-xs text-cladd-fg-soft">
					engagée le {dateCourte(dossier.engageeLe)}
					{dossier.intervenant === null ? null : ` · ${dossier.intervenant}`}
				</p>
			</div>

			{/* L'ordre des blocs est celui de la spec : où j'en suis, ce qui court,
			    ce qui n'est PAS surveillé, puis le dossier. */}
			<div className="verre-carte rounded-cladd-xl p-cladd-2xs">
				<RailProcedure etapes={dossier.etapes} />
			</div>

			{dossier.prochaineEcheance === null ? null : (
				<div className="verre-carte rounded-cladd-xl p-cladd-2xs">
					<div className="flex items-center justify-between gap-cladd-3xs">
						<span className="text-cladd-sm font-bold">{dossier.prochaineEcheance.libelle}</span>
						<Chip
							size="md"
							color={dossier.prochaineEcheance.gravite === 'CADUCITE' ? 'red' : 'neutral'}
						>
							{dateCourte(dossier.prochaineEcheance.dateLimite)}
						</Chip>
					</div>
					<p className="mt-cladd-3xs text-cladd-2xs leading-relaxed text-cladd-fg-soft">
						{dossier.prochaineEcheance.consequence}
					</p>
				</div>
			)}

			{/*
			  ⚠️ LES ANGLES MORTS AVANT LES RANGÉES, JAMAIS APRÈS. Un délai dont le
			  référentiel ignore la durée court quand même. Le reléguer sous ce qui
			  rassure le ferait lire après coup, donc souvent pas du tout, et un
			  gérant qui croit sa procédure surveillée ne la surveille pas lui-même.
			*/}
			{dossier.anglesMorts.map((angle) => (
				<p
					key={angle}
					className="flex items-start gap-cladd-3xs rounded-cladd-xl border border-dashed border-cladd-outline p-cladd-2xs text-cladd-2xs leading-relaxed text-cladd-fg-soft"
				>
					<EyeOffIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
					{angle}
				</p>
			))}

			<ListeAnalyses>
				<LigneAnalyse
					vers="/app/creance/$id/procedure"
					parametres={{ id: dossier.creanceId }}
					titre="Le dossier complet"
					valeur="Ouvrir"
				/>
			</ListeAnalyses>
		</div>
	);
}
