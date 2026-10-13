import type { ReactNode } from 'react';
import { FileLockIcon, FingerprintIcon, ScrollTextIcon, UploadIcon } from 'lucide-react';
import {
	BoutonPrincipal,
	BoutonSecondaire,
	BoutonTexte,
	CadrePremiersPas,
	ChiffreHero,
	CompositionDue,
	EnTeteDEtape,
	ListeDePromesses,
	Plume,
	dateCourte,
	pluriel,
	type ProgressionPremiersPas
} from '../../ui';

/**
 * Où en sont les factures du gérant, du point de vue de cette étape.
 *
 * ⚠️ QUATRE ÉTATS, ET AUCUN N'EST UN CADRAN À ZÉRO. « Rien d'échu » n'est pas
 * « 0,00 € » : c'est une phrase, parce qu'un montant nul se lirait comme une
 * panne de lecture.
 */
export type EtatDesFactures =
	| { readonly phase: 'A_DEPOSER' }
	| { readonly phase: 'EN_LECTURE'; readonly documents: number }
	| { readonly phase: 'RIEN_D_ECHU'; readonly documents: number }
	| {
			readonly phase: 'COMPTE';
			readonly arreteAu: string;
			readonly total: bigint;
			readonly principal: bigint;
			readonly interets: bigint;
			readonly indemnites: bigint;
			readonly nombreFactures: number;
			readonly nombreClients: number;
			/** Les documents encore en lecture : le chiffre peut encore bouger. */
			readonly enLecture: number;
	  };

/**
 * VOS FACTURES — l'étape qui donne au produit de quoi compter (13/10/2026).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LA CONFIANCE SE DIT AVANT DE CONFIER
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Cleo (Plaid), Apple Santé et Google Photos disent ce que deviennent les
 * données AVANT qu'on les donne. Le fondateur, le 12/10 : « aucune sensation de
 * sécurisation […] il s'agit de données extrêmement sensibles ». Les trois lignes
 * sont des faits du coffre (`convex/coffre/serrure.ts`, `accesDocuments`), et la
 * note dit ce qu'elles ne couvrent pas : un PDF part au service de lecture.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ PUIS LE PREMIER CHIFFRE EST LA RÉCOMPENSE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Rocket Money et Monarch font attendre le temps de l'analyse, puis montrent ce
 * qu'ils ont trouvé. Ici, le montant DÉFILE jusqu'à sa valeur (`ChiffreHero`),
 * avec sa composition : c'est la première fois que le gérant voit ce que
 * personne n'avait calculé. Les chiffres sont ceux de l'accueil
 * (`revelation`), au même jour : il retrouvera le même montant en entrant.
 */
export function EcranFactures({
	progression,
	etat,
	connexions,
	onImporter,
	onContinuer
}: {
	readonly progression: ProgressionPremiersPas;
	readonly etat: EtatDesFactures;
	/** Les connexions activées (Qonto, votre logiciel) ; absentes quand aucune ne l'est. */
	readonly connexions?: ReactNode;
	readonly onImporter: () => void;
	readonly onContinuer: () => void;
}) {
	if (etat.phase === 'A_DEPOSER') {
		/*
		  CONNECTER D'ABORD, IMPORTER ENSUITE — l'ordre de Shop : une connexion
		  alimente le produit pour toujours, un fichier une fois. Les cartes de
		  connexion portent leur propre bouton ; l'import descend alors d'un cran.
		*/
		const Importer = connexions === undefined ? BoutonPrincipal : BoutonSecondaire;
		return (
			<CadrePremiersPas
				progression={progression}
				cle="factures"
				pied={
					<Importer pleineLargeur onClick={onImporter}>
						<UploadIcon size={18} />
						Importer des factures
					</Importer>
				}
			>
				<EnTeteDEtape
					titre="Montrez-moi vos factures."
					explication="Un export comptable, un FEC, des PDF ou des photos : je reconnais le format seul, et je compte dès qu’elles arrivent."
				/>

				{connexions}

				<ListeDePromesses
					titre="Ce que deviennent vos documents"
					promesses={[
						{
							icone: <FileLockIcon />,
							titre: 'Scellés dès l’arrivée',
							precision:
								'Chiffrés sous une clé propre à votre entreprise, avant toute lecture. L’original en clair est effacé.'
						},
						{
							icone: <FingerprintIcon />,
							titre: 'Leur empreinte est relevée',
							precision: 'Elle reste avec le document, dans votre coffre.'
						},
						{
							icone: <ScrollTextIcon />,
							titre: 'Chaque ouverture est notée',
							precision:
								'Chaque dépôt, ouverture et téléchargement s’inscrit au journal du document.'
						}
					]}
				/>
				<p className="px-1 text-cladd-3xs leading-relaxed text-cladd-fg-softer">
					Pour lire un PDF ou une photo, je l’envoie à un service de lecture automatique.
				</p>
			</CadrePremiersPas>
		);
	}

	if (etat.phase === 'EN_LECTURE') {
		return (
			<CadrePremiersPas
				progression={progression}
				cle="factures-lecture"
				pied={
					<BoutonPrincipal pleineLargeur onClick={onContinuer}>
						Continuer pendant que je lis
					</BoutonPrincipal>
				}
			>
				<div className="flex flex-1 flex-col items-center justify-center gap-cladd-2xs text-center">
					<Plume humeur="travaille" taille={96} sol />
					<div className="flex flex-col gap-1" aria-live="polite">
						<p className="text-cladd-sm font-semibold">Je lis vos factures…</p>
						<p className="text-cladd-xs text-cladd-fg-soft">
							{etat.documents} document{pluriel(etat.documents)} en lecture. Je compte dès que c’est
							fini, et vous le verrez sur l’accueil.
						</p>
					</div>
				</div>
			</CadrePremiersPas>
		);
	}

	if (etat.phase === 'RIEN_D_ECHU') {
		return (
			<CadrePremiersPas
				progression={progression}
				cle="factures-rien"
				pied={
					<BoutonPrincipal pleineLargeur onClick={onContinuer}>
						Continuer
					</BoutonPrincipal>
				}
			>
				<EnTeteDEtape
					personnage={<Plume humeur="content" taille={72} sol />}
					titre="Rien d’échu pour l’instant."
					explication={`J’ai lu ${etat.documents} document${pluriel(etat.documents)} : aucune facture n’a dépassé son échéance. Je surveille les dates, et je vous préviens le jour où l’une passe.`}
				/>
				<BoutonTexte className="self-start" onClick={onImporter}>
					Ajouter d’autres factures
				</BoutonTexte>
			</CadrePremiersPas>
		);
	}

	return (
		<CadrePremiersPas
			progression={progression}
			cle="factures-compte"
			pied={
				<BoutonPrincipal pleineLargeur onClick={onContinuer}>
					Continuer
				</BoutonPrincipal>
			}
		>
			<EnTeteDEtape
				personnage={<Plume humeur="content" taille={72} sol />}
				titre="J’ai compté."
				explication={`Au ${dateCourte(etat.arreteAu)}, pénalités comprises : elles courent jusqu’au paiement, et je les recompte chaque jour.`}
			/>

			<div className="verre-carte flex flex-col gap-cladd-2xs rounded-cladd-xl p-cladd-2xs">
				<ChiffreHero
					centimes={etat.total}
					surTitre="Ce qu’on vous doit"
					defile
					legende={`${etat.nombreFactures} facture${pluriel(etat.nombreFactures)} échue${pluriel(etat.nombreFactures)}, chez ${etat.nombreClients} client${pluriel(etat.nombreClients)}`}
				/>
				<CompositionDue
					parts={{
						principal: etat.principal,
						interets: etat.interets,
						indemnites: etat.indemnites
					}}
				/>
			</div>

			{etat.enLecture === 0 ? null : (
				<p className="px-1 text-cladd-2xs text-cladd-fg-soft" aria-live="polite">
					Je lis encore {etat.enLecture} document{pluriel(etat.enLecture)} : le chiffre se mettra à
					jour seul.
				</p>
			)}

			<BoutonTexte className="self-start" onClick={onImporter}>
				Ajouter d’autres factures
			</BoutonTexte>
		</CadrePremiersPas>
	);
}
