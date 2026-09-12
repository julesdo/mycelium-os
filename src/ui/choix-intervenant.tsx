import { useState } from 'react';
import {
	Button,
	Input,
	List,
	ListButton,
	Popup,
	PopupContent,
	SectionTitle,
	Select,
	Surface
} from '@cladd-ui/react';
import { SearchIcon, Trash2Icon } from 'lucide-react';
import { cn } from './cn';
import { BoutonPrincipal } from './bouton';

/**
 * QUI FAIT L'ACTE — en feuille, une décision à la fois.
 *
 * ⚠️ LE LOGICIEL NE PRÉSÉLECTIONNE RIEN. Quelle profession est compétente pour
 * quel acte est une valeur juridique, et `parametres.ts` la déclare non relevée
 * (`professionCompetenteParActe`). Présélectionner sur une correspondance
 * devinée enverrait un gérant chez un professionnel qui ne peut pas faire
 * l'acte, et lui ferait perdre le temps que la caducité compte.
 *
 * ⚠️ « MOI-MÊME » EST UN CHOIX DE PREMIER RANG. Selon le montant et le client,
 * un gérant dépose lui-même ou passe par un professionnel. Le produit pose la
 * question ; il n'y répond jamais.
 *
 * ⚠️ ET IL NE CLASSE PAS. Ordre alphabétique, celui que rend `monCarnet`. Un
 * ordre de pertinence serait une mise en avant, et une mise en avant est une
 * orientation.
 */

export type RoleIntervenant = 'AVOCAT' | 'COMMISSAIRE_DE_JUSTICE' | 'AUTRE';

/**
 * Les trois rôles, écrits pour être lus.
 *
 * ⚠️ AUCUN N'EST PREMIER. L'ordre est celui du validateur Convex, pas un ordre
 * de pertinence : le champ part sur « Autre », et c'est au gérant de dire ce
 * qu'est la personne qu'il ajoute.
 */
const ROLES: readonly { readonly cle: RoleIntervenant; readonly libelle: string }[] = [
	{ cle: 'AVOCAT', libelle: 'Avocat' },
	{ cle: 'COMMISSAIRE_DE_JUSTICE', libelle: 'Commissaire de justice' },
	{ cle: 'AUTRE', libelle: 'Autre' }
];

function libelleRole(role: RoleIntervenant): string {
	return ROLES.find((r) => r.cle === role)?.libelle ?? 'Autre';
}

/**
 * Une fiche du carnet, telle que l'écran la lit.
 *
 * ⚠️ L'IDENTIFIANT EST UN PARAMÈTRE DE TYPE, et ce n'est pas de la coquetterie.
 * `src/ui` ne connaît pas Convex ; le figer en `string` obligerait la route à
 * re-transformer en `Id<'intervenants'>` ce qui en venait, c'est-à-dire à
 * affirmer par une assertion ce que le compilateur savait déjà.
 */
export interface FicheIntervenant<I extends string = string> {
	readonly _id: I;
	readonly nom: string;
	readonly role: RoleIntervenant;
	/** Le ressort, quand le gérant l'a noté. Jamais deviné. */
	readonly ressort?: string;
}

/** Ce qu'une fiche saisie à la main porte, et rien de plus. */
export interface FicheASaisir {
	readonly nom: string;
	readonly role: RoleIntervenant;
	readonly ressort?: string;
}

/** « Avocat · Paris », ou « Avocat » quand le ressort n'a pas été noté. */
function precisionDeLaFiche(fiche: FicheIntervenant<string>): string {
	const role = libelleRole(fiche.role);
	return fiche.ressort === undefined || fiche.ressort.trim() === ''
		? role
		: `${role} · ${fiche.ressort}`;
}

/**
 * UNE CARTE DU CARNET.
 *
 * ⚠️ LE RETRAIT EST UN FRÈRE, PAS UN ENFANT. La carte entière est le bouton de
 * choix ; un second bouton posé DEDANS serait un bouton dans un bouton, que le
 * navigateur défait en silence et qu'aucun type n'attrape. Il est donc posé à
 * côté, en absolu, et le rembourrage droit de la carte lui fait sa place.
 */
function CarteIntervenant({
	nom,
	precision,
	choisie,
	onChoisir,
	onOublier
}: {
	nom: string;
	precision: string;
	choisie: boolean;
	onChoisir: () => void;
	/** Absent sur « Moi-même » : il n'y a aucune fiche à retirer. */
	onOublier?: () => void;
}) {
	return (
		<div className="relative">
			<Surface
				as="button"
				type="button"
				onClick={onChoisir}
				aria-pressed={choisie}
				variant="transparent"
				outline={false}
				// ⚠️ L'ANNEAU PORTE L'ACCENT DE MARQUE, JAMAIS UNE COULEUR DE SEUIL. Le
				// vert, l'ambre et le rouge ne disent qu'une chose dans ce produit —
				// au-dessus du seuil, tout près, en dessous — et choisir un
				// professionnel n'est pas un verdict.
				className={cn(
					'verre verre-bouton w-full rounded-cladd-xl text-left',
					choisie && 'ring-2 ring-cladd-primary'
				)}
				contentClassName={cn(
					'flex min-h-cladd-md flex-col justify-center gap-0.5 p-cladd-3xs',
					onOublier !== undefined && 'pr-14'
				)}
			>
				<span className="text-cladd-xs leading-tight font-semibold">{nom}</span>
				<span className="text-cladd-2xs leading-tight text-cladd-fg-softer">{precision}</span>
			</Surface>

			{onOublier === undefined ? null : (
				<Button
					variant="transparent"
					outline={false}
					hoverable={false}
					rounded
					size="md"
					onClick={onOublier}
					aria-label={`Oublier ${nom}`}
					className="verre-bouton absolute top-1/2 right-1 -translate-y-1/2"
				>
					<Trash2Icon />
				</Button>
			)}
		</div>
	);
}

export function ChoixIntervenant<I extends string>({
	carnet,
	choisi,
	ouverte,
	onFermer,
	onChoisir,
	onAjouter,
	onOublier,
	onChercherUnCommissaire
}: {
	/** Les fiches du gérant, dans l'ordre où `monCarnet` les rend. */
	carnet: readonly FicheIntervenant<I>[];
	/**
	 * Ce qui porte l'anneau — et il y a TROIS états, pas deux.
	 *
	 * `undefined` — personne n'a encore répondu : aucune carte n'est marquée.
	 * `null` — « Moi-même », c'est-à-dire aucun intervenant rattaché.
	 * `…` — la fiche rattachée.
	 *
	 * ⚠️ CONFONDRE `undefined` ET `null` FERAIT UNE PRÉSÉLECTION. Un anneau posé
	 * sur « Moi-même » avant que la question soit posée se lit comme une réponse
	 * du logiciel, et ce logiciel ne répond pas à celle-là.
	 */
	choisi?: I | null;
	ouverte: boolean;
	onFermer: () => void;
	onChoisir: (intervenantId: I | null) => void;
	/**
	 * Ajouter une fiche saisie à la main.
	 *
	 * ⚠️ L'ORIGINE N'EST PAS UN CHAMP DE CE FORMULAIRE. Une fiche saisie ici est
	 * `SAISI_A_LA_MAIN` par construction — c'est l'appelant qui l'écrit. Une
	 * fiche venue d'un répertoire public porterait EN PLUS sa source et sa date
	 * de relevé, sans quoi rien ne la distinguerait d'une donnée officielle et
	 * fraîche ; ce formulaire-ci ne peut donc pas en produire une.
	 */
	onAjouter: (fiche: FicheASaisir) => void;
	onOublier: (intervenantId: I) => void;
	/**
	 * Ouvrir la recherche d'un commissaire de justice, en feuille par-dessus
	 * celle-ci.
	 *
	 * ⚠️ FACULTATIF, ET C'EST UN CONSTAT PLUTÔT QU'UNE COMMODITÉ. La recherche
	 * demande une action Convex ; un écran qui ne peut pas l'appeler ne doit pas
	 * afficher une rangée qui ne mènerait nulle part. Absent, le geste
	 * n'apparaît pas — plutôt qu'un bouton mort.
	 */
	onChercherUnCommissaire?: () => void;
}) {
	const [nom, setNom] = useState('');
	const [role, setRole] = useState<RoleIntervenant>('AUTRE');
	const [ressort, setRessort] = useState('');

	const nomSaisi = nom.trim();
	const ressortSaisi = ressort.trim();

	return (
		<Popup
			open={ouverte}
			onOpenChange={(o) => {
				if (!o) onFermer();
			}}
			headerLeft={<span className="px-2 pb-1 text-cladd-sm font-semibold">Qui fait l’acte</span>}
			contentClassName="max-w-lg"
		>
			<PopupContent>
				<SectionTitle>Le carnet</SectionTitle>
				<div className="mt-cladd-3xs grid grid-cols-1 gap-cladd-3xs min-[420px]:grid-cols-2">
					{/* ⚠️ « MOI-MÊME » EN PREMIER, et pas par courtoisie : un gérant qui
					    dépose lui-même est un cas courant, et le reléguer après les
					    professionnels ferait lire la liste comme une incitation à en
					    prendre un. */}
					<CarteIntervenant
						nom="Moi-même"
						precision="Aucun intervenant rattaché"
						choisie={choisi === null}
						onChoisir={() => onChoisir(null)}
					/>
					{carnet.map((fiche) => (
						<CarteIntervenant
							key={fiche._id}
							nom={fiche.nom}
							precision={precisionDeLaFiche(fiche)}
							choisie={choisi === fiche._id}
							onChoisir={() => onChoisir(fiche._id)}
							onOublier={() => onOublier(fiche._id)}
						/>
					))}
				</div>

				<p className="mt-cladd-3xs text-cladd-2xs leading-relaxed text-cladd-fg-softest">
					La profession compétente pour cet acte n’est pas relevée dans le référentiel juridique de
					ce logiciel : rien n’est présélectionné, et cette liste n’est pas triée.
				</p>
			</PopupContent>

			<PopupContent>
				<SectionTitle>Ajouter une fiche</SectionTitle>

				{/*
				  ⚠️ LA RECHERCHE AVANT LA SAISIE, et c'est la règle d'écran n° 1 prise
				  dans le bon sens : « aucun écran ne demande une saisie que le logiciel
				  peut déduire ». Un nom d'étude, son adresse et son SIREN se trouvent
				  dans une source publique ; les faire recopier à la main était un champ
				  vide que le logiciel aurait pu remplir.

				  ⚠️ ET LA SAISIE MANUELLE RESTE, DESSOUS. Aucune source publique n'est
				  le tableau d'une profession : une étude qui n'a pas déclaré sa
				  convention collective est introuvable, et un avocat ne s'y cherche pas
				  du tout. On remplace une porte par une meilleure, on n'en condamne pas.
				*/}
				{onChercherUnCommissaire === undefined ? null : (
					<List className="mt-cladd-3xs">
						<ListButton
							icon={<SearchIcon size={18} />}
							footer="Les études d’un département, sans quitter l’application"
							className="verre-bouton"
							hoverable={false}
							onClick={onChercherUnCommissaire}
						>
							<span className="truncate">Chercher un commissaire de justice</span>
						</ListButton>
					</List>
				)}

				<div className="mt-cladd-3xs flex flex-col gap-cladd-3xs">
					<Input
						size="lg"
						value={nom}
						onChange={setNom}
						placeholder="Nom"
						infoMessage="Le cabinet ou la personne, tel que vous le nommez."
					/>
					<Select
						className="w-full"
						surface="cut"
						size="lg"
						title="Rôle"
						options={[...ROLES]}
						value={role}
						getOptionValue={(option) => option.cle}
						onChange={(cle) => setRole(cle)}
						renderOption={({ value }) => value.libelle}
						keyboardHints={false}
					>
						{libelleRole(role)}
					</Select>
					<Input
						size="lg"
						value={ressort}
						onChange={setRessort}
						placeholder="Ressort"
						infoMessage="Facultatif. Vide veut dire « non noté », jamais « aucun »."
					/>
					<BoutonPrincipal
						readOnly={nomSaisi === ''}
						onClick={() => {
							onAjouter({
								nom: nomSaisi,
								role,
								ressort: ressortSaisi === '' ? undefined : ressortSaisi
							});
							setNom('');
							setRessort('');
							setRole('AUTRE');
						}}
					>
						Ajouter au carnet
					</BoutonPrincipal>
				</div>
			</PopupContent>
		</Popup>
	);
}
