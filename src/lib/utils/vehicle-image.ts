function slugify(s: string): string {
	return s
		.toLowerCase()
		.normalize('NFD')
		.replace(/\p{Mn}/gu, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}

export function getVehicleImageUrl(brand: string, model: string): string {
	return `https://cdn.imagin.studio/getimage?customer=img&make=${slugify(brand)}&modelFamily=${slugify(model)}&zoomType=fullscreen`;
}
