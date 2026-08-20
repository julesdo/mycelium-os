import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation } from 'convex/react';
import { Button, Input } from '@cladd-ui/react';
import { CheckIcon, LogOutIcon, MoonIcon, SunIcon } from 'lucide-react';
import { api } from '../../lib/convex/_generated/api';
import { authClient } from '../../lib/client/auth';
import { useTheme } from '../../app/use-theme';
import { Page, PageHeader, PageBody, cn } from '../../ui';

export const Route = createFileRoute('/app/parametres')({ component: Parametres });

const TYPES = [
	{ cle: 'RIE', nom: 'Restaurant inter-entreprises' },
	{ cle: 'CLINIQUE', nom: 'Clinique ou établissement de santé' },
	{ cle: 'EHPAD', nom: 'EHPAD' },
	{ cle: 'CRECHE', nom: 'Crèche' },
	{ cle: 'ECOLE_PRIVEE', nom: 'École privée' },
	{ cle: 'AUTRE', nom: 'Autre' }
] as const;

type TypeEtablissement = (typeof TYPES)[number]['cle'];

function Parametres() {
	const navigate = useNavigate();
	const org = useQuery(api.organizations.getMyOrg, {});
	const mettreAJour = useMutation(api.organizations.updateOrganization);
	const { theme, basculer } = useTheme();

	if (org === undefined) {
		return (
			<Page>
				<PageHeader titre="Réglages" />
				<PageBody>
					<p className="text-cladd-xs text-cladd-fg-soft">Chargement…</p>
				</PageBody>
			</Page>
		);
	}

	return (
		<Page>
			<PageHeader titre="Réglages" sousTitre="Votre établissement et votre compte." />
			<PageBody>
				<div className="flex max-w-lg flex-col gap-cladd-xl">
					{org ? (
						<FormulaireEtablissement
							key={org._id}
							initial={{
								nom: org.name ?? '',
								type: (org.etablissementType as TypeEtablissement | undefined) ?? 'AUTRE',
								couverts: org.couvertsJour ? String(org.couvertsJour) : '',
								siret: org.siret ?? ''
							}}
							onEnregistrer={mettreAJour}
						/>
					) : null}

					<section className="flex flex-col gap-cladd-3xs">
						<h2 className="text-cladd-3xs font-semibold tracking-wide text-cladd-fg-softer uppercase">
							Apparence
						</h2>
						<p className="text-cladd-xs text-cladd-fg-soft">
							L&rsquo;affichage clair est le réglage par défaut : il se lit mieux en plein jour,
							sur une tablette à fort reflet.
						</p>
						<div>
							<Button variant="gradient" onClick={basculer}>
								{theme === 'dark' ? <SunIcon /> : <MoonIcon />}
								{theme === 'dark' ? 'Passer en clair' : 'Passer en sombre'}
							</Button>
						</div>
					</section>

					<section className="flex flex-col gap-cladd-3xs border-t border-cladd-outline pt-cladd-xs">
						<h2 className="text-cladd-3xs font-semibold tracking-wide text-cladd-fg-softer uppercase">
							Votre compte
						</h2>
						<div>
							<Button
								variant="gradient"
								onClick={() => {
									void authClient.signOut().then(() => navigate({ to: '/connexion' }));
								}}
							>
								<LogOutIcon />
								Se déconnecter
							</Button>
						</div>
					</section>
				</div>
			</PageBody>
		</Page>
	);
}

/**
 * Le formulaire de l'établissement.
 *
 * Isolé dans son propre composant et monté avec une `key` sur l'identifiant de
 * l'organisation : c'est ce qui garantit que ses champs se réinitialisent si le
 * gérant change d'établissement, sans effet de synchronisation.
 */
function FormulaireEtablissement({
	initial,
	onEnregistrer
}: {
	initial: { nom: string; type: TypeEtablissement; couverts: string; siret: string };
	onEnregistrer: (args: {
		name: string;
		etablissementType?: TypeEtablissement;
		couvertsJour?: number;
		siret?: string;
	}) => Promise<unknown>;
}) {
	const [nom, setNom] = useState(initial.nom);
	const [type, setType] = useState<TypeEtablissement>(initial.type);
	const [couverts, setCouverts] = useState(initial.couverts);
	const [siret, setSiret] = useState(initial.siret);
	const [enCours, setEnCours] = useState(false);
	const [enregistre, setEnregistre] = useState(false);

	async function enregistrer() {
		if (!nom.trim()) return;
		setEnCours(true);
		try {
			const nb = Number.parseInt(couverts, 10);
			await onEnregistrer({
				name: nom.trim(),
				etablissementType: type,
				...(Number.isFinite(nb) && nb > 0 ? { couvertsJour: nb } : {}),
				...(siret.trim() ? { siret: siret.replace(/\s/g, '') } : {})
			});
			setEnregistre(true);
			window.setTimeout(() => setEnregistre(false), 2000);
		} finally {
			setEnCours(false);
		}
	}

	return (
		<section className="flex flex-col gap-cladd-xs">
			<h2 className="text-cladd-3xs font-semibold tracking-wide text-cladd-fg-softer uppercase">
				Votre établissement
			</h2>

			<label className="flex flex-col gap-1">
				<span className="text-cladd-2xs font-medium text-cladd-fg-soft">Nom</span>
				<Input value={nom} onChange={setNom} name="organisation" />
			</label>

			<div className="flex flex-col gap-cladd-3xs">
				<span className="text-cladd-2xs font-medium text-cladd-fg-soft">Type</span>
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
				<span className="text-cladd-2xs font-medium text-cladd-fg-soft">Couverts par jour</span>
				<Input type="number" value={couverts} onChange={setCouverts} name="couverts" />
			</label>

			<label className="flex flex-col gap-1">
				<span className="text-cladd-2xs font-medium text-cladd-fg-soft">SIRET</span>
				<Input value={siret} onChange={setSiret} name="siret" />
				<span className="text-cladd-3xs text-cladd-fg-softer">
					Nécessaire à la télédéclaration de mars, pas au calcul de vos taux.
				</span>
			</label>

			<div>
				<Button
					color="brand"
					variant="solid-fill"
					loading={enCours}
					onClick={() => void enregistrer()}
				>
					{enregistre ? <CheckIcon /> : null}
					{enregistre ? 'Enregistré' : 'Enregistrer'}
				</Button>
			</div>
		</section>
	);
}
