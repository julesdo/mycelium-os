import type { MarketingMarkdownDocument } from '$lib/markdown/types';
import { LEGAL_CONFIG } from '$lib/config/legal';

export const marketingMarkdown: MarketingMarkdownDocument = {
	title: 'Fleet TCO Simulator — Free Tool',
	description: `Free fleet Total Cost of Ownership calculator by ${LEGAL_CONFIG.brandName}. Estimate annual fleet costs, savings potential, and ROI in under 2 minutes. No signup required.`,
	sections: [
		{
			heading: 'What this tool does',
			paragraphs: [
				'The Fleet TCO Simulator calculates the total cost of ownership for a company vehicle fleet based on fleet size, vehicle mix, annual mileage, energy mix, and current utilization rate.',
				'Results include annual TCO broken down by category (leasing, fuel, maintenance, insurance, admin), estimated savings from 5 levers, and projected ROI after Mycelium subscription cost.'
			]
		},
		{
			heading: 'Inputs',
			bullets: [
				'Fleet size: 5 to 150 vehicles',
				'Vehicle mix: compact/sedan, light utility, executive (percentages)',
				'Annual mileage per vehicle: 5,000 to 60,000 km',
				'Energy mix: thermal, hybrid (PHEV/HEV), electric (BEV)',
				'Current utilization rate: 30% to 90%',
				'Country: France, UK, Sweden, Norway, Denmark'
			]
		},
		{
			heading: 'Outputs',
			bullets: [
				'Total annual fleet TCO with per-vehicle and per-km breakdowns',
				'Visual cost breakdown bar (leasing, fuel, maintenance, insurance, admin)',
				'Savings potential from 5 levers: fleet rightsizing, predictive maintenance, eco-driving coaching, admin automation, compliance management',
				'Net annual savings after Mycelium subscription',
				'Estimated ROI payback period in months',
				'Automatic plan recommendation (Essential, Professional, or Business)'
			]
		},
		{
			heading: 'Benchmarks used',
			paragraphs: [
				'Cost benchmarks are sourced from ALD Automotive Fleet Cost Index, Arval Fleet Barometer, and LeasePlan International Fleet Cost Benchmark (2025–2026 editions).',
				'Savings methodology: Aberdeen Group Fleet Management Study (predictive maintenance), ICCT eco-driving meta-analysis (fuel savings), internal fleet management benchmarks.'
			]
		},
		{
			heading: 'No signup required',
			paragraphs: [
				'The simulator is fully anonymous. No account or email is required to use it.',
				'Results are calculated entirely in the browser with no data sent to Mycelium servers.'
			]
		}
	]
};
