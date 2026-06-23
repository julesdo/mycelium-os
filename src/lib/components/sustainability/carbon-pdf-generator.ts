import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ADEME_FACTORS_2026 } from '$lib/convex/carbonFactors';

export interface CarbonData {
	year: number;
	scope1TotalTCO2e: number;
	scope2TotalTCO2e: number;
	totalTCO2e: number;
	dataSource: 'FUEL_IMPORT' | 'COST_ESTIMATE' | 'MANUAL';
	ademeYear: number;
	perVehicle: {
		brand: string;
		model: string;
		registration: string;
		energy: string;
		scope: 'SCOPE1' | 'SCOPE2';
		litersConsumed?: number;
		kwh?: number;
		tco2e: number;
	}[];
}

const BRAND_YELLOW: [number, number, number] = [245, 200, 0];
const DARK: [number, number, number] = [20, 20, 20];
const MUTED: [number, number, number] = [100, 100, 100];

export function generateCarbonPDF(data: CarbonData, orgName: string): Blob {
	const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

	// ── Page 1 — Résumé ───────────────────────────────────────────────────────
	// Header bar
	doc.setFillColor(...BRAND_YELLOW);
	doc.rect(0, 0, 210, 18, 'F');
	doc.setFontSize(10);
	doc.setTextColor(...DARK);
	doc.setFont('helvetica', 'bold');
	doc.text('MYCELIUM FLEET OS', 14, 11);
	doc.setFont('helvetica', 'normal');
	doc.setTextColor(...MUTED);
	doc.text(`Rapport Carbone — Exercice ${data.year}`, 210 - 14, 11, { align: 'right' });

	// Title
	doc.setFontSize(22);
	doc.setFont('helvetica', 'bold');
	doc.setTextColor(...DARK);
	doc.text('Bilan Carbone Flotte', 14, 36);
	doc.setFontSize(11);
	doc.setFont('helvetica', 'normal');
	doc.setTextColor(...MUTED);
	doc.text(orgName, 14, 44);
	doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 14, 50);

	// KPI boxes
	const kpis = [
		{ label: 'Scope 1', sub: 'Combustion directe', value: `${data.scope1TotalTCO2e} tCO₂e`, accent: false },
		{ label: 'Scope 2', sub: 'Électricité VE', value: `${data.scope2TotalTCO2e} tCO₂e`, accent: false },
		{ label: 'Total Scope 1+2', sub: 'Bilan flotte complet', value: `${data.totalTCO2e} tCO₂e`, accent: true }
	];

	const boxW = 56, boxH = 26, boxY = 62, gap = 7, startX = 14;
	kpis.forEach((kpi, i) => {
		const x = startX + i * (boxW + gap);
		if (kpi.accent) {
			doc.setFillColor(...BRAND_YELLOW);
		} else {
			doc.setFillColor(245, 245, 245);
		}
		doc.roundedRect(x, boxY, boxW, boxH, 3, 3, 'F');
		doc.setFontSize(7);
		doc.setFont('helvetica', 'bold');
		doc.setTextColor(...MUTED);
		doc.text(kpi.label.toUpperCase(), x + 4, boxY + 7);
		doc.setFontSize(14);
		doc.setFont('helvetica', 'bold');
		doc.setTextColor(...DARK);
		doc.text(kpi.value, x + 4, boxY + 16);
		doc.setFontSize(7);
		doc.setFont('helvetica', 'normal');
		doc.setTextColor(...MUTED);
		doc.text(kpi.sub, x + 4, boxY + 22);
	});

	// Source note
	const sourceLabel =
		data.dataSource === 'FUEL_IMPORT'
			? 'Source : relevés carburant exacts (imports carte carburant)'
			: 'Source : estimation basée sur les coûts carburant (prix moyen ADEME)';
	doc.setFontSize(8);
	doc.setTextColor(...MUTED);
	doc.text(sourceLabel, 14, 96);
	doc.text(`Facteurs d'émission : ADEME Base Carbone ${data.ademeYear}`, 14, 101);

	// Scope legend
	doc.setFontSize(9);
	doc.setFont('helvetica', 'bold');
	doc.setTextColor(...DARK);
	doc.text('Définition des scopes', 14, 114);
	doc.setFont('helvetica', 'normal');
	doc.setFontSize(8);
	doc.setTextColor(...MUTED);
	const legend = [
		'Scope 1 — Émissions directes issues de la combustion de carburant par les véhicules thermiques et hybrides.',
		'Scope 2 — Émissions indirectes liées à la consommation d\'électricité des véhicules électriques (mix FR RTE 2026).',
		'Scope 3 — Non inclus en V1 (amont carburant, fabrication véhicules). Consultez votre auditeur pour un bilan complet.'
	];
	legend.forEach((line, i) => {
		doc.text(line, 14, 121 + i * 7, { maxWidth: 182 });
	});

	// ── Page 2 — Détail véhicules ─────────────────────────────────────────────
	doc.addPage();
	doc.setFillColor(...BRAND_YELLOW);
	doc.rect(0, 0, 210, 18, 'F');
	doc.setFontSize(10);
	doc.setFont('helvetica', 'bold');
	doc.setTextColor(...DARK);
	doc.text('MYCELIUM FLEET OS', 14, 11);
	doc.setFont('helvetica', 'normal');
	doc.setTextColor(...MUTED);
	doc.text(`Rapport Carbone ${data.year} — Détail véhicules`, 210 - 14, 11, { align: 'right' });

	doc.setFontSize(14);
	doc.setFont('helvetica', 'bold');
	doc.setTextColor(...DARK);
	doc.text('Émissions par véhicule', 14, 30);

	const ENERGY_LABELS: Record<string, string> = {
		THERMAL: 'Thermique',
		HYBRID: 'Hybride',
		ELECTRIC: 'Électrique'
	};

	autoTable(doc, {
		startY: 36,
		head: [['Véhicule', 'Énergie', 'Scope', 'Consommation', 'tCO₂e']],
		body: data.perVehicle.map((v) => [
			`${v.brand} ${v.model}\n${v.registration}`,
			ENERGY_LABELS[v.energy] ?? v.energy,
			v.scope === 'SCOPE2' ? 'Scope 2' : 'Scope 1',
			v.litersConsumed != null
				? `${v.litersConsumed.toLocaleString('fr-FR')} L`
				: `${(v.kwh ?? 0).toLocaleString('fr-FR')} kWh`,
			v.tco2e.toFixed(3)
		]),
		styles: { fontSize: 8, cellPadding: 3 },
		headStyles: { fillColor: BRAND_YELLOW, textColor: DARK, fontStyle: 'bold', fontSize: 8 },
		columnStyles: {
			0: { cellWidth: 65 },
			1: { cellWidth: 28 },
			2: { cellWidth: 22 },
			3: { cellWidth: 35 },
			4: { cellWidth: 22, halign: 'right', fontStyle: 'bold' }
		},
		alternateRowStyles: { fillColor: [250, 250, 250] }
	});

	// ── Page 3 — Conformité CSRD ──────────────────────────────────────────────
	doc.addPage();
	doc.setFillColor(...BRAND_YELLOW);
	doc.rect(0, 0, 210, 18, 'F');
	doc.setFontSize(10);
	doc.setFont('helvetica', 'bold');
	doc.setTextColor(...DARK);
	doc.text('MYCELIUM FLEET OS', 14, 11);
	doc.setFont('helvetica', 'normal');
	doc.setTextColor(...MUTED);
	doc.text(`Rapport Carbone ${data.year} — Conformité CSRD`, 210 - 14, 11, { align: 'right' });

	doc.setFontSize(14);
	doc.setFont('helvetica', 'bold');
	doc.setTextColor(...DARK);
	doc.text('Conformité CSRD — ESRS E1', 14, 30);

	doc.setFontSize(8.5);
	doc.setFont('helvetica', 'normal');
	doc.setTextColor(...MUTED);
	const csrdLines = [
		'Ce rapport couvre les indicateurs E1-6 de la norme ESRS E1 (Changement climatique) de la directive',
		'CSRD (Corporate Sustainability Reporting Directive, EU 2022/2464).',
		'',
		'INDICATEURS GES SCOPE 1 & 2',
		`Émissions GES Scope 1 (combustion directe) : ${data.scope1TotalTCO2e} tCO₂e`,
		`Émissions GES Scope 2 (location-based, électricité) : ${data.scope2TotalTCO2e} tCO₂e`,
		`Total Scope 1 + Scope 2 : ${data.totalTCO2e} tCO₂e`,
		'',
		'FACTEURS D\'ÉMISSION UTILISÉS',
		`Source : ADEME Base Carbone, édition ${data.ademeYear}`,
		`Diesel : ${ADEME_FACTORS_2026.fuels.DIESEL} kg CO₂e/L — Essence : ${ADEME_FACTORS_2026.fuels.ESSENCE} kg CO₂e/L`,
		`Électricité (mix France) : ${ADEME_FACTORS_2026.fuels.ELECTRIC} kg CO₂e/kWh (source RTE 2026)`,
		'',
		'PÉRIMÈTRE & LIMITES',
		'Ce rapport couvre exclusivement les émissions liées à la flotte de véhicules d\'entreprise.',
		'Les émissions Scope 3 (amont carburant, production et fin de vie des véhicules, déplacements',
		'professionnels hors flotte) ne sont pas incluses dans ce document.',
		'',
		'AVERTISSEMENT',
		'Ce rapport est fourni à titre indicatif par Mycelium Fleet OS. Il ne constitue pas une certification',
		'de conformité CSRD. Veuillez consulter votre commissaire aux comptes ou auditeur environnemental',
		'pour la validation officielle de votre bilan GES consolidé.'
	];

	let y = 40;
	csrdLines.forEach((line) => {
		if (line === '') { y += 4; return; }
		const isBold = ['INDICATEURS GES SCOPE 1 & 2', "FACTEURS D'ÉMISSION UTILISÉS", 'PÉRIMÈTRE & LIMITES', 'AVERTISSEMENT'].includes(line);
		doc.setFont('helvetica', isBold ? 'bold' : 'normal');
		doc.setTextColor(isBold ? DARK[0] : MUTED[0], isBold ? DARK[1] : MUTED[1], isBold ? DARK[2] : MUTED[2]);
		doc.text(line, 14, y, { maxWidth: 182 });
		y += 6;
	});

	// Footer on all pages
	const pageCount = doc.getNumberOfPages();
	for (let i = 1; i <= pageCount; i++) {
		doc.setPage(i);
		doc.setFontSize(7);
		doc.setFont('helvetica', 'normal');
		doc.setTextColor(...MUTED);
		doc.text(`Page ${i} / ${pageCount}`, 210 - 14, 290, { align: 'right' });
		doc.text('Mycelium Fleet OS — Rapport carbone indicatif, facteurs ADEME Base Carbone', 14, 290);
	}

	return doc.output('blob');
}
