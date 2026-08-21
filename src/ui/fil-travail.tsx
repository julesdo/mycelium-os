import { Surface, SurfaceCut, Chip, Spinner } from '@cladd-ui/react';
import { CheckIcon, TriangleAlertIcon } from 'lucide-react';
import { Illustration } from './illustration';
import { estBio } from './verdict';
import { pluriel, type Famille } from './format';

/**
 * Le travail de l'IA, rendu visible pendant qu'il a lieu.
 *
 * LE PROBLÈME QU'IL RÉSOUT. Déposer douze mois de factures déclenche deux à
 * dix minutes de traitement. La version précédente affichait, pendant tout ce
 * temps, un compteur de fichiers et une roue qui tourne. Deux conséquences
 * mesurables : le gérant ne sait pas si quelque chose se passe, et il n'a
 * aucune idée de ce que le logiciel est en train de décider en son nom —
 * alors que c'est exactement ce qu'il devra confirmer trois minutes plus tard.
 *
 * CE QU'ON MONTRE. Deux choses, et pas une de plus : où en est chaque fichier,
 * et les dernières décisions prises, produit par produit, avec leur
 * illustration et leur verdict. La deuxième est la seule qui compte
 * vraiment — c'est elle qui transforme une attente en démonstration.
 *
 * `CACHE` contre `IA` n'a aucun effet technique et mérite pourtant sa place :
 * un libellé déjà tranché par le parc ne coûte ni appel, ni attente, ni
 * confirmation. C'est la promesse commerciale du produit, et c'est le seul
 * endroit où elle se voit se produire.
 */

export type Decision = {
	label: string;
	family: Famille;
	qualifyingLabels: readonly string[];
	isFood: boolean;
	source: 'CACHE' | 'IA';
};

export type DocumentEnCours = {
	documentId: string;
	filename: string;
	extractionStatus: 'PENDING' | 'DONE' | 'FAILED';
	extractionEtape?: string;
	extractionError?: string;
	linesCount: number;
};

export function FilTravail({
	documents,
	classification
}: {
	documents: readonly DocumentEnCours[];
	classification: {
		total: number;
		faits: number;
		echoues: number;
		termine: boolean;
		recents: readonly Decision[];
	} | null;
}) {
	const enLecture = documents.filter((d) => d.extractionStatus === 'PENDING');
	const lus = documents.filter((d) => d.extractionStatus === 'DONE');
	const echoues = documents.filter((d) => d.extractionStatus === 'FAILED');
	const lignes = documents.reduce((s, d) => s + d.linesCount, 0);

	const classementEnCours = classification !== null && !classification.termine;
	const travailEnCours = enLecture.length > 0 || classementEnCours;

	return (
		<Surface
			outline
			className="rounded-cladd-2xl shadow-carte"
			contentClassName="flex flex-col gap-cladd-2xs p-cladd-2xs"
		>
			<div className="flex items-center gap-cladd-3xs">
				{travailEnCours ? (
					<Spinner size="sm" color="brand" />
				) : (
					<span className="flex size-6 items-center justify-center rounded-full bg-cladd-primary/12 text-cladd-primary">
						<CheckIcon size={14} />
					</span>
				)}
				<div className="min-w-0 flex-1">
					<p className="text-cladd-xs font-semibold">
						{enLecture.length > 0
							? `Lecture de ${enLecture.length} facture${pluriel(enLecture.length)}`
							: classementEnCours
								? 'Classement de vos produits'
								: 'Vos factures sont lues et classées'}
					</p>
					<p className="text-cladd-2xs text-cladd-fg-softer">
						{lus.length} fichier{pluriel(lus.length)} lu{pluriel(lus.length)}
						{lignes > 0 ? ` · ${lignes} ligne${pluriel(lignes)} extraite${pluriel(lignes)}` : ''}
						{echoues.length > 0
							? ` · ${echoues.length} illisible${pluriel(echoues.length)}`
							: ''}
					</p>
				</div>
			</div>

			{/* Chaque fichier et son étape. Une facture qui met deux minutes doit
			    dire ce qu'elle fait pendant ces deux minutes, sinon elle a l'air
			    bloquée — et un gérant qui croit que c'est bloqué recharge la page. */}
			{documents.length > 0 ? (
				<SurfaceCut
					outline
					className="rounded-cladd-lg"
					contentClassName="flex flex-col divide-y divide-cladd-outline"
				>
					{documents.map((d) => (
						<div key={d.documentId} className="flex items-center gap-cladd-3xs px-cladd-3xs py-2">
							<EtatFichier statut={d.extractionStatus} />
							<span className="min-w-0 flex-1 truncate text-cladd-2xs font-medium">
								{d.filename}
							</span>
							<span className="shrink-0 text-cladd-2xs text-cladd-fg-softer">
								{d.extractionStatus === 'DONE'
									? `${d.linesCount} ligne${pluriel(d.linesCount)}`
									: d.extractionStatus === 'FAILED'
										? 'Illisible'
										: (d.extractionEtape ?? 'En attente')}
							</span>
						</div>
					))}
				</SurfaceCut>
			) : null}

			{classification !== null && classification.total > 0 ? (
				<Progression
					faits={classification.faits + classification.echoues}
					total={classification.total}
					termine={classification.termine}
				/>
			) : null}

			{classification !== null && classification.recents.length > 0 ? (
				<div className="flex flex-col gap-cladd-3xs">
					<p className="text-cladd-3xs font-semibold tracking-wide text-cladd-fg-softer uppercase">
						Dernières décisions
					</p>
					<ul className="flex flex-col gap-1">
						{classification.recents.map((d, rang) => (
							<li
								// La clé porte le rang autant que le libellé : deux dépôts
								// peuvent contenir le même produit, et React réutiliserait
								// alors la ligne sans rejouer son apparition.
								key={`${d.label}-${rang}`}
								className="flex animate-apparition items-center gap-cladd-3xs"
							>
								<Illustration
									libelle={d.label}
									famille={d.family}
									estAlimentaire={d.isFood}
									taille="sm"
								/>
								<span className="min-w-0 flex-1 truncate text-cladd-2xs">{d.label}</span>
								<Chip size="sm" color={d.isFood && d.qualifyingLabels.length > 0 ? 'brand' : 'neutral'}>
									{!d.isFood
										? 'Non alimentaire'
										: d.qualifyingLabels.length === 0
											? 'Hors barème'
											: estBio(d.qualifyingLabels)
												? 'Bio'
												: 'Durable'}
								</Chip>
								<span className="w-24 shrink-0 text-right text-cladd-3xs text-cladd-fg-softest">
									{d.source === 'CACHE' ? 'déjà connu' : 'analysé'}
								</span>
							</li>
						))}
					</ul>
				</div>
			) : null}
		</Surface>
	);
}

function EtatFichier({ statut }: { statut: DocumentEnCours['extractionStatus'] }) {
	if (statut === 'DONE') {
		return (
			<span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-cladd-primary/12 text-cladd-primary">
				<CheckIcon size={12} />
			</span>
		);
	}
	if (statut === 'FAILED') {
		return (
			<span className="cladd-color-orange flex size-5 shrink-0 items-center justify-center rounded-full bg-cladd-primary/15 text-cladd-primary">
				<TriangleAlertIcon size={12} />
			</span>
		);
	}
	return (
		<span
			aria-hidden
			className="size-5 shrink-0 animate-pouls rounded-full bg-cladd-primary/25 p-1"
		>
			<span className="block size-full rounded-full bg-cladd-primary" />
		</span>
	);
}

/**
 * L'avancement du classement.
 *
 * Le compteur est en libellés distincts, pas en lignes de facture : c'est
 * l'unité de travail réelle, et c'est aussi celle qui décroît quand le parc
 * grandit. Annoncer « 2 840 lignes » puis n'en traiter que 380 distinctes
 * donnerait une barre qui saute, et une promesse fausse.
 */
function Progression({
	faits,
	total,
	termine
}: {
	faits: number;
	total: number;
	termine: boolean;
}) {
	const part = total > 0 ? Math.min(1, faits / total) : 0;
	return (
		<div className="flex flex-col gap-1">
			<div className="flex items-baseline justify-between">
				<span className="text-cladd-2xs text-cladd-fg-soft">
					{termine ? 'Classement terminé' : 'Classement en cours'}
				</span>
				<span className="text-cladd-2xs text-cladd-fg-softer tabular-nums">
					{faits} / {total} produits
				</span>
			</div>
			<div className="h-2 w-full overflow-hidden rounded-full bg-cladd-surface-cut">
				{/* Toujours l'encre de la marque, jamais le vert des seuils : un
				    classement terminé ne dit RIEN de la conformité, et emprunter la
				    couleur du succès ici ferait croire le contraire à quelqu'un qui
				    traverse l'écran des yeux. */}
				<div
					className="h-full rounded-full bg-cladd-primary transition-[width] duration-500 ease-out"
					style={{ width: `${part * 100}%` }}
				/>
			</div>
		</div>
	);
}
