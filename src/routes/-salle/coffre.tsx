import { useState } from 'react';
import {
	ParcoursDepot,
	VisionneuseDocument,
	cleDeRef,
	type ContenuOuvert,
	type DepotAuCoffre,
	type DetailDocument,
	type EntreeDuJournal,
	type FichierAuDepot,
	type RefCoffre,
	type ResumeDocument
} from '../../ui';
import { EcranCoffre } from '../../screens/coffre';
import { FORMATS_ACCEPTES, FORMATS_EN_CLAIR } from '../../lib/socle/coffre/fichiers';
import type { EcranDuProduit, EtatDemo } from './demo';

/**
 * LE COFFRE-FORT DE LA SALLE — la liste, un document ouvert, et les trois étapes
 * du parcours de dépôt, chacune figée pour qu'on la regarde aux quatre largeurs.
 *
 * Aucun document réel : l'aperçu se fabrique ici, un PDF d'une page écrit à la
 * main, et ne passe par aucun serveur.
 */

const JOUR = 86_400_000;
// Le jour de la salle est figé : les captures ne changent pas d'un matin à l'autre.
const MAINTENANT = Date.UTC(2026, 9, 12, 9, 30);

const DOCUMENTS_DEMO: readonly ResumeDocument[] = [
	{
		ref: { genre: 'IMPORT', id: 'fec-t3' },
		nom: 'FEC-2026-T3.txt',
		deposeLe: MAINTENANT - 2 * 3_600_000,
		taille: 1_284_000,
		mime: 'text/plain',
		scelle: true,
		etat: 'TERMINE',
		bilan: { facturesCreees: 198, facturesDejaConnues: 12, reglementsCrees: 64, ignoreesTotal: 2 }
	},
	{
		ref: { genre: 'PIECE', id: 'bl-durand' },
		nom: 'BL-2026-0412-Durand.pdf',
		deposeLe: MAINTENANT - JOUR,
		taille: 214_000,
		mime: 'application/pdf',
		scelle: true,
		etat: 'TERMINE',
		typePiece: 'BON_DE_LIVRAISON',
		client: { id: 'client-durand', nom: 'Fournitures Durand' }
	},
	{
		ref: { genre: 'IMPORT', id: 'photo-facture' },
		nom: 'Facture F-0388.jpg',
		deposeLe: MAINTENANT - 3 * JOUR,
		taille: 2_480_000,
		mime: 'image/jpeg',
		scelle: true,
		etat: 'TERMINE',
		bilan: { facturesCreees: 1, facturesDejaConnues: 0, reglementsCrees: 0, ignoreesTotal: 0 }
	},
	{
		ref: { genre: 'IMPORT', id: 'scan-illisible' },
		nom: 'scan-0921.pdf',
		deposeLe: MAINTENANT - 9 * JOUR,
		taille: 640_000,
		mime: 'application/pdf',
		scelle: true,
		etat: 'ECHEC'
	},
	{
		ref: { genre: 'PIECE', id: 'cgv' },
		nom: 'Conditions générales 2026.pdf',
		deposeLe: MAINTENANT - 34 * JOUR,
		taille: 98_000,
		mime: 'application/pdf',
		scelle: true,
		etat: 'TERMINE',
		typePiece: 'CGV',
		client: { id: 'client-martin', nom: 'Ateliers Martin' }
	}
];

const JOURNAL_DEMO: readonly EntreeDuJournal[] = [
	{
		nomDocument: 'BL-2026-0412-Durand.pdf',
		geste: 'CONSULTATION',
		le: MAINTENANT - 3_600_000,
		par: { nom: 'vous', estMoi: true }
	},
	{
		nomDocument: 'FEC-2026-T3.txt',
		geste: 'DEPOT',
		le: MAINTENANT - 2 * 3_600_000,
		par: { nom: 'vous', estMoi: true }
	},
	{
		nomDocument: 'BL-2026-0412-Durand.pdf',
		geste: 'TELECHARGEMENT',
		le: MAINTENANT - 5 * 3_600_000,
		par: { nom: 'Claire Moreau', estMoi: false }
	},
	{
		nomDocument: 'Devis-ancien.pdf',
		geste: 'RETRAIT',
		le: MAINTENANT - 2 * JOUR,
		par: { nom: 'Claire Moreau', estMoi: false }
	}
];

const DETAIL_DEMO: DetailDocument = {
	resume: DOCUMENTS_DEMO[1] as ResumeDocument,
	empreinte: '3f9a2c7e51b04d8a96e2f1c0b7d43a58e6c29f1047ab83d5c2e9f60a1b47d382',
	sceau: { algorithme: 'AES-256-GCM', version: 1 },
	deposePar: { nom: 'vous', estMoi: true },
	constat: 'Bon de livraison n° BL-2026-0412, signé à réception le 14 août 2026, sans réserve.',
	reference: 'BL-2026-0412',
	dateDocument: '2026-08-14',
	journal: [
		{ geste: 'CONSULTATION', le: MAINTENANT - 3_600_000, par: { nom: 'vous', estMoi: true } },
		{
			geste: 'TELECHARGEMENT',
			le: MAINTENANT - 5 * 3_600_000,
			par: { nom: 'Claire Moreau', estMoi: false }
		},
		{ geste: 'DEPOT', le: MAINTENANT - JOUR, par: { nom: 'vous', estMoi: true } }
	]
};

/** Un PDF d'une page, écrit à la main : de quoi voir l'aperçu sans serveur. */
function pdfDeDemonstration(): ArrayBuffer {
	const lignes = [
		'BON DE LIVRAISON  BL-2026-0412',
		'Fournitures Durand, 12 rue des Forges, 44000 Nantes',
		'Livre le 14 aout 2026',
		'48 cartons de papier A4, 12 toners',
		'Recu sans reserve. Signature du client.'
	];
	const flux = lignes
		.map((ligne, i) => `BT /F1 ${i === 0 ? 16 : 11} Tf 56 ${760 - i * 28} Td (${ligne}) Tj ET`)
		.join('\n');
	const objets = [
		'<< /Type /Catalog /Pages 2 0 R >>',
		'<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
		'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
		`<< /Length ${flux.length} >>\nstream\n${flux}\nendstream`,
		'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
	];
	let texte = '%PDF-1.4\n';
	const positions: number[] = [];
	objets.forEach((objet, i) => {
		positions.push(texte.length);
		texte += `${i + 1} 0 obj\n${objet}\nendobj\n`;
	});
	const xref = texte.length;
	texte += `xref\n0 ${objets.length + 1}\n0000000000 65535 f \n`;
	for (const position of positions) texte += `${String(position).padStart(10, '0')} 00000 n \n`;
	texte += `trailer\n<< /Size ${objets.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
	return new TextEncoder().encode(texte).buffer as ArrayBuffer;
}

const ouvrirDemo = (ref: RefCoffre): Promise<ContenuOuvert> =>
	Promise.resolve({ octets: pdfDeDemonstration(), mime: 'application/pdf', nom: `${ref.id}.pdf` });

/* ── Les trois étapes du parcours ─────────────────────────────────────────── */

const FICHIERS_CHOISIS: readonly FichierAuDepot[] = [
	{
		cle: 'a',
		nom: 'Export-ventes-septembre.csv',
		taille: 412_000,
		mime: 'text/csv',
		phase: 'PRET'
	},
	{ cle: 'b', nom: 'Facture F-0412.pdf', taille: 186_000, mime: 'application/pdf', phase: 'PRET' },
	{
		cle: 'c',
		nom: 'FEC-2026-T3.txt',
		taille: 1_284_000,
		mime: 'text/plain',
		phase: 'DEJA',
		deja: { nom: 'FEC-2026-T3.txt', deposeLe: MAINTENANT - 2 * 3_600_000 }
	},
	{
		cle: 'd',
		nom: 'IMG_2041.HEIC',
		taille: 3_100_000,
		mime: 'image/heic',
		phase: 'REFUSE',
		message:
			'Photo au format HEIC : choisissez « Le plus compatible » dans les réglages de l’appareil photo, ou envoyez-la en JPEG.'
	}
];

const suivi = (
	cle: string,
	etat: ResumeDocument['etat'],
	extra: Partial<ResumeDocument> = {}
): ResumeDocument => ({
	ref: { genre: 'IMPORT', id: cle },
	nom: cle,
	deposeLe: MAINTENANT,
	mime: 'application/pdf',
	scelle: true,
	etat,
	...extra
});

const FICHIERS_EN_ROUTE: readonly FichierAuDepot[] = [
	{
		cle: 'a',
		nom: 'Export-ventes-septembre.csv',
		taille: 412_000,
		mime: 'text/csv',
		phase: 'COFFRE',
		suivi: suivi('export-sept', 'EN_COURS', { etape: 'Lecture du fichier…', mime: 'text/csv' })
	},
	{
		cle: 'b',
		nom: 'Facture F-0412.pdf',
		taille: 186_000,
		mime: 'application/pdf',
		phase: 'ENVOI',
		avancement: 0.62
	}
];

const FICHIERS_LUS: readonly FichierAuDepot[] = [
	{
		cle: 'a',
		nom: 'Export-ventes-septembre.csv',
		taille: 412_000,
		mime: 'text/csv',
		phase: 'COFFRE',
		suivi: suivi('export-sept', 'TERMINE', {
			mime: 'text/csv',
			bilan: { facturesCreees: 46, facturesDejaConnues: 3, reglementsCrees: 18, ignoreesTotal: 1 }
		})
	},
	{
		cle: 'b',
		nom: 'Facture F-0412.pdf',
		taille: 186_000,
		mime: 'application/pdf',
		phase: 'COFFRE',
		suivi: suivi('f-0412', 'TERMINE', {
			bilan: { facturesCreees: 1, facturesDejaConnues: 0, reglementsCrees: 0, ignoreesTotal: 0 }
		})
	},
	{
		cle: 'e',
		nom: 'scan-0921.pdf',
		taille: 640_000,
		mime: 'application/pdf',
		phase: 'COFFRE',
		suivi: suivi('scan', 'ECHEC')
	}
];

function depotFige(fichiers: readonly FichierAuDepot[], lance: boolean): DepotAuCoffre {
	return {
		fichiers,
		onAjouter: () => undefined,
		onRetirer: () => undefined,
		onLancer: () => undefined,
		onReessayer: () => undefined,
		onRecommencer: () => undefined,
		lance,
		accept: FORMATS_ACCEPTES,
		formats: FORMATS_EN_CLAIR
	};
}

const PARCOURS: Readonly<Record<string, DepotAuCoffre>> = {
	'dépôt : le choix': depotFige(FICHIERS_CHOISIS, false),
	'dépôt : la mise au coffre': depotFige(FICHIERS_EN_ROUTE, true),
	'dépôt : le résumé': depotFige(FICHIERS_LUS, true),
	'dépôt : vide': depotFige([], false)
};

const VARIANTES = ['document ouvert', ...Object.keys(PARCOURS)];

function DemoCoffre({ variante, vide }: { variante?: string; vide: boolean }) {
	const parcours = variante === undefined ? undefined : PARCOURS[variante];
	const [ouvert, setOuvert] = useState<RefCoffre | null>(
		variante === 'document ouvert' ? DETAIL_DEMO.resume.ref : null
	);
	const [depotOuvert, setDepotOuvert] = useState(parcours !== undefined);
	return (
		<>
			<EcranCoffre
				donnees={{
					etat: 'pret',
					valeur: {
						documents: vide ? [] : DOCUMENTS_DEMO,
						...(vide ? {} : { journal: JOURNAL_DEMO }),
						onAjouter: () => setDepotOuvert(true),
						onOuvrir: setOuvert
					}
				}}
			/>
			<VisionneuseDocument
				ouverte={ouvert !== null}
				detail={
					ouvert === null
						? undefined
						: {
								...DETAIL_DEMO,
								resume:
									DOCUMENTS_DEMO.find((d) => cleDeRef(d.ref) === cleDeRef(ouvert)) ??
									DETAIL_DEMO.resume
							}
				}
				ouvrir={ouvrirDemo}
				onTelecharger={() => undefined}
				onRetirer={() => Promise.resolve(setOuvert(null))}
				onFermer={() => setOuvert(null)}
			/>
			<ParcoursDepot
				ouvert={depotOuvert}
				onFermer={() => setDepotOuvert(false)}
				destination={{ titre: 'vos factures', precision: 'lues dès leur arrivée' }}
				genre="FACTURES"
				depot={parcours ?? depotFige([], false)}
				onVoir={(cible) => {
					setDepotOuvert(false);
					setOuvert(cible);
				}}
				onVoirLeCoffre={() => setDepotOuvert(false)}
			/>
		</>
	);
}

export const ECRANS_COFFRE: readonly EcranDuProduit[] = [
	{
		route: '/app/coffre',
		libelle: 'le coffre-fort',
		vide: true,
		variantes: VARIANTES,
		Demo: ({ etat, variante }: { etat: EtatDemo; variante?: string }) => {
			if (etat === 'attente') return <EcranCoffre donnees={{ etat: 'attente' }} />;
			if (etat === 'erreur') return <EcranCoffre donnees={{ etat: 'erreur' }} />;
			return (
				<DemoCoffre
					key={variante ?? 'pret'}
					vide={etat === 'vide'}
					{...(variante === undefined ? {} : { variante })}
				/>
			);
		}
	}
];
