import { getDocumentProxy } from 'unpdf';

/**
 * LIRE UNE FACTURE FACTUR-X : le XML qu'un PDF/A-3 embarque, et rien d'autre.
 *
 * ⚠️ LE SOCLE NE SAIT PAS QUELLE LOI IL SERT. Ce module rend des CHAÎNES telles
 * qu'elles sont écrites dans le fichier. Ce qui est un débiteur, ce qui est un
 * SIREN valide, ce qu'on refuse et pourquoi : tout ça vit dans la verticale
 * (`verticales/recouvrement/import/factureFacturX.ts`).
 *
 * ⚠️ ET C'EST TOUT L'INTÉRÊT : LES MONTANTS SONT DU TEXTE DÉCIMAL EXACT.
 * `"19172.24"` traverse ce module sans jamais devenir un flottant, et
 * `depuisEuros` en fait des centimes entiers. Le chemin modèle, lui, fait
 * passer le même montant par un `z.number()`.
 *
 * ⚠️ CE FICHIER IMPORTE `unpdf`, DONC `node:*` PAR TRANSITIVITÉ. Il ne doit être
 * importé QUE depuis un fichier Convex portant `'use node'` (c'est le cas de
 * `recouvrement/depot.ts`). Depuis le runtime par défaut, ça ne casse pas à la
 * compilation : ça casse au déploiement.
 *
 * ⚠️ AUCUNE DÉPENDANCE D'ANALYSE XML, ET C'EST DÉLIBÉRÉ. On lit quinze champs
 * d'un document au schéma rigide ; `fast-xml-parser` apporterait plus d'un méga-
 * octet et six dépendances transitives sur un chemin qui produit des sommes
 * réclamées à des tiers.
 */

const URI_CII = 'urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100';
const URI_RAM =
	'urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100';
const URI_UDT = 'urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100';

/**
 * Les noms de fichier admis, du plus récent au plus ancien.
 *
 * La norme impose `factur-x.xml` ; `zugferd-invoice.xml` est l'ancien nom
 * allemand, encore produit par des logiciels installés, et `xrechnung.xml`
 * apparaît sur des factures venues d'Allemagne.
 */
const NOMS_ADMIS = /^(factur-x|zugferd-invoice|xrechnung)\.xml$/i;

export interface ChampsFacturX {
	readonly profil?: string;
	readonly numero?: string;
	readonly typeCode?: string;
	readonly dateEmission?: string;
	readonly formatDateEmission?: string;
	readonly dateEcheance?: string;
	readonly formatDateEcheance?: string;
	readonly devise?: string;
	readonly totalTTC?: string;
	readonly netAPayer?: string;
	readonly acompte?: string;
	readonly acheteurNom?: string;
	readonly acheteurIdLegal?: string;
	readonly vendeurNom?: string;
	readonly vendeurIdLegal?: string;
}

interface Element {
	readonly chemin: string;
	readonly texte: string;
	readonly attributs: Readonly<Record<string, string>>;
}

/** `&amp;` et ses semblables, plus les entités numériques. */
function decoder(texte: string): string {
	return texte.replace(/&(#x?[0-9a-fA-F]+|amp|lt|gt|quot|apos);/g, (entier, corps: string) => {
		if (corps === 'amp') return '&';
		if (corps === 'lt') return '<';
		if (corps === 'gt') return '>';
		if (corps === 'quot') return '"';
		if (corps === 'apos') return "'";
		const point = corps.startsWith('#x')
			? Number.parseInt(corps.slice(2), 16)
			: Number.parseInt(corps.slice(1), 10);
		return Number.isFinite(point) ? String.fromCodePoint(point) : entier;
	});
}

/**
 * L'alias canonique d'un espace de noms.
 *
 * ⚠️ LES PRÉFIXES SE RÉSOLVENT PAR URI, JAMAIS PAR CONVENTION. `rsm`, `ram` et
 * `udt` sont d'usage, pas normatifs : un producteur conforme peut écrire `a:`
 * et `b:`. Un URI inconnu se rend tel quel, ce qui écarte naturellement les
 * documents d'un autre schéma — ZUGFeRD 1.0 en est un.
 */
function alias(uri: string | undefined): string {
	if (uri === URI_CII) return 'rsm';
	if (uri === URI_RAM) return 'ram';
	if (uri === URI_UDT) return 'udt';
	return uri ?? '';
}

interface Cadre {
	readonly chemin: string;
	readonly prefixes: Map<string, string>;
	readonly attributs: Readonly<Record<string, string>>;
	texte: string;
}

/**
 * Les éléments du document, chacun avec son chemin canonique et ses attributs.
 *
 * ⚠️ C'EST LE CHEMIN QUI COMPTE, PAS LE NOM. `ram:ID` apparaît sur une dizaine
 * d'éléments — le numéro de la facture, le SIREN du vendeur, celui de
 * l'acheteur, le profil — et `ram:Name` sur les parties comme sur les produits.
 * Un lecteur qui chercherait par nom rendrait le premier venu.
 *
 * Un élément est rendu à sa FERMETURE : c'est le seul moment où son texte est
 * complet. Un document tronqué ne rend donc que ce qui s'est refermé, et ses
 * miettes ne composent aucun chemin utile.
 */
function* elements(xml: string): Generator<Element> {
	const sansBom = xml.charCodeAt(0) === 0xfeff ? xml.slice(1) : xml;
	const pile: Cadre[] = [];
	let i = 0;

	const ajouterTexte = (morceau: string) => {
		const cadre = pile[pile.length - 1];
		if (cadre !== undefined) cadre.texte += morceau;
	};

	while (i < sansBom.length) {
		const ouvre = sansBom.indexOf('<', i);
		if (ouvre === -1) break;
		ajouterTexte(decoder(sansBom.slice(i, ouvre)));

		if (sansBom.startsWith('<!--', ouvre)) {
			const fin = sansBom.indexOf('-->', ouvre);
			if (fin === -1) break;
			i = fin + 3;
			continue;
		}
		if (sansBom.startsWith('<![CDATA[', ouvre)) {
			const fin = sansBom.indexOf(']]>', ouvre);
			if (fin === -1) break;
			// Le contenu d'une section littérale ne se décode PAS : c'est ce qu'elle
			// veut dire. Un « &amp; » y reste « &amp; ».
			ajouterTexte(sansBom.slice(ouvre + 9, fin));
			i = fin + 3;
			continue;
		}
		if (sansBom.startsWith('<?', ouvre) || sansBom.startsWith('<!', ouvre)) {
			const fin = sansBom.indexOf('>', ouvre);
			if (fin === -1) break;
			i = fin + 1;
			continue;
		}

		// La fin de balise se cherche EN RESPECTANT LES GUILLEMETS : un attribut
		// peut contenir un `>`, et découper naïvement dessus casse le document.
		let ferme = ouvre + 1;
		let guillemet: string | null = null;
		while (ferme < sansBom.length) {
			const c = sansBom[ferme];
			if (guillemet !== null) {
				if (c === guillemet) guillemet = null;
			} else if (c === '"' || c === "'") guillemet = c;
			else if (c === '>') break;
			ferme++;
		}
		if (ferme >= sansBom.length) break;
		const brut = sansBom.slice(ouvre + 1, ferme);
		i = ferme + 1;

		if (brut.startsWith('/')) {
			const cadre = pile.pop();
			if (cadre !== undefined) {
				yield { chemin: cadre.chemin, texte: cadre.texte.trim(), attributs: cadre.attributs };
			}
			continue;
		}

		const autoFermante = brut.endsWith('/');
		const corps = autoFermante ? brut.slice(0, -1) : brut;
		const nom = corps.split(/[\s/]/)[0] ?? '';
		const attributs: Record<string, string> = {};
		const prefixes = new Map(pile[pile.length - 1]?.prefixes ?? []);

		for (const trouve of corps
			.slice(nom.length)
			.matchAll(/([\w:.-]+)\s*=\s*("([^"]*)"|'([^']*)')/g)) {
			const cle = trouve[1] ?? '';
			const valeur = decoder(trouve[3] ?? trouve[4] ?? '');
			// ⚠️ LES DÉCLARATIONS D'ESPACE DE NOMS SE LISENT AVANT LE NOM DE
			// L'ÉLÉMENT QUI LES PORTE. La racine déclare les siennes sur elle-même :
			// les traiter après la rendrait inconnue de son propre document.
			if (cle.startsWith('xmlns:')) prefixes.set(cle.slice(6), valeur);
			else if (cle === 'xmlns') prefixes.set('', valeur);
			else attributs[cle] = valeur;
		}

		const deuxPoints = nom.indexOf(':');
		const prefixe = deuxPoints === -1 ? '' : nom.slice(0, deuxPoints);
		const local = deuxPoints === -1 ? nom : nom.slice(deuxPoints + 1);
		const parent = pile[pile.length - 1];
		const chemin = `${parent === undefined ? '' : `${parent.chemin}/`}${alias(prefixes.get(prefixe))}:${local}`;

		if (autoFermante) {
			yield { chemin, texte: '', attributs };
		} else {
			pile.push({ chemin, prefixes, attributs, texte: '' });
		}
	}
}

const CHEMINS = {
	profil:
		'rsm:CrossIndustryInvoice/rsm:ExchangedDocumentContext/ram:GuidelineSpecifiedDocumentContextParameter/ram:ID',
	numero: 'rsm:CrossIndustryInvoice/rsm:ExchangedDocument/ram:ID',
	typeCode: 'rsm:CrossIndustryInvoice/rsm:ExchangedDocument/ram:TypeCode',
	dateEmission:
		'rsm:CrossIndustryInvoice/rsm:ExchangedDocument/ram:IssueDateTime/udt:DateTimeString',
	/**
	 * ⚠️ L'ÉCHÉANCE EST SOUS `SpecifiedTradePaymentTerms`, ET NULLE PART AILLEURS.
	 * Le chemin `SpecifiedTradeSettlementPaymentMeans/DueDateDateTime` circule sur
	 * le web ; il n'existe pas dans le schéma. Le lire ferait manquer l'échéance
	 * sur les fichiers conformes et en inventerait une sur les autres.
	 */
	dateEcheance:
		'rsm:CrossIndustryInvoice/rsm:SupplyChainTradeTransaction/ram:ApplicableHeaderTradeSettlement/ram:SpecifiedTradePaymentTerms/ram:DueDateDateTime/udt:DateTimeString',
	devise:
		'rsm:CrossIndustryInvoice/rsm:SupplyChainTradeTransaction/ram:ApplicableHeaderTradeSettlement/ram:InvoiceCurrencyCode',
	totalTTC:
		'rsm:CrossIndustryInvoice/rsm:SupplyChainTradeTransaction/ram:ApplicableHeaderTradeSettlement/ram:SpecifiedTradeSettlementHeaderMonetarySummation/ram:GrandTotalAmount',
	netAPayer:
		'rsm:CrossIndustryInvoice/rsm:SupplyChainTradeTransaction/ram:ApplicableHeaderTradeSettlement/ram:SpecifiedTradeSettlementHeaderMonetarySummation/ram:DuePayableAmount',
	acompte:
		'rsm:CrossIndustryInvoice/rsm:SupplyChainTradeTransaction/ram:ApplicableHeaderTradeSettlement/ram:SpecifiedTradeSettlementHeaderMonetarySummation/ram:TotalPrepaidAmount',
	acheteurNom:
		'rsm:CrossIndustryInvoice/rsm:SupplyChainTradeTransaction/ram:ApplicableHeaderTradeAgreement/ram:BuyerTradeParty/ram:Name',
	acheteurIdLegal:
		'rsm:CrossIndustryInvoice/rsm:SupplyChainTradeTransaction/ram:ApplicableHeaderTradeAgreement/ram:BuyerTradeParty/ram:SpecifiedLegalOrganization/ram:ID',
	vendeurNom:
		'rsm:CrossIndustryInvoice/rsm:SupplyChainTradeTransaction/ram:ApplicableHeaderTradeAgreement/ram:SellerTradeParty/ram:Name',
	vendeurIdLegal:
		'rsm:CrossIndustryInvoice/rsm:SupplyChainTradeTransaction/ram:ApplicableHeaderTradeAgreement/ram:SellerTradeParty/ram:SpecifiedLegalOrganization/ram:ID'
} as const;

/**
 * ⚠️ PREMIÈRE OCCURRENCE RETENUE. En EXTENDED, certains blocs peuvent se
 * répéter ; prendre la première et s'y tenir vaut mieux qu'un choix implicite
 * qui changerait selon l'ordre du fichier.
 *
 * ⚠️ `null` VEUT DIRE « PAS DE FACTUR-X LISIBLE ICI », donc une donnée ABSENTE.
 * Un Factur-X présent mais fautif — un avoir, une devise étrangère, une date qui
 * n'existe pas — n'est PAS `null` : il ressort avec ses champs, et c'est la
 * verticale qui le refuse en le nommant.
 */
export function lireFacturXDuXml(xml: string): ChampsFacturX | null {
	const premiers = new Map<string, Element>();
	try {
		for (const element of elements(xml)) {
			if (!premiers.has(element.chemin)) premiers.set(element.chemin, element);
		}
	} catch {
		return null;
	}

	// Ni racine CII, ni numéro : ce n'est pas un Factur-X lisible (ZUGFeRD 1.0
	// porte un schéma entièrement différent). On le traite comme ABSENT.
	const numero = premiers.get(CHEMINS.numero);
	if (numero === undefined || numero.texte === '') return null;

	const texte = (chemin: string): string | undefined => {
		const valeur = premiers.get(chemin)?.texte;
		return valeur === undefined || valeur === '' ? undefined : valeur;
	};
	const attribut = (chemin: string, nom: string): string | undefined =>
		premiers.get(chemin)?.attributs[nom];

	return {
		profil: texte(CHEMINS.profil),
		numero: numero.texte,
		typeCode: texte(CHEMINS.typeCode),
		dateEmission: texte(CHEMINS.dateEmission),
		formatDateEmission: attribut(CHEMINS.dateEmission, 'format'),
		dateEcheance: texte(CHEMINS.dateEcheance),
		formatDateEcheance: attribut(CHEMINS.dateEcheance, 'format'),
		devise: texte(CHEMINS.devise),
		totalTTC: texte(CHEMINS.totalTTC),
		netAPayer: texte(CHEMINS.netAPayer),
		acompte: texte(CHEMINS.acompte),
		acheteurNom: texte(CHEMINS.acheteurNom),
		acheteurIdLegal: texte(CHEMINS.acheteurIdLegal),
		vendeurNom: texte(CHEMINS.vendeurNom),
		vendeurIdLegal: texte(CHEMINS.vendeurIdLegal)
	};
}

/**
 * Le XML d'un PDF Factur-X, ou `null` si le PDF n'en porte pas.
 *
 * ⚠️ `null` VEUT DIRE « PAS DE FACTUR-X ICI », c'est-à-dire une donnée ABSENTE,
 * et l'appelant retombe légitimement sur le modèle. Un PDF illisible n'est pas
 * un Factur-X fautif : le chemin modèle prend le relais et dira, lui, ce qu'il
 * n'a pas pu lire.
 *
 * ⚠️ LE CONTENU D'UNE PIÈCE JOINTE PEUT ÊTRE DIFFÉRÉ. `getAttachments()` rend
 * des métadonnées dont le `content` est parfois absent ; il se demande alors par
 * sa clé. Supposer qu'il est toujours là ferait rendre `null` sur des fichiers
 * parfaitement conformes, et le produit retomberait silencieusement sur le
 * modèle en croyant qu'il n'y avait rien à lire.
 */
export async function lireFacturXDuPdf(octets: Uint8Array): Promise<ChampsFacturX | null> {
	try {
		const pdf = await getDocumentProxy(octets);
		try {
			const pieces = await pdf.getAttachments();
			if (pieces === null) return null;

			for (const [cle, piece] of pieces) {
				if (!NOMS_ADMIS.test(piece.filename)) continue;
				const contenu = piece.content ?? (await pdf.getAttachmentContent(cle));
				if (contenu === null || contenu === undefined) continue;
				const lu = lireFacturXDuXml(new TextDecoder('utf-8').decode(contenu));
				if (lu !== null) return lu;
			}
			return null;
		} finally {
			await pdf.loadingTask?.destroy();
		}
	} catch {
		return null;
	}
}
