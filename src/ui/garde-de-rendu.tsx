import { Component, type ErrorInfo, type ReactNode } from 'react';

/**
 * UN RENDU QUI LÈVE SE DIT À SA PLACE (20/10/2026). Dans l'éditeur du blog, un composant de
 * l'article rendu avec une clé absente du registre lèverait, et emporterait l'éditeur entier :
 * la garde le remplace par son repli, et le reste de l'article continue de s'écrire.
 */
export class GardeDeRendu extends Component<
	{ readonly children: ReactNode; readonly repli: ReactNode },
	{ readonly erreur: boolean }
> {
	override state = { erreur: false };

	static getDerivedStateFromError() {
		return { erreur: true };
	}

	override componentDidCatch(erreur: Error, info: ErrorInfo) {
		console.warn('Rendu illisible', erreur.message, info.componentStack);
	}

	override render() {
		return this.state.erreur ? this.props.repli : this.props.children;
	}
}
