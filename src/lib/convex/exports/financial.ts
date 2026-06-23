"use node";

import { v, ConvexError } from 'convex/values';
import { action } from '../_generated/server';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { api, internal } from '../_generated/api';
import ExcelJS from 'exceljs';
import Papa from 'papaparse';

// ─── Types ────────────────────────────────────────────────────────────────────

type CostCategory =
	| 'LEASING'
	| 'CARBURANT'
	| 'ENTRETIEN'
	| 'ASSURANCE'
	| 'TAXES'
	| 'SINISTRE'
	| 'PARKING'
	| 'TELEPEAGE'
	| 'AUTRE';

interface CostRow {
	_id: string;
	vehicleId?: string | null;
	category: CostCategory;
	amount: number;
	vatAmount?: number | null;
	date: number;
	description: string;
	invoiceUrl?: string | null;
	source: string;
}

interface VehicleRow {
	_id: string;
	registration: string;
	brand: string;
	model: string;
	category: string;
	energy: string;
	status: string;
}

interface OrgRow {
	_id: string;
	name: string;
}

interface CategoryStat {
	category: string;
	total: number;
	count: number;
	average: number;
}

interface VehicleStat {
	vehicleId: string | null;
	total: number;
	byCategory: Record<string, number>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<CostCategory, string> = {
	LEASING: 'Leasing',
	CARBURANT: 'Carburant',
	ENTRETIEN: 'Entretien',
	ASSURANCE: 'Assurance',
	TAXES: 'Taxes',
	SINISTRE: 'Sinistre',
	PARKING: 'Parking',
	TELEPEAGE: 'Télépéage',
	AUTRE: 'Autre'
};

const PENNYLANE_ACCOUNTS: Record<CostCategory, string> = {
	LEASING: '612',
	CARBURANT: '6061',
	ENTRETIEN: '6152',
	ASSURANCE: '616',
	TAXES: '6311',
	SINISTRE: '6712',
	PARKING: '6251',
	TELEPEAGE: '6251',
	AUTRE: '6288'
};

const ALL_CATEGORIES: CostCategory[] = [
	'LEASING',
	'CARBURANT',
	'ENTRETIEN',
	'ASSURANCE',
	'TAXES',
	'SINISTRE',
	'PARKING',
	'TELEPEAGE',
	'AUTRE'
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(ts: number): string {
	const d = new Date(ts);
	return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
}

function fmtAmt(n: number): string {
	return n.toFixed(2).replace('.', ',');
}

function fmtFilename(ts: number): string {
	const d = new Date(ts);
	return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
}

function catLabel(cat: string): string {
	return CATEGORY_LABELS[cat as CostCategory] ?? cat;
}

// ─── Excel ────────────────────────────────────────────────────────────────────

const HDR_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1C1C1C' } };
const HDR_FONT: Partial<ExcelJS.Font> = { color: { argb: 'FFFFFFFF' }, bold: true, size: 10 };
const ALT_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
const AMT_FMT = '#,##0.00 "€"';

function styleHdr(row: ExcelJS.Row, cols: number) {
	row.height = 24;
	for (let c = 1; c <= cols; c++) {
		const cell = row.getCell(c);
		cell.fill = HDR_FILL;
		cell.font = HDR_FONT;
		cell.alignment = { vertical: 'middle', horizontal: 'left' };
	}
}

function styleRow(row: ExcelJS.Row, cols: number, alt: boolean) {
	if (!alt) return;
	for (let c = 1; c <= cols; c++) {
		row.getCell(c).fill = ALT_FILL;
	}
}

async function generateExcel(
	costs: CostRow[],
	byCategory: CategoryStat[],
	byVehicle: VehicleStat[],
	vehicles: VehicleRow[],
	org: OrgRow,
	fromDate: number,
	toDate: number,
	detailLevel: 'summary' | 'detailed'
): Promise<Buffer> {
	const wb = new ExcelJS.Workbook();
	wb.creator = 'Mycelium Fleet OS';
	wb.created = new Date();
	wb.properties.date1904 = false;

	const vMap = new Map(vehicles.map((v) => [v._id, v]));
	const total = costs.reduce((s, c) => s + c.amount, 0);
	const uniqueVehicles = new Set(costs.map((c) => c.vehicleId).filter(Boolean)).size;

	// ── Sheet 1: Résumé ────────────────────────────────────────────────────────
	const s1 = wb.addWorksheet('Résumé', { views: [{ state: 'frozen', ySplit: 5 }] });
	s1.columns = [
		{ key: 'a', width: 32 },
		{ key: 'b', width: 22 },
		{ key: 'c', width: 16 },
		{ key: 'd', width: 16 },
		{ key: 'e', width: 14 }
	];

	// Title block
	const t1 = s1.addRow([`Rapport financier — ${org.name}`]);
	s1.mergeCells(`A${t1.number}:E${t1.number}`);
	t1.getCell(1).font = { bold: true, size: 15 };
	t1.height = 30;

	const t2 = s1.addRow([`Période : ${fmtDate(fromDate)} au ${fmtDate(toDate)}`]);
	s1.mergeCells(`A${t2.number}:E${t2.number}`);
	t2.getCell(1).font = { size: 10, color: { argb: 'FF666666' } };

	const t3 = s1.addRow([`Généré le ${fmtDate(Date.now())}`]);
	s1.mergeCells(`A${t3.number}:E${t3.number}`);
	t3.getCell(1).font = { size: 9, color: { argb: 'FF999999' } };

	s1.addRow([]);

	// KPIs
	const kpiHdr = s1.addRow(['Indicateurs clés', 'Valeur']);
	styleHdr(kpiHdr, 2);

	const kpiData = [
		['Coût total TTC', `${fmtAmt(total)} €`],
		['Nombre de coûts', String(costs.length)],
		['Véhicules concernés', String(uniqueVehicles)],
		[
			'Coût moyen / véhicule',
			`${fmtAmt(total / Math.max(uniqueVehicles, 1))} €`
		]
	];
	kpiData.forEach((row, i) => {
		const r = s1.addRow(row);
		styleRow(r, 2, i % 2 === 0);
	});

	s1.addRow([]);

	// Category summary
	const catHdr = s1.addRow(['Catégorie', 'Total TTC', 'Nb coûts', '% du total', 'Moyenne']);
	styleHdr(catHdr, 5);
	s1.getColumn('b').numFmt = AMT_FMT;
	s1.getColumn('e').numFmt = AMT_FMT;

	[...byCategory]
		.sort((a, b) => b.total - a.total)
		.forEach((row, i) => {
			const pct = total > 0 ? ((row.total / total) * 100).toFixed(1) + '%' : '0%';
			const r = s1.addRow([catLabel(row.category), row.total, row.count, pct, row.average]);
			styleRow(r, 5, i % 2 === 0);
		});

	// ── Sheet 2: Par véhicule ──────────────────────────────────────────────────
	const s2 = wb.addWorksheet('Par véhicule', { views: [{ state: 'frozen', ySplit: 1 }] });
	const s2Cols = [
		{ header: 'Immatriculation', key: 'reg', width: 16 },
		{ header: 'Marque', key: 'brand', width: 14 },
		{ header: 'Modèle', key: 'model', width: 16 },
		{ header: 'Total TTC', key: 'total', width: 14 },
		...ALL_CATEGORIES.map((cat) => ({ header: CATEGORY_LABELS[cat], key: cat, width: 13 }))
	];
	s2.columns = s2Cols;
	styleHdr(s2.getRow(1), s2Cols.length);
	s2.getColumn('total').numFmt = AMT_FMT;
	ALL_CATEGORIES.forEach((cat) => {
		s2.getColumn(cat).numFmt = AMT_FMT;
	});

	byVehicle
		.filter((r) => r.vehicleId)
		.sort((a, b) => b.total - a.total)
		.forEach((row, i) => {
			const v = vMap.get(row.vehicleId!);
			const r = s2.addRow([
				v?.registration ?? row.vehicleId,
				v?.brand ?? '',
				v?.model ?? '',
				row.total,
				...ALL_CATEGORIES.map((cat) => row.byCategory[cat] ?? 0)
			]);
			styleRow(r, s2Cols.length, i % 2 === 0);
		});

	// ── Sheet 3: Par catégorie ─────────────────────────────────────────────────
	const s3 = wb.addWorksheet('Par catégorie', { views: [{ state: 'frozen', ySplit: 1 }] });
	s3.columns = [
		{ header: 'Catégorie', key: 'cat', width: 18 },
		{ header: 'Total TTC', key: 'total', width: 14 },
		{ header: 'Nb coûts', key: 'count', width: 12 },
		{ header: 'Moyenne', key: 'avg', width: 14 },
		{ header: '% du total', key: 'pct', width: 12 }
	];
	styleHdr(s3.getRow(1), 5);
	s3.getColumn('total').numFmt = AMT_FMT;
	s3.getColumn('avg').numFmt = AMT_FMT;

	[...byCategory]
		.sort((a, b) => b.total - a.total)
		.forEach((row, i) => {
			const pct = total > 0 ? ((row.total / total) * 100).toFixed(1) + '%' : '0%';
			const r = s3.addRow([catLabel(row.category), row.total, row.count, row.average, pct]);
			styleRow(r, 5, i % 2 === 0);
		});

	if (detailLevel === 'detailed') {
		// ── Sheet 4: Coûts détaillés ───────────────────────────────────────────
		const s4 = wb.addWorksheet('Coûts détaillés', { views: [{ state: 'frozen', ySplit: 1 }] });
		s4.columns = [
			{ header: 'Date', key: 'date', width: 14 },
			{ header: 'Immatriculation', key: 'reg', width: 16 },
			{ header: 'Marque', key: 'brand', width: 12 },
			{ header: 'Modèle', key: 'model', width: 14 },
			{ header: 'Catégorie', key: 'cat', width: 14 },
			{ header: 'Description', key: 'desc', width: 32 },
			{ header: 'Montant TTC', key: 'amount', width: 14 },
			{ header: 'TVA', key: 'vat', width: 10 },
			{ header: 'Source', key: 'source', width: 10 },
			{ header: 'Justificatif', key: 'invoice', width: 30 }
		];
		styleHdr(s4.getRow(1), 10);
		s4.getColumn('amount').numFmt = AMT_FMT;

		costs.forEach((cost, i) => {
			const v = cost.vehicleId ? vMap.get(cost.vehicleId) : undefined;
			const r = s4.addRow([
				fmtDate(cost.date),
				v?.registration ?? '—',
				v?.brand ?? '—',
				v?.model ?? '—',
				catLabel(cost.category),
				cost.description,
				cost.amount,
				cost.vatAmount ?? '',
				cost.source,
				cost.invoiceUrl ?? ''
			]);
			styleRow(r, 10, i % 2 === 0);
			if (cost.invoiceUrl) {
				r.getCell(10).value = { text: 'Voir le justificatif', hyperlink: cost.invoiceUrl };
				r.getCell(10).font = { color: { argb: 'FF0066CC' }, underline: true };
			}
		});

		// ── Sheet 5: Pennylane ─────────────────────────────────────────────────
		const s5 = wb.addWorksheet('Pennylane', { views: [{ state: 'frozen', ySplit: 1 }] });
		s5.columns = [
			{ header: 'Code Journal', key: 'journal', width: 14 },
			{ header: 'Date', key: 'date', width: 12 },
			{ header: 'Libellé', key: 'label', width: 36 },
			{ header: 'Compte', key: 'account', width: 10 },
			{ header: 'Débit', key: 'debit', width: 12 },
			{ header: 'Crédit', key: 'credit', width: 12 },
			{ header: 'Numéro de pièce', key: 'piece', width: 22 },
			{ header: 'Catégorie analytique', key: 'analytic', width: 22 }
		];
		styleHdr(s5.getRow(1), 8);
		s5.getColumn('debit').numFmt = '#,##0.00';
		s5.getColumn('credit').numFmt = '#,##0.00';

		costs.forEach((cost, i) => {
			const amtHT =
				cost.vatAmount != null && cost.vatAmount > 0
					? cost.amount - cost.vatAmount
					: cost.amount;
			const r = s5.addRow([
				'FLEET',
				fmtDate(cost.date),
				cost.description,
				PENNYLANE_ACCOUNTS[cost.category] ?? '6288',
				amtHT,
				'',
				cost._id.slice(-20),
				catLabel(cost.category)
			]);
			styleRow(r, 8, i % 2 === 0);
		});
	}

	const buf = await wb.xlsx.writeBuffer();
	return Buffer.from(buf);
}

// ─── CSV ──────────────────────────────────────────────────────────────────────

function generateCSV(costs: CostRow[], vehicles: VehicleRow[]): Buffer {
	const vMap = new Map(vehicles.map((v) => [v._id, v]));
	// UTF-8 BOM for correct display in Excel FR
	const BOM = '﻿';

	const rows = costs.map((cost) => {
		const v = cost.vehicleId ? vMap.get(cost.vehicleId) : undefined;
		return {
			id: cost._id,
			date: new Date(cost.date).toISOString().split('T')[0],
			vehicleRegistration: v?.registration ?? '',
			brand: v?.brand ?? '',
			model: v?.model ?? '',
			category: cost.category,
			categoryLabel: catLabel(cost.category),
			description: cost.description,
			amountTTC: cost.amount,
			vatAmount: cost.vatAmount ?? '',
			amountHT:
				cost.vatAmount != null && cost.vatAmount > 0 ? cost.amount - cost.vatAmount : cost.amount,
			source: cost.source
		};
	});

	return Buffer.from(BOM + Papa.unparse(rows, { quotes: true }), 'utf-8');
}

// ─── PDF ──────────────────────────────────────────────────────────────────────

async function generatePDF(
	costs: CostRow[],
	byCategory: CategoryStat[],
	byVehicle: VehicleStat[],
	vehicles: VehicleRow[],
	org: OrgRow,
	fromDate: number,
	toDate: number
): Promise<Buffer> {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const pdfMake = require('pdfmake/build/pdfmake');
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const vfsFonts = require('pdfmake/build/vfs_fonts');
	// Handle both pdfmake/build/vfs_fonts structures
	pdfMake.vfs = vfsFonts.pdfMake?.vfs ?? vfsFonts.vfs ?? {};

	const vMap = new Map(vehicles.map((v) => [v._id, v]));
	const totalAmt = costs.reduce((s, c) => s + c.amount, 0);
	const uniqueVehicles = new Set(costs.map((c) => c.vehicleId).filter(Boolean)).size;

	const DARK = '#111827';
	const GRAY = '#6B7280';
	const LIGHT = '#F9FAFB';
	const BRAND = '#1C1C1C';

	const mkHdrCell = (text: string) => ({
		text,
		fillColor: BRAND,
		color: 'white',
		bold: true,
		fontSize: 8,
		border: [false, false, false, false] as [boolean, boolean, boolean, boolean]
	});

	const mkCell = (text: string, isAlt: boolean, align?: string) => ({
		text,
		fontSize: 8,
		fillColor: isAlt ? LIGHT : 'white',
		border: [false, false, false, false] as [boolean, boolean, boolean, boolean],
		...(align ? { alignment: align } : {})
	});

	// Category table rows
	const catRows = [
		[
			mkHdrCell('Catégorie'),
			mkHdrCell('Total TTC'),
			mkHdrCell('Coûts'),
			mkHdrCell('Moyenne'),
			mkHdrCell('% total')
		],
		...[...byCategory]
			.sort((a, b) => b.total - a.total)
			.map((row, i) => {
				const pct = totalAmt > 0 ? ((row.total / totalAmt) * 100).toFixed(1) + '%' : '0%';
				return [
					mkCell(catLabel(row.category), i % 2 === 0),
					mkCell(`${fmtAmt(row.total)} €`, i % 2 === 0, 'right'),
					mkCell(String(row.count), i % 2 === 0, 'right'),
					mkCell(`${fmtAmt(row.average)} €`, i % 2 === 0, 'right'),
					mkCell(pct, i % 2 === 0, 'right')
				];
			})
	];

	// Vehicle table rows
	const vehicleRows = [
		[
			mkHdrCell('Immat.'),
			mkHdrCell('Marque'),
			mkHdrCell('Modèle'),
			mkHdrCell('Total TTC'),
			mkHdrCell('Catégorie principale')
		],
		...byVehicle
			.filter((r) => r.vehicleId)
			.sort((a, b) => b.total - a.total)
			.slice(0, 40)
			.map((row, i) => {
				const v = vMap.get(row.vehicleId!);
				const mainCat = Object.entries(row.byCategory).sort((a, b) => b[1] - a[1])[0];
				return [
					mkCell(v?.registration ?? '—', i % 2 === 0),
					mkCell(v?.brand ?? '—', i % 2 === 0),
					mkCell(v?.model ?? '—', i % 2 === 0),
					mkCell(`${fmtAmt(row.total)} €`, i % 2 === 0, 'right'),
					mkCell(mainCat ? catLabel(mainCat[0]) : '—', i % 2 === 0)
				];
			})
	];

	const docDef = {
		pageSize: 'A4',
		pageMargins: [40, 60, 40, 60],
		footer: (currentPage: number, pageCount: number) => ({
			text: `${org.name}  ·  Rapport financier  ·  Page ${currentPage}/${pageCount}`,
			alignment: 'center',
			fontSize: 8,
			color: GRAY,
			margin: [40, 10]
		}),
		content: [
			// Cover
			{ text: 'MYCELIUM FLEET OS', fontSize: 9, color: GRAY, margin: [0, 0, 0, 48] },
			{ text: 'Rapport Financier', fontSize: 30, bold: true, color: DARK, margin: [0, 0, 0, 10] },
			{ text: org.name, fontSize: 15, color: GRAY, margin: [0, 0, 0, 6] },
			{
				text: `Période : ${fmtDate(fromDate)} – ${fmtDate(toDate)}`,
				fontSize: 11,
				color: GRAY,
				margin: [0, 0, 0, 4]
			},
			{ text: `Généré le ${fmtDate(Date.now())}`, fontSize: 9, color: GRAY, margin: [0, 0, 0, 0] },

			// KPIs - page 2
			{
				text: 'Résumé exécutif',
				fontSize: 18,
				bold: true,
				color: DARK,
				pageBreak: 'before',
				margin: [0, 0, 0, 20]
			},
			{
				table: {
					widths: ['*', '*', '*', '*'],
					body: [
						[
							{ text: 'Coût total TTC', fontSize: 8, color: GRAY, border: [false, false, false, false] },
							{ text: 'Nb coûts', fontSize: 8, color: GRAY, border: [false, false, false, false] },
							{ text: 'Véhicules', fontSize: 8, color: GRAY, border: [false, false, false, false] },
							{
								text: 'Moy./véhicule',
								fontSize: 8,
								color: GRAY,
								border: [false, false, false, false]
							}
						],
						[
							{
								text: `${fmtAmt(totalAmt)} €`,
								fontSize: 18,
								bold: true,
								color: DARK,
								border: [false, false, false, false]
							},
							{
								text: String(costs.length),
								fontSize: 18,
								bold: true,
								color: DARK,
								border: [false, false, false, false]
							},
							{
								text: String(uniqueVehicles),
								fontSize: 18,
								bold: true,
								color: DARK,
								border: [false, false, false, false]
							},
							{
								text: `${fmtAmt(totalAmt / Math.max(uniqueVehicles, 1))} €`,
								fontSize: 18,
								bold: true,
								color: DARK,
								border: [false, false, false, false]
							}
						]
					]
				},
				fillColor: LIGHT,
				margin: [0, 0, 0, 28]
			},

			// Category breakdown
			{
				text: 'Répartition par catégorie',
				fontSize: 13,
				bold: true,
				color: DARK,
				margin: [0, 0, 0, 10]
			},
			{
				table: { widths: ['*', 70, 45, 70, 45], headerRows: 1, body: catRows },
				margin: [0, 0, 0, 28]
			},

			// Vehicle breakdown
			{
				text: 'Répartition par véhicule',
				fontSize: 13,
				bold: true,
				color: DARK,
				margin: [0, 0, 0, 10]
			},
			{
				table: { widths: [60, 55, 70, 60, '*'], headerRows: 1, body: vehicleRows }
			}
		],
		defaultStyle: { font: 'Roboto', fontSize: 9, color: DARK }
	};

	return new Promise<Buffer>((resolve, reject) => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		pdfMake.createPdf(docDef).getBuffer(
			(buf: Uint8Array) => resolve(Buffer.from(buf)),
			(err: Error) => reject(err)
		);
	});
}

// ─── Main action ──────────────────────────────────────────────────────────────

export const generateFinancialExport = action({
	args: {
		format: v.union(v.literal('excel'), v.literal('csv'), v.literal('pdf')),
		fromDate: v.number(),
		toDate: v.number(),
		vehicleIds: v.optional(v.array(v.id('vehicles'))),
		categories: v.optional(v.array(v.string())),
		detailLevel: v.union(v.literal('summary'), v.literal('detailed'))
	},
	handler: async (ctx, args): Promise<string> => {
		// Auth check
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const user = await ctx.runQuery((api as any).auth.getCurrentUser, {});
		if (!user) throw new ConvexError('Non authentifié');

		// Get org
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const org = await ctx.runQuery((api as any).organizations.getMyOrg, {});
		if (!org) throw new ConvexError('Aucune organisation active');

		// Fetch data
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		let costs = (await ctx.runQuery((api as any).costs.listCosts, {
			fromDate: args.fromDate,
			toDate: args.toDate
		})) as CostRow[];

		// Apply optional filters
		if (args.vehicleIds && args.vehicleIds.length > 0) {
			costs = costs.filter((c) => c.vehicleId && args.vehicleIds!.includes(c.vehicleId as never));
		}
		if (args.categories && args.categories.length > 0) {
			costs = costs.filter((c) => args.categories!.includes(c.category));
		}

		// Guard: limit to 5000 rows to stay within action timeout
		if (costs.length > 5000) {
			costs = costs.slice(0, 5000);
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const vehicles = (await ctx.runQuery((api as any).vehicles.listVehicles, {})) as VehicleRow[];
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const byCategory = (await ctx.runQuery((api as any).costs.getCostsByCategory, {
			fromDate: args.fromDate,
			toDate: args.toDate
		})) as CategoryStat[];
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const byVehicle = (await ctx.runQuery((api as any).costs.getCostsByVehicle, {
			fromDate: args.fromDate,
			toDate: args.toDate
		})) as VehicleStat[];

		// Generate file buffer
		let buffer: Buffer;
		let mimeType: string;

		if (args.format === 'excel') {
			buffer = await generateExcel(
				costs,
				byCategory,
				byVehicle,
				vehicles,
				org as OrgRow,
				args.fromDate,
				args.toDate,
				args.detailLevel
			);
			mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
		} else if (args.format === 'csv') {
			buffer = generateCSV(costs, vehicles);
			mimeType = 'text/csv;charset=utf-8';
		} else {
			buffer = await generatePDF(
				costs,
				byCategory,
				byVehicle,
				vehicles,
				org as OrgRow,
				args.fromDate,
				args.toDate
			);
			mimeType = 'application/pdf';
		}

		// Store in Convex storage (Uint8Array avoids Buffer/BlobPart type mismatch)
		const blob = new Blob([new Uint8Array(buffer)], { type: mimeType });
		const storageId = await ctx.storage.store(blob);

		// Schedule cleanup after 10 minutes
		await ctx.scheduler.runAfter(
			10 * 60 * 1000,
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(internal as any).exports.cleanup.cleanupExport,
			{ storageId }
		);

		// Return signed URL
		const url = await ctx.storage.getUrl(storageId);
		if (!url) throw new ConvexError("Impossible de générer l'URL de téléchargement");
		return url;
	}
});

export { fmtFilename };
