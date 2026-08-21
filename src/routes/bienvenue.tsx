import { useState, type FormEvent } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMutation } from 'convex/react';
import { Button, Input, SectionTitle, ToggleGroup, ToggleButton } from '@cladd-ui/react';
import { api } from '../lib/convex/_generated/api';
import { CadreAuth, Champ, MessageErreur } from '../ui';

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
		<CadreAuth
			large
			titre="Votre établissement"
			explication="Quatre informations, et vous pourrez déposer vos premières factures. Le reste, nous le lirons dedans."
		>
			<form onSubmit={soumettre} className="flex flex-col gap-cladd-2xs">
				<Champ etiquette="Nom de l’établissement">
					<Input value={nom} onChange={setNom} name="organisation" required />
				</Champ>

				<div className="flex flex-col gap-cladd-3xs">
					<SectionTitle>Type d&rsquo;établissement</SectionTitle>
					<ToggleGroup
						value={type}
						onValueChange={(v) => {
							// Un groupe simple se déselectionne au second clic ; un type
							// d'établissement est obligatoire, donc on ignore le vide.
							if (typeof v === 'string') setType(v as TypeEtablissement);
						}}
						className="flex flex-wrap gap-cladd-3xs"
					>
						{TYPES.map((t) => (
							<ToggleButton key={t.cle} value={t.cle}>
								{t.nom}
							</ToggleButton>
						))}
					</ToggleGroup>
				</div>

				<Champ
					etiquette="Couverts par jour"
					aide="Une estimation suffit. Elle sert à situer votre établissement, pas à calculer vos taux."
				>
					<Input
						type="number"
						value={couverts}
						onChange={setCouverts}
						name="couverts"
						placeholder="300"
					/>
				</Champ>

				<Champ
					etiquette="SIRET (facultatif)"
					aide="Utile en mars, pour la télédéclaration. Vous pourrez l’ajouter plus tard."
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
					Créer mon établissement
				</Button>
			</form>
		</CadreAuth>
	);
}
