import { useState, type ReactNode } from 'react';
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useQuery, useMutation } from 'convex/react';
import {
	Button,
	Input,
	Surface,
	SectionTitle,
	Segmented,
	SegmentedButton,
	ToggleGroup,
	ToggleButton
} from '@cladd-ui/react';
import {
	CheckIcon,
	CreditCardIcon,
	DatabaseIcon,
	LogOutIcon,
	MoonIcon,
	SunIcon,
	UsersIcon
} from 'lucide-react';
import { api } from '../../lib/convex/_generated/api';
import { authClient } from '../../lib/client/auth';
import { useTheme } from '../../app/use-theme';
import { Page, PageHeader, PageBody, Champ } from '../../ui';

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

/**
 * Une section de réglages, dans sa carte.
 *
 * Les sections étaient séparées par des filets et de grands vides. Sur un écran
 * qui en compte trois, ça se lit comme une page qui n'a pas fini de charger :
 * une carte par sujet dit d'un coup d'œil combien il y en a, et où l'un
 * s'arrête.
 */
function Reglage({ titre, children }: { titre: string; children: ReactNode }) {
	return (
		<section className="flex flex-col gap-cladd-3xs">
			<SectionTitle>{titre}</SectionTitle>
			<Surface
				outline
				className="rounded-cladd-2xl shadow-carte"
				contentClassName="flex flex-col gap-cladd-2xs p-cladd-2xs"
			>
				{children}
			</Surface>
		</section>
	);
}

function Parametres() {
	const navigate = useNavigate();
	const org = useQuery(api.organizations.getMyOrg, {});
	const mettreAJour = useMutation(api.organizations.updateOrganization);
	const { theme, setTheme } = useTheme();

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
				<div className="flex max-w-160 flex-col gap-cladd-2xs">
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

					<Reglage titre="Apparence">
						<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
							L&rsquo;affichage clair est le réglage par défaut : il se lit mieux en plein jour, sur
							une tablette à fort reflet.
						</p>
						{/* Deux états exclusifs : c'est un `Segmented`, pas un bouton qui
						    annonce la bascule. « Passer en sombre » oblige à déduire l'état
						    courant depuis l'action proposée, ce qui se lit à l'envers. */}
						<Segmented className="self-start" activeColor="neutral" activeVariant="solid">
							<SegmentedButton active={theme === 'light'} onClick={() => setTheme('light')}>
								<SunIcon />
								Clair
							</SegmentedButton>
							<SegmentedButton active={theme === 'dark'} onClick={() => setTheme('dark')}>
								<MoonIcon />
								Sombre
							</SegmentedButton>
						</Segmented>
					</Reglage>

					{/*
					  L'abonnement entre PAR ICI et non par un cinquième onglet. La barre
					  de navigation porte déjà quatre entrées, une recherche, un dépôt et
					  un sélecteur d'établissement ; chaque dizaine de pixels qu'elle prend
					  en hauteur est une rangée de cartes en moins sur une tablette en
					  paysage. Un réglage se range avec les réglages.
					*/}
					<Reglage titre="Votre abonnement">
						<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
							Votre offre et son tarif dépendent du nombre de couverts que vous servez chaque jour.
							Le produit est le même à tous les paliers.
						</p>
						<Button as={Link} to="/app/abonnement" className="self-start">
							<CreditCardIcon />
							Voir mon abonnement
						</Button>
					</Reglage>

					<Reglage titre="Votre équipe">
						<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
							Celui qui dépose les factures et celui qui signe la déclaration sont rarement la même
							personne. Invitez vos collègues : ils verront les mêmes taux, au même moment.
						</p>
						<Button as={Link} to="/app/equipe" className="self-start">
							<UsersIcon />
							Gérer l&rsquo;équipe
						</Button>
					</Reglage>

					{/*
					  « Vos données » entre par ici, comme l'abonnement. C'est un écran
					  qu'on ouvre deux fois par an — pour un export, ou pour partir — et
					  lui donner un onglet coûterait une rangée de cartes sur la tablette,
					  sur tous les écrans de travail.
					*/}
					<Reglage titre="Vos données">
						<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
							Ce que nous détenons pour vous, en clair. Vous pouvez l&rsquo;emporter dans un fichier
							lisible par machine, ou tout effacer définitivement.
						</p>
						<Button as={Link} to="/app/donnees" className="self-start">
							<DatabaseIcon />
							Voir mes données
						</Button>
					</Reglage>

					<Reglage titre="Votre compte">
						<Button
							className="self-start"
							onClick={() => {
								void authClient.signOut().then(() => navigate({ to: '/connexion' }));
							}}
						>
							<LogOutIcon />
							Se déconnecter
						</Button>
					</Reglage>
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
		<Reglage titre="Votre établissement">
			<Champ etiquette="Nom">
				<Input value={nom} onChange={setNom} name="organisation" />
			</Champ>

			<div className="flex flex-col gap-cladd-3xs">
				<span className="text-cladd-2xs font-semibold text-cladd-fg-soft">Type</span>
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

			<div className="grid gap-cladd-2xs sm:grid-cols-2">
				<Champ etiquette="Couverts par jour">
					<Input type="number" value={couverts} onChange={setCouverts} name="couverts" />
				</Champ>

				<Champ
					etiquette="SIRET"
					aide="Nécessaire à la télédéclaration de mars, pas au calcul de vos taux."
				>
					<Input value={siret} onChange={setSiret} name="siret" />
				</Champ>
			</div>

			<Button
				className="self-start"
				color="brand"
				variant="solid-fill"
				loading={enCours}
				readOnly={enCours}
				onClick={() => void enregistrer()}
			>
				{enregistre ? <CheckIcon /> : null}
				{enregistre ? 'Enregistré' : 'Enregistrer'}
			</Button>
		</Reglage>
	);
}
