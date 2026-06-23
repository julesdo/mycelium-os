// Pure utility — no Convex imports. Runs inside Convex actions (Node-compatible).

export type FuelProvider = 'TOTAL_CARDS' | 'BP_PLUS' | 'SHELL_FLEET' | 'GENERIC';

export interface FuelTransaction {
	rawLine: string;
	date: Date;
	registration: string; // normalized
	liters: number;
	amount: number; // TTC en €
	station: string;
}

export function normalizeRegistration(raw: string): string {
	return raw
		.toUpperCase()
		.replace(/[\s.-]/g, '')
		.trim();
}

function parseDateStr(s: string): Date {
	const str = s.trim();
	// DD/MM/YYYY or DD-MM-YYYY
	const mDMY = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
	if (mDMY) {
		return new Date(`${mDMY[3]}-${mDMY[2].padStart(2, '0')}-${mDMY[1].padStart(2, '0')}`);
	}
	// YYYY-MM-DD
	if (/^\d{4}-\d{2}-\d{2}/.test(str)) return new Date(str.slice(0, 10));
	return new Date(str);
}

function parseNum(s: string): number {
	const n = parseFloat((s ?? '').trim().replace(/\s/g, '').replace(',', '.'));
	return isNaN(n) ? 0 : n;
}

function splitCSVLine(line: string, sep: string): string[] {
	if (sep === ',') {
		// handle quoted fields
		const cols: string[] = [];
		let cur = '';
		let inQ = false;
		for (const ch of line) {
			if (ch === '"') {
				inQ = !inQ;
				continue;
			}
			if (ch === ',' && !inQ) {
				cols.push(cur.trim());
				cur = '';
				continue;
			}
			cur += ch;
		}
		cols.push(cur.trim());
		return cols;
	}
	return line.split(sep).map((c) => c.replace(/^"|"$/g, '').trim());
}

// ─── Total Cards (séparateur ;) ───────────────────────────────────────────────
// Date;Heure;Carte;Véhicule;Immat;Produit;Litres;Montant HT;TVA;Montant TTC;Station
export function parseTotalCards(csv: string): FuelTransaction[] {
	return csv
		.split('\n')
		.slice(1)
		.map((l) => l.trim())
		.filter(Boolean)
		.map((line) => {
			const c = line.split(';');
			return {
				rawLine: line,
				date: parseDateStr(c[0] ?? ''),
				registration: normalizeRegistration(c[4] ?? ''),
				liters: parseNum(c[6] ?? '0'),
				amount: parseNum(c[9] ?? '0'),
				station: (c[10] ?? '').trim()
			};
		})
		.filter((t) => t.amount > 0 && t.registration.length >= 2);
}

// ─── BP Plus (séparateur ,) ───────────────────────────────────────────────────
// "Transaction Date","Time","Card Number","Vehicle Reg","Fuel Type","Volume","Net Amount","VAT","Gross Amount","Site Name"
export function parseBPPlus(csv: string): FuelTransaction[] {
	return csv
		.split('\n')
		.slice(1)
		.map((l) => l.trim())
		.filter(Boolean)
		.map((line) => {
			const c = splitCSVLine(line, ',');
			return {
				rawLine: line,
				date: parseDateStr(c[0] ?? ''),
				registration: normalizeRegistration(c[3] ?? ''),
				liters: parseNum(c[5] ?? '0'),
				amount: parseNum(c[8] ?? '0'),
				station: (c[9] ?? '').trim()
			};
		})
		.filter((t) => t.amount > 0 && t.registration.length >= 2);
}

// ─── Shell Fleet (séparateur \t) ──────────────────────────────────────────────
// Date\tHeure\tImmatriculation\tProduit\tQuantite\tMontant_HT\tTVA\tMontant_TTC\tStation
export function parseShellFleet(csv: string): FuelTransaction[] {
	return csv
		.split('\n')
		.slice(1)
		.map((l) => l.trim())
		.filter(Boolean)
		.map((line) => {
			const c = line.split('\t');
			return {
				rawLine: line,
				date: parseDateStr(c[0] ?? ''),
				registration: normalizeRegistration(c[2] ?? ''),
				liters: parseNum(c[4] ?? '0'),
				amount: parseNum(c[7] ?? '0'),
				station: (c[8] ?? '').trim()
			};
		})
		.filter((t) => t.amount > 0 && t.registration.length >= 2);
}

// ─── Generic fallback ─────────────────────────────────────────────────────────
function parseGeneric(csv: string): FuelTransaction[] {
	const first = csv.split('\n')[0] ?? '';
	if (first.includes('\t') && first.split('\t').length > 5) return parseShellFleet(csv);
	if (first.split(',').length > first.split(';').length) return parseBPPlus(csv);
	return parseTotalCards(csv);
}

export function detectProvider(csv: string): FuelProvider {
	const first = (csv.split('\n')[0] ?? '').toLowerCase();
	if (first.includes('montant ttc') && first.includes('carte')) return 'TOTAL_CARDS';
	if (first.includes('gross amount') && first.includes('vehicle reg')) return 'BP_PLUS';
	if (first.split('\t').length > 5 && (first.includes('quantite') || first.includes('quantité')))
		return 'SHELL_FLEET';
	return 'GENERIC';
}

export function parseByProvider(csv: string, provider: FuelProvider): FuelTransaction[] {
	if (provider === 'TOTAL_CARDS') return parseTotalCards(csv);
	if (provider === 'BP_PLUS') return parseBPPlus(csv);
	if (provider === 'SHELL_FLEET') return parseShellFleet(csv);
	return parseGeneric(csv);
}
