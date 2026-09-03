import { useState } from 'react';
import { Button, Dialog, DialogRoot, DialogTrigger, Surface } from '@cladd-ui/react';
import { DownloadIcon, TrashIcon, UserXIcon } from 'lucide-react';
import { SectionEcran } from '../../ui';
import { messageDErreur } from '../equipe/equipe';

/**
 * Ce que nous détenons, ce qu'on peut en emporter, ce qu'on peut en effacer.
 *
 * LA POLITIQUE DE CONFIDENTIALITÉ PROMETTAIT CES TROIS CHOSES SANS QUE RIEN NE
 * LES TIENNE. Sa section 10 annonce l'accès, la portabilité et l'effacement ;
 * jusqu'ici il aurait fallu répondre à la main, à la première demande. Un droit
 * qui dépend de la disponibilité de son opérateur n'est pas exerçable, et
 * l'écrire dans un document sans l'écrire dans le produit est un engagement à
 * vide.
 *
 * L'INVENTAIRE VIENT AVANT LES BOUTONS, et ce n'est pas de la décoration. « Vous
 * allez supprimer toutes vos données » ne dit rien : le gérant ne sait pas ce
 * qu'il perd, donc soit il n'ose pas, soit il ose sans savoir. « 312 factures,
 * 47 débiteurs, 2 décomptes » se comprend en une seconde.
 *
 * LA CONFIRMATION EST UNE SAISIE, PAS UNE CASE. Le nom de l'établissement pour
 * le supprimer, l'adresse du compte pour le fermer. C'est le seul garde-fou qui
 * résiste au clic machinal — et il est revérifié côté serveur : l'écran peut le
 * demander, seul le serveur peut l'exiger.
 */

export type ApercuDonnees = {
	nomEtablissement: string;
	estAdmin: boolean;
	creeLe: number;
	depots: number;
	factures: number;
	decomptes: number;
	debiteurs: number;
	membres: number;
};

export type FichierExport = { url: string; octets: number; lignes: number; nomFichier: string };

const NOMBRE = new Intl.NumberFormat('fr-FR');

function poids(octets: number): string {
	if (octets < 1024) return `${octets} octets`;
	if (octets < 1024 * 1024) return `${Math.round(octets / 1024)} Ko`;
	return `${(octets / (1024 * 1024)).toFixed(1)} Mo`;
}

export function Donnees({
	apercu,
	emailDuCompte,
	onExporter,
	onSupprimerEtablissement,
	onSupprimerCompte
}: {
	apercu: ApercuDonnees;
	emailDuCompte: string;
	onExporter: () => Promise<FichierExport>;
	onSupprimerEtablissement: (confirmation: string) => Promise<void>;
	onSupprimerCompte: (confirmation: string) => Promise<void>;
}) {
	return (
		<div className="flex max-w-180 flex-col gap-cladd-2xs">
			<Inventaire apercu={apercu} />
			{/* L'export n'est offert qu'à l'administrateur : c'est le carnet de
			    clients de l'entreprise, ses encours et ses impayés, c'est-à-dire son
			    secret des affaires. Le serveur le refuse aussi. */}
			{apercu.estAdmin ? <Export onExporter={onExporter} /> : null}
			{apercu.estAdmin ? (
				<SupprimerEtablissement apercu={apercu} onSupprimer={onSupprimerEtablissement} />
			) : null}
			<SupprimerCompte emailDuCompte={emailDuCompte} onSupprimer={onSupprimerCompte} />
		</div>
	);
}

function Inventaire({ apercu }: { apercu: ApercuDonnees }) {
	const lignes: readonly { quoi: string; combien: string }[] = [
		{ quoi: 'Fichiers importés', combien: NOMBRE.format(apercu.depots) },
		{ quoi: 'Factures enregistrées', combien: NOMBRE.format(apercu.factures) },
		{ quoi: 'Débiteurs identifiés', combien: NOMBRE.format(apercu.debiteurs) },
		{ quoi: 'Décomptes arrêtés', combien: NOMBRE.format(apercu.decomptes) },
		{ quoi: 'Personnes ayant accès', combien: NOMBRE.format(apercu.membres) }
	];

	return (
		<SectionEcran
			titre="Ce que nous détenons pour vous"
			legende={`Depuis le ${new Date(apercu.creeLe).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`}
		>
			<dl className="grid gap-cladd-3xs sm:grid-cols-2">
				{lignes.map((l) => (
					<div
						key={l.quoi}
						className="flex items-baseline justify-between gap-cladd-3xs border-b border-cladd-outline pb-cladd-3xs"
					>
						<dt className="text-cladd-xs text-cladd-fg-soft">{l.quoi}</dt>
						<dd className="text-cladd-sm font-bold tabular-nums">{l.combien}</dd>
					</div>
				))}
			</dl>
			<p className="text-cladd-2xs leading-relaxed text-cladd-fg-softer">
				Ne figure pas ici le référentiel de classification des libellés, mutualisé entre tous les
				établissements. Il ne contient qu’un libellé de produit et son verdict : jamais de montant,
				de quantité, de fournisseur, ni d’identité. Il ne vous appartient pas, et ne part donc ni à
				l’export ni à la suppression.
			</p>
		</SectionEcran>
	);
}

function Export({ onExporter }: { onExporter: () => Promise<FichierExport> }) {
	const [enCours, setEnCours] = useState(false);
	const [fichier, setFichier] = useState<FichierExport | null>(null);
	const [erreur, setErreur] = useState<string | null>(null);

	async function exporter() {
		setEnCours(true);
		setErreur(null);
		try {
			setFichier(await onExporter());
		} catch (e) {
			setErreur(messageDErreur(e));
		} finally {
			setEnCours(false);
		}
	}

	return (
		<SectionEcran
			titre="Emporter vos données"
			legende="Un fichier JSON, lisible par n’importe quel tableur ou logiciel"
		>
			<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
				Il contient l’intégralité de ce qui est listé ci-dessus : chaque ligne de facture avec son
				libellé d’origine, sa classification, sa justification et son indice de confiance. C’est le
				format que le règlement appelle « structuré, couramment utilisé et lisible par machine ».
			</p>

			{erreur ? (
				<p className="text-cladd-xs leading-relaxed" role="alert">
					{erreur}
				</p>
			) : null}

			{fichier ? (
				<Surface
					outline
					className="rounded-cladd-2xl"
					contentClassName="flex flex-wrap items-center gap-cladd-2xs p-cladd-2xs"
				>
					<span className="flex min-w-0 flex-1 flex-col">
						<span className="text-cladd-sm font-bold">Votre export est prêt.</span>
						<span className="text-cladd-2xs text-cladd-fg-softer">
							{NOMBRE.format(fichier.lignes)} lignes · {poids(fichier.octets)} · le lien expire dans
							une heure
						</span>
					</span>
					<Button
						as="a"
						href={fichier.url}
						download={fichier.nomFichier}
						color="brand"
						variant="solid-fill"
					>
						<DownloadIcon />
						Télécharger
					</Button>
				</Surface>
			) : (
				<Button
					className="self-start"
					loading={enCours}
					readOnly={enCours}
					onClick={() => void exporter()}
				>
					<DownloadIcon />
					{enCours ? 'Préparation du fichier…' : 'Préparer mon export'}
				</Button>
			)}
		</SectionEcran>
	);
}

function SupprimerEtablissement({
	apercu,
	onSupprimer
}: {
	apercu: ApercuDonnees;
	onSupprimer: (confirmation: string) => Promise<void>;
}) {
	const [erreur, setErreur] = useState<string | null>(null);

	return (
		<SectionEcran titre="Supprimer l’établissement">
			<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
				Ses {NOMBRE.format(apercu.factures)} factures, ses {NOMBRE.format(apercu.debiteurs)}{' '}
				débiteurs, ses {NOMBRE.format(apercu.decomptes)} décomptes et les pièces qui les
				soutiennent sont effacés définitivement. Il n’y a pas de corbeille : le règlement demande
				l’effacement, pas la mise de côté. Les {apercu.membres} personnes qui y accèdent en
				perdent l’accès immédiatement.
			</p>
			<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
				Si vous avez besoin de ces chiffres plus tard — une créance se prescrit en plusieurs
				années — préparez votre export avant.
			</p>

			{erreur ? (
				<p className="text-cladd-xs leading-relaxed" role="alert">
					{erreur}
				</p>
			) : null}

			<DialogRoot>
				<DialogTrigger>
					<Button className="self-start" color="red">
						<TrashIcon />
						Supprimer {apercu.nomEtablissement}
					</Button>
				</DialogTrigger>
				<Dialog
					title={`Supprimer ${apercu.nomEtablissement} ?`}
					text={`Cette action est définitive. ${NOMBRE.format(apercu.factures)} facture(s) et ${NOMBRE.format(apercu.decomptes)} décompte(s) seront effacés. Saisissez le nom exact de l’établissement pour confirmer.`}
					requireConfirmText={apercu.nomEtablissement}
					cancelButtonText="Annuler"
					confirmButtonText="Supprimer définitivement"
					confirmButtonColor="red"
					onConfirm={() => {
						setErreur(null);
						void onSupprimer(apercu.nomEtablissement).catch((e: unknown) =>
							setErreur(messageDErreur(e))
						);
					}}
				/>
			</DialogRoot>
		</SectionEcran>
	);
}

function SupprimerCompte({
	emailDuCompte,
	onSupprimer
}: {
	emailDuCompte: string;
	onSupprimer: (confirmation: string) => Promise<void>;
}) {
	const [erreur, setErreur] = useState<string | null>(null);

	return (
		<SectionEcran titre="Supprimer mon compte">
			<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
				Votre compte, votre profil et vos notifications sont effacés, et votre identité est retirée
				du service d’authentification. Les établissements dont vous êtes le seul membre sont
				supprimés avec vous ; ceux que vous partagez restent à leurs autres membres.
			</p>
			<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
				Si vous êtes le seul administrateur d’un établissement qui compte d’autres personnes, la
				suppression est refusée : nommez d’abord un autre administrateur, sinon plus personne ne
				pourrait le gérer.
			</p>

			{erreur ? (
				<p className="text-cladd-xs leading-relaxed" role="alert">
					{erreur}
				</p>
			) : null}

			<DialogRoot>
				<DialogTrigger>
					<Button className="self-start" color="red" variant="transparent">
						<UserXIcon />
						Supprimer mon compte
					</Button>
				</DialogTrigger>
				<Dialog
					title="Supprimer votre compte ?"
					text={`Cette action est définitive. Saisissez ${emailDuCompte} pour confirmer.`}
					requireConfirmText={emailDuCompte}
					cancelButtonText="Annuler"
					confirmButtonText="Supprimer mon compte"
					confirmButtonColor="red"
					onConfirm={() => {
						setErreur(null);
						void onSupprimer(emailDuCompte).catch((e: unknown) => setErreur(messageDErreur(e)));
					}}
				/>
			</DialogRoot>
		</SectionEcran>
	);
}
