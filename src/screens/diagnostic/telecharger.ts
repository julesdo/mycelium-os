import type { DiagnosticImprimable } from './pdf';

/**
 * Fabrique et télécharge le PDF du diagnostic.
 *
 * L'IMPORT EST PARESSEUX, et c'est la seule raison d'être de ce fichier séparé.
 * jsPDF et son moteur de tableaux pèsent plusieurs centaines de kilo-octets,
 * pour un bouton qu'un gérant presse deux fois par an. Chargés statiquement,
 * ce poids serait payé à chaque ouverture de l'application, sur une tablette,
 * souvent en 4G depuis une cuisine.
 *
 * Le module de mise en page, lui, n'est importé qu'en TYPE : le type ne survit
 * pas à la compilation, donc rien du document n'entre dans le bundle principal.
 */
export async function telechargerDiagnostic(d: DiagnosticImprimable): Promise<void> {
	const { construireDiagnostic, nomFichier } = await import('./pdf');
	construireDiagnostic(d).save(nomFichier(d));
}
