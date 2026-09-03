import { useState, type FormEvent } from 'react';
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useMutation, Authenticated, Unauthenticated, AuthLoading } from 'convex/react';
import { Button, Input } from '@cladd-ui/react';
import { api } from '../lib/convex/_generated/api';
import { CadreAuth, Champ, MessageErreur } from '../ui';

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
					<Button as={Link} to="/connexion" color="brand" variant="solid-fill">
						Se connecter
					</Button>
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
 * Trois informations, dont deux facultatives. Tout le reste se déduit des
 * factures, et c'est le principe du produit : on ne demande jamais une saisie
 * que le logiciel peut aller chercher lui-même.
 *
 * CE QUI A ÉTÉ RETIRÉ, ET POURQUOI ÇA COMPTE. Cet écran demandait un type
 * d'établissement — restaurant inter-entreprises, EHPAD, crèche — et un nombre
 * de couverts par jour, puis les JETAIT : ni l'un ni l'autre n'était envoyé à
 * la mutation. Un champ qu'on remplit pour rien est pire qu'un champ absent, il
 * apprend au lecteur que ses réponses ne servent à rien.
 *
 * Le volume de factures, lui, part vraiment, et ne sert qu'à une chose : situer
 * le palier d'abonnement. Le SIRET n'est pas exigé à l'entrée, parce que
 * bloquer l'accès au produit sur un numéro que personne n'a en tête au moment
 * de s'inscrire ferait perdre des clients pour rien.
 */
function Bienvenue() {
	const navigate = useNavigate();
	const creer = useMutation(api.organizations.createOrganization);

	const [nom, setNom] = useState('');
	const [facturesParAn, setFacturesParAn] = useState('');
	const [siret, setSiret] = useState('');
	const [enCours, setEnCours] = useState(false);
	const [erreur, setErreur] = useState<string | null>(null);

	async function soumettre(e: FormEvent) {
		e.preventDefault();
		if (!nom.trim()) return;
		setErreur(null);
		setEnCours(true);
		try {
			// LE VOLUME N'EST ENVOYÉ QUE S'IL EST EXPLOITABLE. Un champ laissé vide,
			// ou rempli de travers, ne doit pas se transformer en zéro : zéro facture
			// par an est une déclaration, pas une absence de déclaration — et c'est
			// elle qui déciderait du palier facturé.
			const volume = Number.parseInt(facturesParAn, 10);

			await creer({
				name: nom.trim(),
				...(Number.isFinite(volume) && volume > 0 ? { facturesParAn: volume } : {}),
				...(siret.trim() ? { siret: siret.replace(/\s/g, '') } : {})
			});
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
			explication="Trois informations, dont deux facultatives, et vous pourrez déposer vos premières factures. Le reste, nous le lirons dedans."
		>
			<form onSubmit={soumettre} className="flex flex-col gap-cladd-2xs">
				<Champ etiquette="Nom de l’entreprise">
					<Input value={nom} onChange={setNom} name="organisation" required />
				</Champ>

				<Champ
					etiquette="Factures émises par an (facultatif)"
					aide="Une estimation suffit. Elle détermine votre palier d’abonnement, rien d’autre — sans elle, c’est le palier le plus bas qui s’applique."
				>
					<Input
						type="number"
						value={facturesParAn}
						onChange={setFacturesParAn}
						name="facturesParAn"
						placeholder="1200"
					/>
				</Champ>

				<Champ
					etiquette="SIRET (facultatif)"
					aide="Il figurera sur vos décomptes et vos courriers. Vous pourrez l’ajouter plus tard."
				>
					<Input value={siret} onChange={setSiret} name="siret" placeholder="123 456 789 00012" />
				</Champ>

				{erreur ? <MessageErreur>{erreur}</MessageErreur> : null}

				<Button
					type="submit"
					color="brand"
					variant="solid-fill"
					size="lg"
					loading={enCours}
					readOnly={enCours}
				>
					Créer mon entreprise
				</Button>
			</form>
		</CadreAuth>
	);
}
