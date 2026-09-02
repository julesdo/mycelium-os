import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FAMILLES, type Famille } from '../../ui/format';
import { COULEURS_IMPRESSION as C } from '../../ui/couleurs-impression';
import { empreinteLisible } from '../../lib/verticales/egalim/empreinte';

/**
 * Le diagnostic EGalim, en document imprimable.
 *
 * POURQUOI PAS `window.print()`. La commande d'impression du navigateur imprime
 * l'APPLICATION : la barre de navigation, les boutons, ce que la feuille de
 * style d'écran laisse passer, plus l'en-tête que le navigateur ajoute
 * lui-même — « localhost:20173 » et la date du jour, en haut de chaque page. Le
 * résultat n'est pas un document, c'est une capture. Or ce fichier est ce
 * qu'un gérant transmet à son directeur et présente en cas de contrôle : c'est
 * le seul artefact du produit qui sorte de l'écran.
 *
 * POURQUOI jsPDF ET PAS pdfmake. Les deux étaient installés, aucun n'était
 * utilisé. pdfmake 0.3 est une réécriture dont l'API Node ne fonctionne pas en
 * l'état — `createPdfKitDocument` rend une promesse et exige un résolveur
 * d'URL non fourni. Un document réglementaire ne se construit pas sur une
 * bibliothèque qu'on n'arrive pas à faire tourner hors du navigateur : c'est
 * précisément hors du navigateur qu'on le teste.
 *
 * CE QUI EST TESTÉ, DU COUP, C'EST LE PDF LUI-MÊME. Le test rend le document,
 * en réextrait le texte, et vérifie que les mentions obligatoires et les trois
 * taux y sont. Pas la description du document : le document. C'est ce
 * qu'aucune impression navigateur n'aurait permis de vérifier.
 *
 * LES COULEURS SONT CELLES DE L'APPLICATION, converties depuis les mêmes
 * tokens OKLCH. Un diagnostic dont le vert n'est pas le vert de l'écran fait
 * douter le lecteur des deux. La règle des couleurs réservées vaut ici aussi :
 * vert, ambre et rouge ne disent que le franchissement d'un seuil.
 */


export interface DiagnosticImprimable {
	organizationName: string;
	siret: string | null;
	periodStart: string;
	periodEnd: string;
	computedAt: number;
	classifierVersion: string;
	statut: 'DRAFT' | 'DELIVERED';
	ratios: {
		durable: number;
		bio: number;
		meatFishDurable: number;
		totalFoodHT: number;
		totalHT: number;
	};
	seuils: { durable: number; bio: number; viandePoissonDurable: number };
	gapEuros: { toDurable50: number; toBio20: number; toMeatFish60: number };
	montantNonMesureHT: number;
	byFamily: ReadonlyArray<{ family: string; totalHT: number; durableHT: number; bioHT: number }>;
	bySupplier: ReadonlyArray<{ supplierName: string; totalHT: number; durableHT: number }>;
	ouBasculer: ReadonlyArray<{
		family: string;
		montantNonDurableHT: number;
		pointsSiTotalementBascule: number;
	}>;
	attestations: ReadonlyArray<{
		supplierName: string;
		amountAtStake: number;
		pointsRecuperables: number;
		status: string;
	}>;
	/** Les mentions légales, telles que `mentions.ts` les rédige. Jamais réécrites ici. */
	mentions: readonly string[];
	/** L'empreinte de la mesure. Imprimée signée ou non : c'est elle qui identifie le bilan. */
	empreinte: string;
	/** La signature apposée, quand il y en a une. */
	signature: {
		nom: string;
		fonction: string;
		email: string;
		signeLe: number;
		mention: string;
		portee: string;
		/** Le tracé manuscrit en PNG (data URL). */
		trace: string | null;
	} | null;
}

const EUROS = new Intl.NumberFormat('fr-FR', {
	style: 'currency',
	currency: 'EUR',
	maximumFractionDigits: 0
});
const POURCENT = new Intl.NumberFormat('fr-FR', { style: 'percent', maximumFractionDigits: 0 });
const DATE_LONGUE = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' });

/**
 * Les espaces fines insécables d'`Intl` deviennent des espaces ordinaires.
 *
 * `Intl` en français sépare le nombre de son symbole par U+202F. Les polices
 * standard d'un PDF (WinAnsi) ne connaissent pas ce caractère : il ressort en
 * glyphe manquant, ou en carré, au milieu de « 39 % ». Sur le seul document du
 * produit qui sorte de l'écran, un carré dans un taux est impardonnable.
 */
/** Espace fine insecable, espace insecable, espace fine. Ecrites par leur code
 *  point : posees telles quelles dans le source, elles y sont invisibles — et
 *  le lint les refuse, a juste titre. */
const ESPACES_TYPOGRAPHIQUES = [0x202f, 0x00a0, 0x2009].map((c) => String.fromCharCode(c));

const ascii = (s: string) =>
	ESPACES_TYPOGRAPHIQUES.reduce((texte, espace) => texte.split(espace).join(String.fromCharCode(32)), s);

const euros = (n: number) => ascii(EUROS.format(n));
const pourcent = (n: number) => ascii(POURCENT.format(n));

function jour(iso: string): string {
	// Midi plutôt que minuit : une date construite à minuit UTC recule d'un jour
	// dans les fuseaux négatifs, et un diagnostic portant sur l'exercice clos au
	// 31 décembre finirait imprimé « 30 décembre ».
	return DATE_LONGUE.format(new Date(`${iso}T12:00:00`));
}

type Etat = 'atteint' | 'proche' | 'manque';

function etatDe(mesure: number, seuil: number): Etat {
	if (mesure >= seuil) return 'atteint';
	return seuil - mesure <= 0.05 ? 'proche' : 'manque';
}

const COULEUR: Record<Etat, string> = { atteint: C.atteint, proche: C.proche, manque: C.manque };
const FOND: Record<Etat, string> = {
	atteint: C.atteintFond,
	proche: C.procheFond,
	manque: C.manqueFond
};

/* Géométrie d'une page A4, en points. */
const PAGE_L = 595.28;
const PAGE_H = 841.89;
const MARGE = 40;
const UTILE = PAGE_L - MARGE * 2;
const HAUT = 62;
const BAS = PAGE_H - 44;

export function nomFichier(d: DiagnosticImprimable): string {
	const etablissement = d.organizationName
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^A-Za-z0-9]+/g, '-')
		.replace(/^-|-$/g, '')
		.toLowerCase();
	return `diagnostic-egalim-${d.periodStart.slice(0, 4)}-${etablissement || 'etablissement'}.pdf`;
}

/**
 * Construit le document. Ne le télécharge pas, ne l'ouvre pas : il le rend.
 *
 * C'est cette séparation qui permet au test de le rendre en Node et d'en
 * réextraire le texte.
 */
export function construireDiagnostic(d: DiagnosticImprimable): jsPDF {
	const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
	const annee = d.periodStart.slice(0, 4);
	const dateMesure = DATE_LONGUE.format(new Date(d.computedAt));

	doc.setProperties({
		title: `Diagnostic EGalim ${annee} - ${d.organizationName}`,
		author: 'Letikette',
		subject: `Mesure des taux EGalim de l'exercice ${annee}`
	});

	let y = HAUT;

	/** Réserve `hauteur` points ; ouvre une page si le bas est atteint. */
	const place = (hauteur: number) => {
		if (y + hauteur > BAS) {
			doc.addPage();
			y = HAUT;
		}
	};

	const texte = (
		contenu: string,
		taille: number,
		couleur: string,
		options: { gras?: boolean; x?: number; align?: 'left' | 'right' } = {}
	) => {
		doc.setFont('helvetica', options.gras ? 'bold' : 'normal');
		doc.setFontSize(taille);
		doc.setTextColor(couleur);
		doc.text(ascii(contenu), options.x ?? MARGE, y, { align: options.align ?? 'left' });
	};

	// ── En-tête du document ────────────────────────────────────────────────
	texte(`Diagnostic EGalim ${annee}`, 20, C.texte, { gras: true });
	texte(d.statut === 'DELIVERED' ? 'Mesure remise' : 'Brouillon', 8, C.encre, {
		gras: true,
		x: PAGE_L - MARGE,
		align: 'right'
	});
	y += 14;
	texte(d.organizationName, 11, C.doux);
	texte(`Mesuré le ${dateMesure}`, 8, C.tresDoux, { x: PAGE_L - MARGE, align: 'right' });
	y += 18;

	// ── Bandeau d'identité ────────────────────────────────────────────────
	// Ce qu'un contrôleur vérifie en premier : de quel établissement parle ce
	// document, sur quelle période, pour quel montant d'achats.
	doc.setFillColor(C.creux);
	doc.roundedRect(MARGE, y, UTILE, 42, 4, 4, 'F');
	const colonnes: Array<[string, string, boolean]> = [
		['SIRET', d.siret ?? 'non renseigné', d.siret !== null],
		['PERIODE MESUREE', `du ${jour(d.periodStart)} au ${jour(d.periodEnd)}`, true],
		['ACHATS ALIMENTAIRES HT', euros(d.ratios.totalFoodHT), true]
	];
	colonnes.forEach(([titre, valeur, renseigne], i) => {
		const x = MARGE + 12 + i * (UTILE / 3);
		doc.setFont('helvetica', 'bold');
		doc.setFontSize(6.5);
		doc.setTextColor(C.tresDoux);
		doc.text(titre, x, y + 15);
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(9);
		doc.setTextColor(renseigne ? C.texte : C.tresDoux);
		doc.text(ascii(valeur), x, y + 29, { maxWidth: UTILE / 3 - 16 });
	});
	y += 62;

	// ── Les trois taux ────────────────────────────────────────────────────
	const largeurColonne = (UTILE - 24) / 3;
	const largeurBarre = largeurColonne - 12;
	const taux: Array<[string, number, number, number]> = [
		['DURABLE ET DE QUALITE', d.ratios.durable, d.seuils.durable, d.gapEuros.toDurable50],
		['BIOLOGIQUE', d.ratios.bio, d.seuils.bio, d.gapEuros.toBio20],
		[
			'VIANDE ET POISSON',
			d.ratios.meatFishDurable,
			d.seuils.viandePoissonDurable,
			d.gapEuros.toMeatFish60
		]
	];

	taux.forEach(([titre, mesure, seuil, ecart], i) => {
		const x = MARGE + i * (largeurColonne + 12);
		const etat = etatDe(mesure, seuil);
		// Le rail s'étend jusqu'au plus grand de 100 % et de la mesure : un avoir
		// mal classé peut produire un taux au-dessus de 100, et la barre ne doit
		// pas sortir de son cadre.
		const plafond = Math.max(1, mesure);

		doc.setFont('helvetica', 'bold');
		doc.setFontSize(7.5);
		doc.setTextColor(C.doux);
		doc.text(titre, x, y);

		doc.setFontSize(30);
		doc.setTextColor(COULEUR[etat]);
		doc.text(pourcent(mesure), x, y + 30);

		// La jauge : un rail, un remplissage, et le repère du seuil. Le repère est
		// ce qui compte — sans lui, une barre à 39 % ne dit pas si l'objectif est
		// 20 ou 60.
		doc.setFillColor(FOND[etat]);
		doc.roundedRect(x, y + 40, largeurBarre, 6, 3, 3, 'F');
		doc.setFillColor(COULEUR[etat]);
		doc.roundedRect(
			x,
			y + 40,
			Math.max(3, largeurBarre * Math.min(1, mesure / plafond)),
			6,
			3,
			3,
			'F'
		);
		doc.setFillColor(C.texte);
		doc.rect(x + largeurBarre * (seuil / plafond), y + 38, 1.2, 10, 'F');

		doc.setFont('helvetica', 'normal');
		doc.setFontSize(8);
		doc.setTextColor(C.doux);
		const phrase =
			etat === 'atteint'
				? `Seuil de ${pourcent(seuil)} franchi.`
				: `Seuil de ${pourcent(seuil)}. Il manque ${euros(ecart)} d'achats qualifiants.`;
		doc.text(doc.splitTextToSize(ascii(phrase), largeurBarre), x, y + 60);
	});
	y += 96;

	// ── Ce que la mesure ne couvre pas ────────────────────────────────────
	// Écrit AVANT les tableaux, jamais en note de bas de page. Un rapport qui
	// affiche trois taux puis mentionne discrètement qu'il en manque une part
	// n'a pas prévenu : il s'est couvert.
	if (d.montantNonMesureHT > 0) {
		const message = `${euros(d.montantNonMesureHT)} d'achats n'ont pas pu etre classes et ne comptent dans aucun des trois taux. Les classer releverait les trois chiffres.`;
		const lignes = doc.splitTextToSize(message, UTILE - 24) as string[];
		const hauteur = 16 + lignes.length * 11;
		place(hauteur + 12);
		doc.setFillColor(C.procheFond);
		doc.roundedRect(MARGE, y, UTILE, hauteur, 4, 4, 'F');
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(8.5);
		doc.setTextColor(C.texte);
		doc.text(lignes, MARGE + 12, y + 14);
		y += hauteur + 18;
	}

	/** Un titre de section, avec sa légende facultative. */
	const section = (titre: string, legende?: string) => {
		place(legende ? 48 : 30);
		texte(titre, 12, C.texte, { gras: true });
		y += 12;
		if (legende) {
			doc.setFont('helvetica', 'normal');
			doc.setFontSize(8);
			doc.setTextColor(C.doux);
			const lignes = doc.splitTextToSize(ascii(legende), UTILE) as string[];
			doc.text(lignes, MARGE, y);
			y += lignes.length * 10;
		}
		y += 4;
	};

	/** Un tableau : filets horizontaux, en-tête répété, rien d'autre. */
	const table = (
		head: string[],
		body: string[][],
		largeurs: Record<number, number>,
		accent?: number
	) => {
		autoTable(doc, {
			head: [head],
			body,
			startY: y,
			margin: { left: MARGE, right: MARGE, top: HAUT, bottom: PAGE_H - BAS },
			theme: 'plain',
			styles: { font: 'helvetica', fontSize: 9, textColor: C.texte, cellPadding: 5 },
			headStyles: {
				fontSize: 7,
				fontStyle: 'bold',
				textColor: C.tresDoux,
				lineWidth: { bottom: 0.5 },
				lineColor: C.filet
			},
			bodyStyles: { lineWidth: { bottom: 0.5 }, lineColor: C.filet },
			columnStyles: Object.fromEntries(
				Object.entries(largeurs).map(([i, w]) => [
					i,
					{
						cellWidth: w,
						halign: Number(i) === 0 ? ('left' as const) : ('right' as const),
						...(Number(i) === accent
							? { textColor: C.encre, fontStyle: 'bold' as const }
							: {})
					}
				])
			)
		});
		// `lastAutoTable` est la seule façon de savoir où le tableau s'est arrêté,
		// y compris après un saut de page décidé par la bibliothèque.
		y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;
	};

	if (d.ouBasculer.length > 0) {
		section(
			'Ou combler l ecart'.replace('l ecart', "l'ecart"),
			"Le gain indique est un majorant : ce que rapporterait le basculement de la famille entiere. Il sert a classer les familles entre elles, pas a promettre un resultat."
		);
		table(
			['FAMILLE', 'ACHATS NON DURABLES', 'GAIN MAXIMAL'],
			d.ouBasculer.map((o) => [
				FAMILLES[o.family as Famille] ?? o.family,
				euros(o.montantNonDurableHT),
				`+${Math.round(o.pointsSiTotalementBascule)} pts`
			]),
			{ 0: UTILE - 220, 1: 130, 2: 90 },
			2
		);
	}

	if (d.byFamily.length > 0) {
		section('Par famille de produits');
		table(
			['FAMILLE', 'ACHATS HT', 'DONT DURABLE', 'DONT BIO', 'PART DURABLE'],
			d.byFamily.map((f) => [
				FAMILLES[f.family as Famille] ?? f.family,
				euros(f.totalHT),
				euros(f.durableHT),
				euros(f.bioHT),
				f.totalHT > 0 ? pourcent(f.durableHT / f.totalHT) : '—'
			]),
			{ 0: UTILE - 300, 1: 80, 2: 80, 3: 70, 4: 70 }
		);
	}

	if (d.bySupplier.length > 0) {
		section('Par fournisseur');
		table(
			['FOURNISSEUR', 'ACHATS HT', 'DONT DURABLE', 'PART DURABLE'],
			d.bySupplier.map((s) => [
				s.supplierName,
				euros(s.totalHT),
				euros(s.durableHT),
				s.totalHT > 0 ? pourcent(s.durableHT / s.totalHT) : '—'
			]),
			{ 0: UTILE - 260, 1: 90, 2: 90, 3: 80 }
		);
	}

	if (d.attestations.length > 0) {
		section(
			'Justificatifs a obtenir',
			"Ces achats portent une mention qualifiante que la facture n'atteste pas. Une attestation du fournisseur les rend defendables en controle."
		);
		table(
			['FOURNISSEUR', 'MONTANT EN JEU', 'GAIN', 'ETAT'],
			d.attestations.map((a) => [
				a.supplierName,
				euros(a.amountAtStake),
				`+${a.pointsRecuperables.toFixed(1)} pts`,
				a.status === 'RECEIVED'
					? 'Recue'
					: a.status === 'SENT'
						? 'Demandee'
						: a.status === 'REFUSED'
							? 'Refusee'
							: 'A demander'
			]),
			{ 0: UTILE - 250, 1: 100, 2: 70, 3: 80 }
		);
	}

	// ── La signature ──────────────────────────────────────────────────────
	// Elle vient AVANT les mentions légales et après les tableaux : c'est le
	// dernier acte du document, et c'est ce qu'un lecteur cherche en premier
	// quand on lui tend un rapport en lui demandant s'il est validé.
	if (d.signature) {
		const sig = d.signature;
		const dateSignature = DATE_LONGUE.format(new Date(sig.signeLe));
		const mention = doc.splitTextToSize(ascii(sig.mention), UTILE - 24) as string[];
		const portee = doc.splitTextToSize(ascii(sig.portee), UTILE - 24) as string[];
		const hauteur = 118 + mention.length * 10 + portee.length * 9;

		place(hauteur + 12);
		doc.setDrawColor(C.filet);
		doc.setLineWidth(0.5);
		doc.roundedRect(MARGE, y, UTILE, hauteur, 4, 4, 'S');

		let cy = y + 20;
		doc.setFont('helvetica', 'bold');
		doc.setFontSize(11);
		doc.setTextColor(C.texte);
		doc.text('Bilan signe', MARGE + 12, cy);

		cy += 16;
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(9);
		doc.text(ascii(`${sig.nom} — ${sig.fonction}`), MARGE + 12, cy);
		cy += 12;
		doc.setFontSize(8);
		doc.setTextColor(C.doux);
		doc.text(ascii(`${sig.email} · le ${dateSignature}`), MARGE + 12, cy);

		// Le tracé, à droite du bloc. S'il manque, la signature reste valable :
		// ce n'est pas lui qui prouve, c'est la piste d'audit.
		if (sig.trace) {
			try {
				doc.addImage(sig.trace, 'PNG', PAGE_L - MARGE - 150, y + 12, 138, 52);
			} catch {
				// Un tracé illisible ne doit jamais empêcher le bilan de sortir.
			}
		}

		cy += 16;
		doc.setFontSize(8.5);
		doc.setTextColor(C.texte);
		doc.text(mention, MARGE + 12, cy);
		cy += mention.length * 10 + 8;

		doc.setFontSize(7);
		doc.setTextColor(C.tresDoux);
		doc.text('EMPREINTE DE LA MESURE SIGNEE', MARGE + 12, cy);
		cy += 10;
		doc.setFontSize(7.5);
		doc.setTextColor(C.doux);
		doc.text(empreinteLisible(d.empreinte), MARGE + 12, cy, { maxWidth: UTILE - 24 });
		cy += 14;

		doc.setFontSize(7);
		doc.text(portee, MARGE + 12, cy);

		y += hauteur + 18;
	} else {
		// NON SIGNÉ, et on le dit. Un bilan qui ne porte aucune mention de
		// signature laisse croire qu'il n'en avait pas besoin ; celui-ci dit ce
		// qui lui manque, ce qui est aussi une information pour son lecteur.
		place(46);
		doc.setDrawColor(C.filet);
		doc.setLineWidth(0.5);
		doc.roundedRect(MARGE, y, UTILE, 38, 4, 4, 'S');
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(8.5);
		doc.setTextColor(C.doux);
		doc.text('Ce bilan n a pas ete signe.'.replace('n a', "n'a"), MARGE + 12, y + 16);
		doc.setFontSize(7);
		doc.setTextColor(C.tresDoux);
		doc.text(`Empreinte de la mesure : ${empreinteLisible(d.empreinte)}`, MARGE + 12, y + 28, {
			maxWidth: UTILE - 24
		});
		y += 56;
	}

	// ── Les mentions obligatoires ─────────────────────────────────────────
	// Elles arrivent telles que `mentions.ts` les rédige. Les réécrire ici
	// serait le geste qui a fait disparaître une ligne rouge la dernière fois :
	// une phrase de gabarit se modifie sans revue.
	const blocs = d.mentions.map((m) => doc.splitTextToSize(ascii(m), UTILE) as string[]);
	place(12 + blocs.reduce((s, b) => s + b.length * 10 + 6, 0));
	doc.setDrawColor(C.filet);
	doc.setLineWidth(0.5);
	doc.line(MARGE, y, PAGE_L - MARGE, y);
	y += 14;
	doc.setFont('helvetica', 'normal');
	doc.setFontSize(7.5);
	doc.setTextColor(C.doux);
	for (const lignes of blocs) {
		doc.text(lignes, MARGE, y);
		y += lignes.length * 10 + 6;
	}

	// ── En-têtes et pieds, posés en dernier ───────────────────────────────
	// Le nombre total de pages n'est connu qu'ici : les écrire au fil de l'eau
	// imprimerait « page 1 / 1 » sur un document de quatre pages.
	const total = doc.getNumberOfPages();
	for (let page = 1; page <= total; page++) {
		doc.setPage(page);
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(7.5);
		doc.setTextColor(C.tresDoux);
		doc.text(ascii(d.organizationName), MARGE, 30);
		doc.text(`Diagnostic EGalim ${annee}`, PAGE_L - MARGE, 30, { align: 'right' });
		doc.setDrawColor(C.filet);
		doc.setLineWidth(0.5);
		doc.line(MARGE, 38, PAGE_L - MARGE, 38);

		doc.setFontSize(7);
		doc.text(
			ascii(`Mesure figee au ${dateMesure} - bareme version ${d.classifierVersion}`),
			MARGE,
			PAGE_H - 26
		);
		doc.text(`${page} / ${total}`, PAGE_L - MARGE, PAGE_H - 26, { align: 'right' });
	}

	return doc;
}
