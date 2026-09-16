import { useState, type FormEvent } from 'react';
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useMutation, Authenticated, Unauthenticated, AuthLoading } from 'convex/react';
import { Input } from '@cladd-ui/react';
import { api } from '../lib/convex/_generated/api';
import { BoutonPrincipal, CadreAuth, Champ, MessageErreur } from '../ui';

export const Route = createFileRoute('/bienvenue')({ component: PageBienvenue });

/**
 * La garde, avant le formulaire.
 *
 * Cet écran a un jour affiché ses champs à quelqu'un qui n'avait pas de
 * session : la création d'entreprise se faisait renvoyer `Unauthenticated`,
 * et le seul retour était un message rouge, après la saisie. Un formulaire qui
 * ne peut pas partir ne doit pas s'ouvrir.
 *
 * Même mécanique que `/app` : les composants de `convex/react` plutôt qu'une
 * redirection dans `beforeLoad`, parce que l'état d'authentification n'est
 * connu qu'une fois le jeton vérifié.
 */
function PageBienvenue() {
	return (
		<>
			<AuthLoading>
				<div className="flex h-dvh items-center justify-center">
					<p className="text-cladd-xs text-cladd-fg-soft">Ouverture de votre espace…</p>
				</div>
			</AuthLoading>

			<Unauthenticated>
				<div className="flex h-dvh flex-col items-center justify-center gap-cladd-2xs p-cladd-xs text-center">
					<h1 className="text-cladd-md font-semibold">Connectez-vous d&rsquo;abord.</h1>
					<p className="max-w-sm text-cladd-xs text-cladd-fg-soft">
						Votre entreprise se crée depuis votre compte. Une fois connecté, vous reviendrez ici.
					</p>
					<BoutonPrincipal as={Link} to="/connexion">
						Se connecter
					</BoutonPrincipal>
				</div>
			</Unauthenticated>

			<Authenticated>
				<Bienvenue />
			</Authenticated>
		</>
	);
}

/**
 * La création de l'entreprise.
 *
 * UN SEUL CHAMP, ET C'EST LE BUT. Tout le reste se déduit des factures, et
 * c'est le principe du produit : on ne demande jamais une saisie que le
 * logiciel peut aller chercher lui-même.
 *
 * CE QUI A ÉTÉ RETIRÉ, ET POURQUOI ÇA COMPTE. Cet écran demandait un type
 * d'établissement — restaurant inter-entreprises, EHPAD, crèche — et un nombre
 * de couverts par jour, puis les JETAIT : ni l'un ni l'autre n'était envoyé à
 * la mutation. Un champ qu'on remplit pour rien est pire qu'un champ absent, il
 * apprend au lecteur que ses réponses ne servent à rien.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LES DEUX FACULTATIFS SONT PARTIS AUSSI
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * « Factures émises par an » : à cet instant précis, il n'y a encore AUCUNE
 * facture — et l'aide disait déjà que le palier le plus bas s'applique sans
 * lui. Le produit les importe ensuite, et les compte : la page de
 * l'établissement affiche cette mesure, avec sa fenêtre, et garde une saisie
 * pour corriger.
 *
 * « SIRET » : le même numéro se saisissait TROIS fois, dans deux champs
 * différents, pour n'être lu qu'une seule — sur `profilsCreancier.siren`, que
 * le décompte et le verrou de l'accueil lisent. Celui-ci écrivait
 * `organizations.siret`, qu'aucune règle du domaine ne consulte. Il se saisit
 * désormais une fois, sur la page du créancier, où le registre public le
 * propose sur le nom de l'entreprise.
 *
 * Le numéro déjà en base n'est pas perdu : la page du créancier s'en sert comme
 * valeur de départ tant qu'aucun SIREN n'y a été enregistré.
 */
function Bienvenue() {
	const navigate = useNavigate();
	const creer = useMutation(api.organizations.createOrganization);

	const [nom, setNom] = useState('');
	const [enCours, setEnCours] = useState(false);
	const [erreur, setErreur] = useState<string | null>(null);

	async function soumettre(e: FormEvent) {
		e.preventDefault();
		if (!nom.trim()) return;
		setErreur(null);
		setEnCours(true);
		try {
			await creer({ name: nom.trim() });
			await navigate({ to: '/app' });
		} catch {
			setErreur(
				"Votre entreprise n'a pas pu être créée. Réessayez ; si le problème persiste, écrivez-nous."
			);
		} finally {
			setEnCours(false);
		}
	}

	return (
		<CadreAuth
			large
			titre="Votre entreprise"
			explication="Son nom suffit pour commencer : déposez vos premières factures, et nous lirons le reste dedans."
		>
			<form onSubmit={soumettre} className="flex flex-col gap-cladd-2xs">
				<Champ etiquette="Nom de l’entreprise">
					<Input value={nom} onChange={setNom} name="organisation" required />
				</Champ>

				{erreur ? <MessageErreur>{erreur}</MessageErreur> : null}

				<BoutonPrincipal type="submit" loading={enCours} readOnly={enCours}>
					Créer mon entreprise
				</BoutonPrincipal>
			</form>
		</CadreAuth>
	);
}
