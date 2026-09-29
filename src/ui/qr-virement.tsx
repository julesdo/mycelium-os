import qrcode from 'qrcode-generator';

/**
 * LE QR D'UN VIREMENT, EN SVG.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ EN SVG ET PAS EN CANEVAS, POUR TROIS RAISONS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Cette page se lit sur un téléphone, mais elle s'IMPRIME aussi : un créancier
 * peut joindre la page à sa lettre. Un canevas imprime en 96 points par pouce
 * et devient illisible ; un SVG reste net à n'importe quelle taille. Il se rend
 * en outre côté serveur, sans attendre le premier rendu du navigateur, et il ne
 * demande aucune référence sur un nœud du DOM.
 *
 * ⚠️ CORRECTION D'ERREUR « M », ET C'EST LA NORME QUI LE DIT. EPC069-12 exige
 * le niveau M : plus bas, un QR froissé ou mal éclairé cesse d'être lu ; plus
 * haut, la trame se densifie sans qu'aucune application bancaire l'exige.
 *
 * ⚠️ LA MARGE BLANCHE FAIT QUATRE MODULES, et ce n'est pas de l'esthétique.
 * Sans elle — la « zone de silence » de la norme ISO 18004 — un lecteur ne
 * trouve pas les bords du symbole, et le scan échoue sur un fond sombre.
 *
 * ⚠️ AUCUN TEXTE, AUCUN LOGO AU CENTRE. Un logo incrusté mange des modules de
 * données : la correction d'erreur les rattrape jusqu'à ce qu'elle ne les
 * rattrape plus, et le QR devient illisible pour une partie des téléphones
 * seulement — la pire des pannes, parce qu'elle ne se voit pas d'un seul essai.
 */

/** La zone de silence de la norme, en modules. */
const MARGE = 4;

export function QrDeVirement({
	charge,
	titre,
	taille = 200
}: {
	/** La charge EPC069-12, composée par `socle/virement-epc.ts`. */
	readonly charge: string;
	/** Ce que lit une personne qui n'a pas d'image. Jamais décoratif. */
	readonly titre: string;
	readonly taille?: number;
}) {
	/*
	  ⚠️ LA VERSION EST AUTOMATIQUE (`0`), et c'est ce qu'il faut. Fixer une
	  version ferait échouer la composition le jour où un nom de bénéficiaire plus
	  long dépasse sa capacité — alors que le refus, lui, doit venir des bornes de
	  la NORME, qui sont déjà contrôlées à la composition de la charge.
	*/
	const qr = qrcode(0, 'M');
	qr.addData(charge, 'Byte');
	qr.make();

	const modules = qr.getModuleCount();
	const cote = modules + MARGE * 2;

	// Un seul chemin pour toute la trame : un rectangle par module ferait des
	// centaines de nœuds, et les interstices d'anticrénelage entre eux sont
	// exactement ce qui fait échouer un scan à l'écran.
	let chemin = '';
	for (let ligne = 0; ligne < modules; ligne += 1) {
		for (let colonne = 0; colonne < modules; colonne += 1) {
			if (!qr.isDark(ligne, colonne)) continue;
			chemin += `M${colonne + MARGE} ${ligne + MARGE}h1v1h-1z`;
		}
	}

	return (
		<svg
			role="img"
			aria-label={titre}
			viewBox={`0 0 ${cote} ${cote}`}
			width={taille}
			height={taille}
			shapeRendering="crispEdges"
			className="rounded-cladd-sm"
		>
			{/*
			  ⚠️ LE FOND EST BLANC EN DUR, ET C'EST LE SEUL ENDROIT DU PRODUIT OÙ
			  C'EST JUSTE. Un QR se lit par le contraste entre modules sombres et
			  clairs : en thème sombre, un fond qui suivrait le thème donnerait un
			  symbole sombre sur sombre, que rien ne lit. Ce n'est pas une couleur
			  d'interface, c'est une contrainte optique.
			*/}
			<rect width={cote} height={cote} fill="#ffffff" />
			<path d={chemin} fill="#000000" />
		</svg>
	);
}
