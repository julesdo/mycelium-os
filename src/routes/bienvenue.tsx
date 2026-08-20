import { useState, type FormEvent } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMutation } from 'convex/react';
import { Button, Input } from '@cladd-ui/react';
import { api } from '../lib/convex/_generated/api';
import { cn } from '../ui';

export const Route = createFileRoute('/bienvenue')({ component: Bienvenue });

const TYPES = [
	{ cle: 'RIE', nom: 'Restaurant inter-entreprises' },
	{ cle: 'CLINIQUE', nom: 'Clinique ou établissement de santé' },
	{ cle: 'EHPAD', nom: 'EHPAD' },
	{ cle: 'CRECHE', nom: 'Crèche' },
	{ cle: 'ECOLE_PRIVEE', nom: 'École privée' },
	{ cle: 'AUTRE', nom: 'Autre' }
] as const;

type TypeEtablissement = (typeof TYPES)[number]['cle'];

/**
 * La création de l'établissement.
 *
 * Quatre informations, dont deux facultatives. Tout le reste se déduit des
 * factures, et c'est le principe du produit : on ne demande jamais une saisie
 * que le logiciel peut aller chercher lui-même.
 *
 * Le SIRET en particulier n'est pas exigé ici. Il ne sert qu'à la
 * télédéclaration, en mars, et bloquer l'entrée dans le produit sur un numéro
 * que personne n'a en tête au moment de s'inscrire ferait perdre des clients
 * pour rien.
 */
function Bienvenue() {
	const navigate = useNavigate();
	const creer = useMutation(api.organizations.createOrganization);

	const [nom, setNom] = useState('');
	const [type, setType] = useState<TypeEtablissement>('RIE');
	const [couverts, setCouverts] = useState('');
	const [siret, setSiret] = useState('');
	const [enCours, setEnCours] = useState(false);
	const [erreur, setErreur] = useState<string | null>(null);

	async function soumettre(e: FormEvent) {
		e.preventDefault();
		if (!nom.trim()) return;
		setErreur(null);
		setEnCours(true);
		try {
			const nb = Number.parseInt(couverts, 10);
			await creer({
				name: nom.trim(),
				etablissementType: type,
				...(Number.isFinite(nb) && nb > 0 ? { couvertsJour: nb } : {}),
				...(siret.trim() ? { siret: siret.replace(/\s/g, '') } : {})
			});
			await navigate({ to: '/app' });
		} catch {
			setErreur(
				"Votre établissement n'a pas pu être créé. Réessayez ; si le problème persiste, écrivez-nous."
			);
		} finally {
			setEnCours(false);
		}
	}

	return (
		<div className="flex min-h-dvh items-center justify-center p-cladd-xs">
			<form onSubmit={soumettre} className="flex w-full max-w-lg flex-col gap-cladd-xs">
				<div>
					<h1 className="text-cladd-md font-semibold tracking-tight">Votre établissement</h1>
					<p className="mt-1 text-cladd-xs leading-relaxed text-cladd-fg-soft">
						Quatre informations, et vous pourrez déposer vos premières factures. Le reste, nous
						le lirons dedans.
					</p>
				</div>

				<label className="flex flex-col gap-1">
					<span className="text-cladd-3xs font-semibold tracking-wide text-cladd-fg-softer uppercase">
						Nom de l&rsquo;établissement
					</span>
					<Input value={nom} onChange={setNom} name="organisation" required />
				</label>

				<div className="flex flex-col gap-cladd-3xs">
					<span className="text-cladd-3xs font-semibold tracking-wide text-cladd-fg-softer uppercase">
						Type d&rsquo;établissement
					</span>
					<div className="flex flex-wrap gap-cladd-3xs">
						{TYPES.map((t) => (
							<button
								key={t.cle}
								type="button"
								onClick={() => setType(t.cle)}
								aria-pressed={type === t.cle}
								className={cn(
									'min-h-cladd-lg rounded-cladd-md border px-cladd-3xs text-cladd-xs font-medium transition-colors',
									type === t.cle
										? 'border-cladd-primary bg-cladd-primary text-cladd-on-primary'
										: 'border-cladd-outline hover:bg-cladd-surface'
								)}
							>
								{t.nom}
							</button>
						))}
					</div>
				</div>

				<label className="flex flex-col gap-1">
					<span className="text-cladd-3xs font-semibold tracking-wide text-cladd-fg-softer uppercase">
						Couverts par jour
					</span>
					<Input
						type="number"
						value={couverts}
						onChange={setCouverts}
						name="couverts"
						placeholder="300"
					/>
					<span className="text-cladd-3xs text-cladd-fg-softer">
						Une estimation suffit. Elle sert à situer votre établissement, pas à calculer vos
						taux.
					</span>
				</label>

				<label className="flex flex-col gap-1">
					<span className="text-cladd-3xs font-semibold tracking-wide text-cladd-fg-softer uppercase">
						SIRET (facultatif)
					</span>
					<Input value={siret} onChange={setSiret} name="siret" placeholder="123 456 789 00012" />
					<span className="text-cladd-3xs text-cladd-fg-softer">
						Utile en mars, pour la télédéclaration. Vous pourrez l&rsquo;ajouter plus tard.
					</span>
				</label>

				{erreur ? (
					<p role="alert" className="text-cladd-2xs text-seuil-manque">
						{erreur}
					</p>
				) : null}

				<Button type="submit" color="brand" variant="solid-fill" loading={enCours}>
					Créer mon établissement
				</Button>
			</form>
		</div>
	);
}
