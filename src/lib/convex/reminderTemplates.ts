type TemplateKey = 'INSURANCE' | 'CT' | 'LICENSE' | 'REGISTRATION';

function toTemplateKey(alertType: string): TemplateKey {
	if (alertType.startsWith('INSURANCE')) return 'INSURANCE';
	if (alertType.startsWith('CT')) return 'CT';
	if (alertType.startsWith('LICENSE')) return 'LICENSE';
	return 'REGISTRATION';
}

const TEMPLATES: Record<TemplateKey, (label: string, expiryDate: string) => string> = {
	INSURANCE: (label, date) =>
		`Bonjour,\n\nL'assurance de ${label} arrive à échéance le ${date}. Votre concierge Mycelium peut s'occuper du renouvellement ou comparer les offres si vous le souhaitez — répondez simplement à ce message.\n\nBien à vous,\nVotre concierge Mycelium`,
	CT: (label, date) =>
		`Bonjour,\n\nLe contrôle technique de ${label} expire le ${date}. Souhaitez-vous que nous planifiions le rendez-vous avec un centre partenaire ?\n\nBien à vous,\nVotre concierge Mycelium`,
	LICENSE: (label, date) =>
		`Bonjour,\n\nLe permis de conduire concerné expire le ${date}. Merci de transmettre le nouveau document dès son renouvellement pour éviter toute interruption de conduite.\n\nBien à vous,\nVotre concierge Mycelium`,
	REGISTRATION: (label, date) =>
		`Bonjour,\n\nLa validité d'immatriculation de ${label} arrive à échéance le ${date}. Votre concierge reste disponible pour toute question.\n\nBien à vous,\nVotre concierge Mycelium`
};

export function generateReminderText(
	alertType: string,
	entityLabel: string,
	expiryDate: string
): string {
	const key = toTemplateKey(alertType);
	const dateFr = new Intl.DateTimeFormat('fr-FR').format(new Date(expiryDate));
	return TEMPLATES[key](entityLabel, dateFr);
}
