import { useState, type ReactNode } from 'react';
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useQuery, useMutation } from 'convex/react';
import {
	Button,
	Input,
	ListButton,
	Surface,
	SectionTitle,
	Segmented,
	SegmentedButton
} from '@cladd-ui/react';
import {
	CheckIcon,
	ChevronRightIcon,
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
import { BoutonPrincipal, CarteListe, Page, PageHeader, PageBody, Champ } from '../../ui';
import { FormulaireCreancier } from '../../screens/parametres/creancier';

/**
 * LES TROIS ÉCRANS QU'ON ATTEINT PAR LES RÉGLAGES.
 *
 * Table plutôt que trois blocs recopiés : c'est ce qui garantit qu'ils
 * gardent la même forme, et qu'en ajouter un quatrième ne demande pas de se
 * souvenir de la géométrie des trois autres.
 */
const AILLEURS = [
	{
		to: '/app/abonnement' as const,
		titre: 'Votre abonnement',
		aide: 'Votre offre dépend du nombre de factures que vous émettez chaque année.',
		Icone: CreditCardIcon
	},
	{
		to: '/app/equipe' as const,
		titre: 'Votre équipe',
		aide: 'Celui qui dépose les factures et celui qui décide sont rarement la même personne.',
		Icone: UsersIcon
	},
	{
		to: '/app/donnees' as const,
		titre: 'Vos données',
		aide: 'Ce que nous détenons, en clair. À emporter, ou à effacer définitivement.',
		Icone: DatabaseIcon
	}
];

export const Route = createFileRoute('/app/parametres')({ component: Parametres });

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
				variant="transparent"
				outline={false}
				className="verre-carte rounded-cladd-xl"
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
	const profil = useQuery(api.recouvrement.profil.monProfil, {});
	const enregistrerProfil = useMutation(api.recouvrement.profil.enregistrer);
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
				<div className="mx-auto flex w-full max-w-160 flex-col gap-cladd-2xs">
					{org ? (
						<FormulaireEtablissement
							key={org._id}
							initial={{
								nom: org.name ?? '',
								factures: org.facturesParAn ? String(org.facturesParAn) : '',
								siret: org.siret ?? ''
							}}
							onEnregistrer={mettreAJour}
						/>
					) : null}

					{profil === undefined ? null : (
						<FormulaireCreancier
							key={profil?.denomination ?? 'vide'}
							initial={{
								denomination: profil?.denomination ?? org?.name ?? '',
								siren: profil?.siren ?? '',
								adresse: profil?.adresse ?? '',
								estCommercant: profil?.estCommercant ?? 'unknown'
							}}
							onEnregistrer={enregistrerProfil}
						/>
					)}

					<Reglage titre="Apparence">
						{/*
						  ⚠️ CE TEXTE DISAIT L'INVERSE DE LA VÉRITÉ. Il affirmait que
						  « l'affichage clair est le réglage par défaut », alors que le
						  défaut est passé au sombre. Personne ne l'avait vu parce qu'un
						  texte d'interface ne casse aucun test — c'est la même famille de
						  défaut que le logo qui illustrait une verticale supprimée.
						*/}
						<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
							Le sombre est le réglage par défaut : on passe des heures sur cet écran, assis, devant
							un écran de bureau. Le clair reste servi et entretenu, pour qui travaille près
							d&rsquo;une fenêtre ou imprime ses décomptes.
						</p>
						{/* Deux états exclusifs : c'est un `Segmented`, pas un bouton qui
						    annonce la bascule. « Passer en sombre » oblige à déduire l'état
						    courant depuis l'action proposée, ce qui se lit à l'envers. */}
						<Segmented className="self-start" activeColor="neutral" activeVariant="solid">
							<SegmentedButton active={theme === 'dark'} onClick={() => setTheme('dark')}>
								<MoonIcon />
								Sombre
							</SegmentedButton>
							<SegmentedButton active={theme === 'light'} onClick={() => setTheme('light')}>
								<SunIcon />
								Clair
							</SegmentedButton>
						</Segmented>
					</Reglage>

					{/*
					  ═════════════════════════════════════════════════════════════════
					  LES TROIS AILLEURS, EN TROIS RANGÉES — ET PLUS EN TROIS CARTES
					  ═════════════════════════════════════════════════════════════════

					  L'abonnement, l'équipe et les données entrent par ici plutôt que par
					  trois onglets de plus : ce sont des écrans qu'on ouvre deux fois par
					  an, et chaque dizaine de pixels que la barre prend en hauteur est une
					  rangée de cartes en moins sur une tablette en paysage.

					  ⚠️ MAIS CHACUN AVAIT SA CARTE, SON TITRE, SON PARAGRAPHE ET SON
					  BOUTON. Trois blocs de cent-soixante pixels pour ce qui est, en
					  vérité, trois LIENS. Mesuré sur un téléphone, ça repoussait la
					  déconnexion à un écran et demi de défilement.

					  Une carte, trois rangées. L'explication descend en sous-titre : elle
					  reste lisible, elle cesse d'être un paragraphe. C'est le motif de
					  tous les écrans de réglages relevés.
					*/}
					<section className="flex flex-col gap-cladd-3xs">
						<SectionTitle>Aller plus loin</SectionTitle>
						<CarteListe>
							{AILLEURS.map(({ to, titre, aide, Icone }) => (
								<ListButton
									key={to}
									as={Link}
									to={to}
									icon={<Icone />}
									footer={aide}
									after={<ChevronRightIcon size={16} className="shrink-0 text-cladd-fg-softest" />}
								>
									{titre}
								</ListButton>
							))}
						</CarteListe>
					</section>

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
	initial: { nom: string; factures: string; siret: string };
	onEnregistrer: (args: {
		name: string;
		facturesParAn?: number;
		siret?: string;
	}) => Promise<unknown>;
}) {
	const [nom, setNom] = useState(initial.nom);
	const [factures, setFactures] = useState(initial.factures);
	const [siret, setSiret] = useState(initial.siret);
	const [enCours, setEnCours] = useState(false);
	const [enregistre, setEnregistre] = useState(false);

	async function enregistrer() {
		if (!nom.trim()) return;
		setEnCours(true);
		try {
			const nb = Number.parseInt(factures, 10);
			await onEnregistrer({
				name: nom.trim(),

				...(Number.isFinite(nb) && nb > 0 ? { facturesParAn: nb } : {}),
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

			<div className="grid gap-cladd-2xs sm:grid-cols-2">
				<Champ
					etiquette="Factures émises par an"
					aide="Sert à dimensionner votre abonnement, jamais à limiter le produit."
				>
					<Input type="number" value={factures} onChange={setFactures} name="factures" />
				</Champ>

				<Champ
					etiquette="SIREN"
					aide="Il identifie votre entreprise sur les actes. Sans lui, aucune procédure ne peut être engagée."
				>
					<Input value={siret} onChange={setSiret} name="siret" />
				</Champ>
			</div>

			<BoutonPrincipal
				className="self-start"
				loading={enCours}
				readOnly={enCours}
				onClick={() => void enregistrer()}
			>
				{enregistre ? <CheckIcon /> : null}
				{enregistre ? 'Enregistré' : 'Enregistrer'}
			</BoutonPrincipal>
		</Reglage>
	);
}
