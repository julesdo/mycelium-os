import type { ReactNode } from 'react';
import { PARAMETRES } from '../lib/verticales/recouvrement/parametres';
import { depuisCentimes } from '../lib/socle/montants';
import { eurosCentimesCourts } from '../ui/format';
import { cn } from '../ui';
import type { CategorieBlog, Illustration } from './motifs-blog';

/**
 * LES COUVERTURES ILLUSTRÉES DU BLOG (06/10/2026).
 *
 * Le fondateur : « au lieu d'images de banques d'images, des covers illustrés
 * stylés dans notre DA, avec une couleur spécifique selon le type d'article ».
 * Chaque couverture est dessinée ici, en SVG, avec les couleurs du site : le
 * fond prend la teinte de la CATÉGORIE (la règle du produit, « la teinte dit de
 * quoi il s'agit »), le motif dit le SUJET. Papier, encre et formes nettes :
 * aucune forme organique, aucune photo.
 *
 * ⚠️ AUCUN MONTANT DESSINÉ À LA MAIN. Le « + 40 € » des frais de recouvrement
 * est lu sur les paramètres, comme partout ailleurs.
 */

/** Le fond et l'accent de chaque catégorie, en variables de couleur du site. */
const PALETTE: Record<CategorieBlog, { fond: string; accent: string }> = {
	'La loi': { fond: 'var(--color-teinte-argent)', accent: 'var(--color-galet-argent)' },
	// Les procédures : la teinte de « ce qu'on vous demande ».
	Procédures: { fond: 'var(--color-teinte-question)', accent: 'var(--color-galet-question)' },
	Trésorerie: { fond: 'var(--color-teinte-temps)', accent: 'var(--color-galet-temps)' },
	Méthode: { fond: 'var(--color-teinte-papiers)', accent: 'var(--color-galet-papiers)' },
	Letikette: { fond: 'var(--color-teinte-abricot)', accent: 'var(--color-galet-abricot)' }
};

const ENCRE = 'var(--color-encre-site)';
const PAPIER = 'var(--color-papier)';
const FILET = 'var(--color-filet-creme)';
const ABRICOT = 'var(--color-galet-abricot)';

/** Une feuille de papier posée, avec son ombre courte. */
function Feuille({
	x,
	y,
	l,
	h,
	children
}: {
	x: number;
	y: number;
	l: number;
	h: number;
	children?: ReactNode;
}) {
	return (
		<g>
			<rect x={x + 6} y={y + 8} width={l} height={h} rx={18} fill={ENCRE} opacity={0.08} />
			<rect x={x} y={y} width={l} height={h} rx={18} fill={PAPIER} />
			{children}
		</g>
	);
}

/** Des lignes de texte figurées : la première en encre, les suivantes en filet. */
function Lignes({
	x,
	y,
	largeurs,
	pas = 22
}: {
	x: number;
	y: number;
	largeurs: readonly number[];
	pas?: number;
}) {
	return (
		<g>
			{largeurs.map((largeur, rang) => (
				<rect
					key={rang}
					x={x}
					y={y + rang * pas}
					width={largeur}
					height={rang === 0 ? 12 : 9}
					rx={5}
					fill={rang === 0 ? ENCRE : FILET}
				/>
			))}
		</g>
	);
}

function indemniteLisible(): string {
	const valeur = PARAMETRES.indemniteForfaitaire.valeur;
	return valeur === null ? '+ €' : `+ ${eurosCentimesCourts(depuisCentimes(valeur))}`;
}

function Motif({ illustration, accent }: { illustration: Illustration; accent: string }) {
	switch (illustration) {
		// Les pénalités : une facture, et des barres qui montent avec le temps.
		case 'decompte':
			return (
				<g>
					<Feuille x={84} y={70} l={230} h={270}>
						<Lignes x={112} y={102} largeurs={[110, 170, 150, 160]} />
						<rect x={112} y={226} width={174} height={1.5} fill={FILET} />
						<rect x={112} y={248} width={70} height={10} rx={5} fill={FILET} />
						<rect x={210} y={244} width={76} height={18} rx={6} fill={ENCRE} />
						<rect x={112} y={282} width={174} height={34} rx={10} fill={accent} />
					</Feuille>
					{[
						{ x: 370, h: 90 },
						{ x: 432, h: 150 },
						{ x: 494, h: 220 }
					].map((barre, rang) => (
						<rect
							key={barre.x}
							x={barre.x}
							y={340 - barre.h}
							width={44}
							height={barre.h}
							rx={10}
							fill={rang === 2 ? ENCRE : accent}
						/>
					))}
					<rect x={360} y={340} width={190} height={2} rx={1} fill={ENCRE} opacity={0.3} />
				</g>
			);

		// Les frais de recouvrement : trois factures, une indemnité chacune.
		case 'indemnites':
			return (
				<g>
					{[0, 1, 2].map((rang) => {
						const x = 96 + rang * 140;
						const y = 96 + rang * 22;
						return (
							<g key={rang}>
								<Feuille x={x} y={y} l={170} h={210}>
									<Lignes x={x + 22} y={y + 30} largeurs={[80, 120, 100, 110]} />
								</Feuille>
								<rect x={x + 22} y={y + 150} width={126} height={40} rx={20} fill={ABRICOT} />
								<text
									x={x + 85}
									y={y + 177}
									textAnchor="middle"
									className="font-serif"
									fontSize={22}
									fontWeight={600}
									fill={ENCRE}
								>
									{indemniteLisible()}
								</text>
							</g>
						);
					})}
				</g>
			);

		// La date limite : un calendrier, un jour marqué.
		case 'calendrier':
			return (
				<g>
					<Feuille x={110} y={64} l={300} h={280}>
						<rect x={110} y={64} width={300} height={58} rx={18} fill={ENCRE} />
						<rect x={110} y={100} width={300} height={22} fill={ENCRE} />
						{Array.from({ length: 20 }, (_, rang) => {
							const colonne = rang % 5;
							const ligne = Math.floor(rang / 5);
							const x = 134 + colonne * 52;
							const y = 144 + ligne * 46;
							const marque = rang === 13;
							return (
								<g key={rang}>
									{marque ? <circle cx={x + 16} cy={y + 14} r={22} fill={accent} /> : null}
									<rect x={x} y={y} width={32} height={28} rx={7} fill={marque ? ENCRE : FILET} />
								</g>
							);
						})}
					</Feuille>
					<rect x={452} y={96} width={6} height={250} rx={3} fill={ENCRE} />
					<path d="M458 100 L528 122 L458 144 Z" fill={accent} />
				</g>
			);

		// La relance : un échange courtois, un message et sa réponse.
		case 'relance':
			return (
				<g>
					<rect x={96} y={86} width={290} height={110} rx={26} fill={PAPIER} />
					<path d="M124 196 L124 226 L156 196 Z" fill={PAPIER} />
					<Lignes x={126} y={116} largeurs={[150, 220, 180]} pas={24} />
					<rect x={236} y={226} width={270} height={96} rx={26} fill={ENCRE} />
					<path d="M478 322 L478 350 L448 322 Z" fill={ENCRE} />
					<rect x={266} y={254} width={170} height={11} rx={5} fill={PAPIER} opacity={0.9} />
					<rect x={266} y={278} width={120} height={9} rx={4} fill={PAPIER} opacity={0.5} />
					<circle cx={466} cy={274} r={18} fill={accent} />
					<path
						d="M457 274 L464 281 L476 267"
						fill="none"
						stroke={ENCRE}
						strokeWidth={4}
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</g>
			);

		// Le paiement partiel : une facture à moitié réglée, et ce qui reste.
		case 'paiement':
			return (
				<g>
					<Feuille x={96} y={78} l={300} h={250}>
						<Lignes x={126} y={110} largeurs={[130, 200, 170]} />
						<rect x={126} y={206} width={240} height={26} rx={13} fill={FILET} />
						<rect x={126} y={206} width={96} height={26} rx={13} fill={ENCRE} />
						<rect x={126} y={256} width={70} height={10} rx={5} fill={FILET} />
						<rect x={286} y={252} width={80} height={18} rx={6} fill={accent} />
					</Feuille>
					{[0, 1, 2, 3].map((rang) => (
						<ellipse
							key={rang}
							cx={482}
							cy={310 - rang * 24}
							rx={52}
							ry={18}
							fill={rang === 3 ? ENCRE : accent}
						/>
					))}
				</g>
			);

		// La procédure sans juge : un acte, et son sceau.
		case 'sceau':
			return (
				<g>
					<Feuille x={110} y={56} l={270} h={300}>
						<Lignes x={140} y={90} largeurs={[150, 210, 190, 200, 170, 120]} />
						<rect x={140} y={300} width={110} height={10} rx={5} fill={FILET} />
					</Feuille>
					<circle cx={392} cy={290} r={66} fill={accent} />
					<circle cx={392} cy={290} r={48} fill="none" stroke={ENCRE} strokeWidth={4} />
					<path
						d="M372 290 L386 304 L414 274"
						fill="none"
						stroke={ENCRE}
						strokeWidth={7}
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
					<path d="M360 346 L346 392 L372 378 L392 398 L392 352 Z" fill={ENCRE} opacity={0.85} />
					<path d="M424 346 L438 392 L412 378 L392 398 L392 352 Z" fill={ENCRE} />
				</g>
			);

		// L'injonction de payer : une ordonnance, et le temps qui presse.
		case 'horloge':
			return (
				<g>
					<Feuille x={84} y={86} l={230} h={250}>
						<Lignes x={112} y={118} largeurs={[110, 170, 150, 160]} />
						<rect x={112} y={250} width={174} height={16} rx={8} fill={FILET} />
						<rect x={112} y={250} width={64} height={16} rx={8} fill={ENCRE} />
					</Feuille>
					<circle cx={436} cy={196} r={104} fill={PAPIER} />
					<circle cx={436} cy={196} r={104} fill="none" stroke={ENCRE} strokeWidth={8} />
					<path d="M436 196 L436 196 A84 84 0 0 1 518 214 L436 196 Z" fill={accent} />
					<path d="M436 196 L436 128" stroke={ENCRE} strokeWidth={8} strokeLinecap="round" />
					<path d="M436 196 L484 222" stroke={ENCRE} strokeWidth={8} strokeLinecap="round" />
					<circle cx={436} cy={196} r={9} fill={ENCRE} />
					<rect x={420} y={76} width={32} height={18} rx={6} fill={ENCRE} />
				</g>
			);

		// La déclaration de créance : un formulaire signé, et son enveloppe.
		case 'declaration':
			return (
				<g>
					<Feuille x={250} y={52} l={230} h={272}>
						<Lignes x={278} y={84} largeurs={[120, 170, 150]} />
						{[0, 1, 2].map((rang) => (
							<g key={rang}>
								<rect
									x={278}
									y={170 + rang * 30}
									width={16}
									height={16}
									rx={4}
									fill={rang < 2 ? ENCRE : FILET}
								/>
								<rect x={304} y={174 + rang * 30} width={130} height={9} rx={4} fill={FILET} />
							</g>
						))}
						<path
							d="M282 296 C 300 276, 316 312, 334 290 S 366 300, 384 284"
							fill="none"
							stroke={ENCRE}
							strokeWidth={4}
							strokeLinecap="round"
						/>
					</Feuille>
					<rect x={90} y={200} width={260} height={160} rx={16} fill={accent} />
					<path
						d="M90 214 L220 296 L350 214"
						fill="none"
						stroke={ENCRE}
						strokeWidth={5}
						strokeLinejoin="round"
					/>
					<path
						d="M90 352 L180 282 M350 352 L260 282"
						stroke={ENCRE}
						strokeWidth={4}
						opacity={0.35}
					/>
				</g>
			);

		// L'échéancier : une somme découpée en versements, sur une frise.
		case 'echeancier':
			return (
				<g>
					<rect x={70} y={250} width={460} height={4} rx={2} fill={ENCRE} opacity={0.3} />
					{[0, 1, 2, 3].map((rang) => {
						const cx = 110 + rang * 126;
						const regle = rang < 2;
						return (
							<g key={rang}>
								<circle cx={cx} cy={252} r={34} fill={regle ? ENCRE : PAPIER} />
								<circle cx={cx} cy={252} r={34} fill="none" stroke={ENCRE} strokeWidth={4} />
								{regle ? (
									<path
										d={`M${cx - 13} 252 L${cx - 3} 262 L${cx + 14} 242`}
										fill="none"
										stroke={PAPIER}
										strokeWidth={6}
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
								) : null}
								<rect
									x={cx - 34}
									y={304}
									width={68}
									height={10}
									rx={5}
									fill={regle ? ENCRE : FILET}
								/>
							</g>
						);
					})}
					<Feuille x={190} y={60} l={220} h={130}>
						<Lignes x={216} y={88} largeurs={[110, 160]} />
						<rect x={216} y={140} width={168} height={18} rx={9} fill={FILET} />
						<rect x={216} y={140} width={84} height={18} rx={9} fill={accent} />
					</Feuille>
				</g>
			);

		// Repérer un client en difficulté : une liste, et la loupe sur une ligne.
		case 'loupe':
			return (
				<g>
					<Feuille x={96} y={60} l={290} h={290}>
						{[0, 1, 2, 3, 4].map((rang) => {
							const y = 92 + rang * 50;
							const marque = rang === 2;
							return (
								<g key={rang}>
									{marque ? (
										<rect x={112} y={y - 10} width={258} height={42} rx={12} fill={accent} />
									) : null}
									<circle cx={140} cy={y + 11} r={12} fill={marque ? ENCRE : FILET} />
									<rect
										x={164}
										y={y + 2}
										width={120}
										height={10}
										rx={5}
										fill={marque ? ENCRE : FILET}
									/>
									<rect x={300} y={y + 2} width={54} height={10} rx={5} fill={FILET} />
								</g>
							);
						})}
					</Feuille>
					<circle cx={404} cy={214} r={66} fill={PAPIER} opacity={0.55} />
					<circle cx={404} cy={214} r={66} fill="none" stroke={ENCRE} strokeWidth={12} />
					<path d="M452 262 L516 326" stroke={ENCRE} strokeWidth={20} strokeLinecap="round" />
				</g>
			);

		// Par défaut : une facture, et son tampon.
		case 'facture':
			return (
				<g>
					<Feuille x={150} y={60} l={260} h={290}>
						<Lignes x={180} y={94} largeurs={[120, 200, 180, 190, 150]} />
						<rect x={180} y={268} width={90} height={12} rx={6} fill={FILET} />
						<rect x={300} y={262} width={80} height={22} rx={7} fill={ENCRE} />
					</Feuille>
					<circle cx={430} cy={262} r={52} fill={accent} />
					<path
						d="M408 262 L424 278 L452 246"
						fill="none"
						stroke={ENCRE}
						strokeWidth={7}
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</g>
			);
	}
}

/**
 * La couverture d'un article : la teinte de sa catégorie, un grand disque un
 * cran plus soutenu, et le motif de son sujet.
 */
export function CouvertureIllustree({
	categorie,
	illustration = 'facture',
	className
}: {
	categorie: CategorieBlog;
	illustration?: Illustration;
	className?: string;
}) {
	const { fond, accent } = PALETTE[categorie];
	return (
		<svg
			viewBox="0 0 600 400"
			preserveAspectRatio="xMidYMid slice"
			role="img"
			aria-label={`Illustration, catégorie ${categorie}`}
			className={cn('block w-full rounded-carte-site', className)}
		>
			<rect width={600} height={400} fill={fond} />
			<circle cx={520} cy={360} r={190} fill={accent} opacity={0.55} />
			<Motif illustration={illustration} accent={accent} />
		</svg>
	);
}
