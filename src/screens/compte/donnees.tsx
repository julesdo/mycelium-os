import { Button, List, ListItem, SectionTitle, Surface } from '@cladd-ui/react';
import { DownloadIcon, TrashIcon, UserXIcon } from 'lucide-react';
import { BoutonPrincipal, ConfirmationParSaisie, pluriel } from '../../ui';

const NOMBRE = new Intl.NumberFormat('fr-FR');

/**
 * Ce que l'inventaire compte, et ce que les trois gestes du règlement rendent.
 *
 * ⚠️ CES TROIS PROMESSES N'ÉTAIENT ADOSSÉES À AUCUN CODE. La section 10 de la
 * politique de confidentialité annonce l'accès, la portabilité et l'effacement ;
 * il aurait fallu répondre à la main, à la première demande. Un droit qui dépend
 * de la disponibilité de son opérateur n'est pas exerçable.
 */
/**
 * ⚠️ LES QUATRE DERNIÈRES LIGNES MANQUAIENT, ET C'ÉTAIT UN INVENTAIRE FAUX.
 *
 * `apercuDeMesDonnees` compte NEUF catégories ; ce type n'en déclarait que
 * cinq, et l'écran n'en affichait que cinq. Le journal, les échanges avec le
 * compagnon, les propositions de la surveillance et les remises à un conseil
 * étaient comptés par le serveur, écrits par l'export (`_pageDeJournal`,
 * `_pageDeConversations`), effacés par la purge (`purgerEtablissement` les vide
 * toutes les quatre) — et invisibles à la seule question que cette section
 * existe pour répondre : « qu'est-ce que vous détenez sur moi ? »
 *
 * Le paragraphe sous l'inventaire énumère en outre ce qui N'Y FIGURE PAS, ce
 * qui donnait à la liste l'autorité d'un relevé complet. Un inventaire RGPD qui
 * sous-déclare est pire qu'un écran vide.
 */
export type ApercuDonnees = {
	nomEtablissement: string;
	estAdmin: boolean;
	creeLe: number;
	depots: number;
	factures: number;
	decomptes: number;
	debiteurs: number;
	journal: number;
	conversations: number;
	propositions: number;
	remisesAuConseil: number;
	membres: number;
};

export type FichierExport = { url: string; octets: number; lignes: number; nomFichier: string };

/** Un poids de fichier lisible. On ne fait pas lire des octets à un gérant. */
export function poids(octets: number): string {
	if (octets < 1024) return `${octets} octets`;
	if (octets < 1024 * 1024) return `${Math.round(octets / 1024)} Ko`;
	return `${(octets / (1024 * 1024)).toFixed(1)} Mo`;
}

/** Où en est l'export, et le geste que la route pilote. */
export interface ExportAffiche {
	readonly fichier: FichierExport | null;
	readonly enCours: boolean;
	readonly erreur: string | null;
	readonly onPreparer: () => void;
}

/** Ce que la section affiche, et les trois gestes du règlement que la route pilote. */
export interface DonneesAffichees {
	/** L'inventaire, ou `null` sans établissement actif. */
	readonly apercu: ApercuDonnees | null;
	readonly exportation: ExportAffiche;
	/** L'adresse à saisir pour confirmer la suppression du compte, et le refus du serveur. */
	readonly suppressionDuCompte: { readonly email: string; readonly erreur: string | null };
	readonly onSupprimerLeCompte: () => void;
	readonly suppressionDeLEtablissement: { readonly erreur: string | null };
	readonly onSupprimerLEtablissement: () => void;
}

/**
 * VOS DONNÉES — l'inventaire, l'export et les deux effacements, DÉPLIÉS.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ QUATRE ADRESSES DEVIENNENT UNE SECTION, ET LA CONFIRMATION NE BOUGE PAS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Les deux gestes destructeurs avaient leur propre page, et pour une raison qui
 * tenait : on les croisait en faisant défiler, entre un inventaire et un autre
 * bouton rouge, et un geste irréversible ne doit pas être atteignable par
 * accident.
 *
 * ⚠️ CE N'EST PAS LA PAGE QUI LES PROTÉGEAIT, C'EST LA SAISIE. Le garde-fou
 * réel est `ConfirmationParSaisie` : le nom EXACT de l'établissement, ou
 * l'adresse EXACTE du compte, à la casse et à l'espace près — et revérifié côté
 * serveur, parce qu'un écran peut demander et seul le serveur peut exiger. Il
 * est ici, mot pour mot, avec la même valeur attendue. Ce qui disparaît est une
 * adresse de plus, pas un cran de sécurité.
 *
 * ⚠️ ET L'INVENTAIRE RESTE EN TÊTE. C'est la réponse à la question qu'on vient
 * poser — « qu'est-ce que vous détenez sur moi ? » — et la replier derrière un
 * geste ferait une section qui ne répond rien.
 */
export function SectionDonnees({
	apercu,
	exportation,
	suppressionDuCompte,
	onSupprimerLeCompte,
	suppressionDeLEtablissement,
	onSupprimerLEtablissement
}: DonneesAffichees) {
	if (apercu === null) {
		return (
			<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
				Aucun établissement actif : il n’y a rien à inventorier, à emporter ni à effacer.
			</p>
		);
	}

	return (
		<>
			<Inventaire apercu={apercu} />

			<SectionTitle>Emporter vos données</SectionTitle>
			<Exportation apercu={apercu} exportation={exportation} />

			<SectionTitle>Effacer</SectionTitle>
			<Effacements
				apercu={apercu}
				suppressionDuCompte={suppressionDuCompte}
				onSupprimerLeCompte={onSupprimerLeCompte}
				suppressionDeLEtablissement={suppressionDeLEtablissement}
				onSupprimerLEtablissement={onSupprimerLEtablissement}
			/>
		</>
	);
}

function Inventaire({ apercu }: { apercu: ApercuDonnees }) {
	/*
	  ⚠️ LES NEUF CATÉGORIES QUE LE SERVEUR COMPTE, TOUTES LES NEUF. L'ordre va du
	  plus attendu au moins attendu : ce qu'on a déposé, ce qui en est sorti, puis
	  ce que le produit a écrit de son côté. C'est le dernier tiers qui surprend,
	  et c'est précisément celui qu'on venait vérifier.
	*/
	const lignes: readonly { quoi: string; combien: string }[] = [
		{ quoi: 'Fichiers importés', combien: NOMBRE.format(apercu.depots) },
		{ quoi: 'Factures enregistrées', combien: NOMBRE.format(apercu.factures) },
		{ quoi: 'Débiteurs identifiés', combien: NOMBRE.format(apercu.debiteurs) },
		{ quoi: 'Décomptes arrêtés', combien: NOMBRE.format(apercu.decomptes) },
		{ quoi: 'Gestes consignés au journal', combien: NOMBRE.format(apercu.journal) },
		{ quoi: 'Propositions de la surveillance', combien: NOMBRE.format(apercu.propositions) },
		{ quoi: 'Échanges avec le compagnon', combien: NOMBRE.format(apercu.conversations) },
		{ quoi: 'Remises à un conseil', combien: NOMBRE.format(apercu.remisesAuConseil) },
		{ quoi: 'Personnes ayant accès', combien: NOMBRE.format(apercu.membres) }
	];

	return (
		<>
			{/* `ListItem` plutôt qu'une grille de `<dl>` : ce sont des rangées de
			    réglage, et le kit en fournit le rythme vertical. */}
			<List className="p-0">
				{lignes.map((ligne) => (
					<ListItem key={ligne.quoi}>
						<span className="text-cladd-fg-soft">{ligne.quoi}</span>
						<span className="ml-auto text-cladd-sm font-bold tabular-nums">{ligne.combien}</span>
					</ListItem>
				))}
			</List>
			<p className="text-cladd-2xs leading-relaxed text-cladd-fg-softer">
				Ne figure pas ici le référentiel de classification des libellés, mutualisé entre tous les
				établissements. Il ne contient qu’un libellé de produit et son verdict : jamais de montant,
				de quantité, de fournisseur, ni d’identité. Il ne vous appartient pas, et ne part donc ni à
				l’export ni à la suppression.
			</p>
		</>
	);
}

/**
 * L'EXPORT, ET SON REFUS EN QUATRE PARTIES.
 *
 * ⚠️ RÉSERVÉ À L'ADMINISTRATEUR, et le serveur le refuse aussi. C'est le carnet
 * de clients de l'entreprise, ses encours et ses impayés — c'est-à-dire son
 * secret des affaires.
 */
function Exportation({
	apercu,
	exportation
}: {
	apercu: ApercuDonnees;
	exportation: ExportAffiche;
}) {
	if (!apercu.estAdmin) {
		return (
			<div className="flex flex-col gap-cladd-3xs">
				<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
					L’inventaire ci-dessus se lit sans restriction, et chaque administrateur de
					l’établissement peut préparer l’export aujourd’hui.
				</p>
				<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
					Ce qui manque : votre compte est membre, et l’export est réservé à un administrateur.
				</p>
				<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
					Ce verrou tient à ce que le fichier contient : le carnet de clients, les encours et les
					impayés de l’entreprise. Il se lève par le passage de votre compte en administrateur.
				</p>
				<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
					Ce que l’attente coûte : rien qui se chiffre. Aucune donnée ne se perd, et l’export
					s’obtient à l’identique le jour où il est demandé.
				</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-cladd-2xs">
			<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
				Un fichier JSON, lisible par n’importe quel tableur. Il contient l’intégralité de ce que
				l’inventaire liste : chaque ligne de facture avec son libellé d’origine, sa classification,
				sa justification et son indice de confiance. C’est le format que le règlement appelle
				« structuré, couramment utilisé et lisible par machine ».
			</p>

			{exportation.erreur ? (
				<p className="text-cladd-xs leading-relaxed" role="alert">
					{exportation.erreur}
				</p>
			) : null}

			{exportation.fichier ? (
				<Surface
					variant="transparent"
					outline={false}
					className="verre-carte rounded-cladd-xl"
					contentClassName="flex flex-wrap items-center gap-cladd-2xs p-cladd-2xs"
				>
					<span className="flex min-w-0 flex-1 flex-col">
						<span className="text-cladd-sm font-bold">Votre export est prêt.</span>
						<span className="text-cladd-2xs text-cladd-fg-softer">
							{NOMBRE.format(exportation.fichier.lignes)} lignes ·{' '}
							{poids(exportation.fichier.octets)} · le lien expire dans une heure
						</span>
					</span>
					<BoutonPrincipal
						as="a"
						href={exportation.fichier.url}
						download={exportation.fichier.nomFichier}
					>
						<DownloadIcon />
						Télécharger
					</BoutonPrincipal>
				</Surface>
			) : (
				<Button
					size="lg"
					variant="transparent"
					outline={false}
					hoverable={false}
					rounded
					className="verre verre-bouton self-start font-medium"
					loading={exportation.enCours}
					readOnly={exportation.enCours}
					onClick={exportation.onPreparer}
				>
					<DownloadIcon />
					{exportation.enCours ? 'Préparation du fichier…' : 'Préparer mon export'}
				</Button>
			)}
		</div>
	);
}

/**
 * LES DEUX EFFACEMENTS.
 *
 * ⚠️ IL N'Y A PAS DE CORBEILLE. Le règlement demande l'effacement, pas la mise
 * de côté. La section le dit avant, pas après.
 *
 * ⚠️ ET LE REFUS DU SERVEUR EST EXPLIQUÉ AVANT LE GESTE. Un seul administrateur
 * d'un établissement qui compte d'autres personnes ne peut pas partir : sinon
 * plus personne ne pourrait le gérer. Le dire après coup, dans un message
 * d'erreur, ferait passer une règle de sauvegarde pour une panne.
 */
function Effacements({
	apercu,
	suppressionDuCompte,
	onSupprimerLeCompte,
	suppressionDeLEtablissement,
	onSupprimerLEtablissement
}: {
	apercu: ApercuDonnees;
	suppressionDuCompte: { readonly email: string; readonly erreur: string | null };
	onSupprimerLeCompte: () => void;
	suppressionDeLEtablissement: { readonly erreur: string | null };
	onSupprimerLEtablissement: () => void;
}) {
	return (
		<div className="flex flex-col gap-cladd-2xs">
			{apercu.estAdmin ? (
				<div className="flex flex-col gap-cladd-3xs">
					<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
						Supprimer l’établissement efface ses {NOMBRE.format(apercu.factures)} facture
						{pluriel(apercu.factures)}, ses {NOMBRE.format(apercu.debiteurs)} débiteur
						{pluriel(apercu.debiteurs)}, ses {NOMBRE.format(apercu.decomptes)} décompte
						{pluriel(apercu.decomptes)} et les pièces qui les soutiennent, définitivement. Les{' '}
						{apercu.membres} personnes qui y accèdent en perdent l’accès immédiatement. Si vous
						avez besoin de ces chiffres plus tard — une créance se prescrit en plusieurs années —
						préparez votre export avant.
					</p>

					{suppressionDeLEtablissement.erreur ? (
						<p className="text-cladd-xs leading-relaxed" role="alert">
							{suppressionDeLEtablissement.erreur}
						</p>
					) : null}

					<ConfirmationParSaisie
						titre={`Supprimer ${apercu.nomEtablissement} ?`}
						texte={`Cette action est définitive. ${NOMBRE.format(apercu.factures)} facture${pluriel(apercu.factures)} et ${NOMBRE.format(apercu.decomptes)} décompte${pluriel(apercu.decomptes)} seront effacés. Saisissez le nom exact de l’établissement pour confirmer.`}
						valeurAttendue={apercu.nomEtablissement}
						invite="Le nom de l’établissement"
						intituleConfirmation="Supprimer définitivement"
						onConfirmer={onSupprimerLEtablissement}
						declencheur={
							<Button className="self-start" color="red" size="lg">
								<TrashIcon />
								Supprimer {apercu.nomEtablissement}
							</Button>
						}
					/>
				</div>
			) : null}

			<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
				Supprimer votre compte efface votre profil et vos notifications, et retire votre identité du
				service d’authentification. Les établissements dont vous êtes le seul membre sont supprimés
				avec vous ; ceux que vous partagez restent à leurs autres membres. Si vous êtes le seul
				administrateur d’un établissement qui compte d’autres personnes, la suppression est refusée :
				elle se lève en nommant un autre administrateur, sinon plus personne ne pourrait le gérer.
			</p>

			{suppressionDuCompte.erreur ? (
				<p className="text-cladd-xs leading-relaxed" role="alert">
					{suppressionDuCompte.erreur}
				</p>
			) : null}

			{/*
			  ⚠️ SANS ADRESSE, PAS DE CONFIRMATION POSSIBLE, et on le DIT au lieu
			  d'ouvrir une saisie qui demande de taper le vide. Un compte créé par
			  invitation peut n'en porter aucune.
			*/}
			{suppressionDuCompte.email.length === 0 ? (
				<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
					Votre compte ne porte aucune adresse e-mail : la confirmation par saisie n’a rien à
					demander, et la suppression ne s’ouvre pas d’ici.
				</p>
			) : (
				<ConfirmationParSaisie
					titre="Supprimer votre compte ?"
					texte={`Cette action est définitive. Saisissez ${suppressionDuCompte.email} pour confirmer.`}
					valeurAttendue={suppressionDuCompte.email}
					invite="Votre adresse e-mail"
					intituleConfirmation="Supprimer mon compte"
					onConfirmer={onSupprimerLeCompte}
					declencheur={
						<Button className="self-start" color="red" variant="transparent" size="lg">
							<UserXIcon />
							Supprimer mon compte
						</Button>
					}
				/>
			)}
		</div>
	);
}
