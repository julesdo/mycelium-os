import { useState, type FormEvent } from 'react';
import { Link } from '@tanstack/react-router';
import { useMutation } from 'convex/react';
import { Input, Textarea } from '@cladd-ui/react';
import { ArrowRightIcon, CheckIcon } from 'lucide-react';
import { api } from '../lib/convex/_generated/api';
import { JOURS_OFFRE_DE_BIENVENUE, OFFRES } from '../lib/config/tarifs';
import type { OffreDemandable } from '../lib/crm/demande';
import { ANNEES_DE_CONSERVATION } from '../lib/crm/consentement';
import { suivre } from '../app/analytique';
import { BoutonPrincipal, FeuillePleinEcran } from '../ui';
import { Chapeau, SectionMarketing, TitreSection } from './section';

/**
 * LES OFFRES SUR DEMANDE (19/10/2026, audit stratégique, lot 6).
 *
 * Le diagnostic complet, la réclamation clé en main, le pilote et l'offre fondateurs ne
 * sont pas des formules : ils se demandent, et le fondateur répond par un devis
 * (décision 3, hors Paddle). Chaque carte lit son prix dans la grille
 * (\`config/tarifs.ts\`), et « Demander » crée le prospect au CRM avec son parcours.
 *
 * ⚠️ AUCUN COMPTE À REBOURS, AUCUN PRIX BARRÉ (décision 10) : « jusqu'au 31 décembre »
 * s'écrit en clair. Et rien ne promet un recouvrement : la réclamation prépare des
 * courriers à votre nom, que vous signez et envoyez.
 */

const EN_LETTRES: Readonly<Record<number, string>> = {
	1: 'un',
	2: 'deux',
	3: 'trois',
	4: 'quatre',
	5: 'cinq',
	6: 'six'
};

/** « trois » plutôt que « 3 » dans une phrase. */
function enLettres(n: number): string {
	return EN_LETTRES[n] ?? String(n);
}

function euros(centimes: number): string {
	return `${new Intl.NumberFormat('fr-FR').format(centimes / 100)} €`.replace(/\s/g, ' ');
}

function dateLongue(iso: string): string {
	return new Date(`${iso}T12:00:00Z`).toLocaleDateString('fr-FR', {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
		timeZone: 'UTC'
	});
}

interface CarteDOffre {
	readonly cle: OffreDemandable;
	readonly pour: string;
	readonly prix: string;
	readonly conditions: readonly string[];
}

function cartes(): readonly CarteDOffre[] {
	const d = OFFRES.diagnosticComplet;
	const r = OFFRES.reclamation;
	const p = OFFRES.pilote;
	const f = OFFRES.fondateurs;
	return [
		{
			cle: 'diagnosticComplet',
			pour: 'Tout votre historique, chiffré facture par facture, payées en retard comprises, et un rapport à votre nom.',
			prix: `${euros(d.prixCentimes)} HT`,
			conditions: [
				`Remboursé si moins de ${euros(d.rembourseSousCentimes)} sont identifiés.`,
				`Puis ${d.remiseBienvenuePourcent} % sur vos ${enLettres(d.remiseBienvenueMois)} premiers mois de formule, pendant ${JOURS_OFFRE_DE_BIENVENUE} jours.`
			]
		},
		{
			cle: 'reclamation',
			pour: 'Vous fournissez des hôpitaux ou des collectivités : les pénalités de retard (« intérêts moratoires ») calculées facture par facture, et les courriers à votre nom, prêts à signer.',
			prix: `${r.pourcent} % du montant calculé`,
			conditions: [
				`Entre ${euros(r.minimumCentimes)} et ${euros(r.maximumCentimes)} HT, payés d’avance.`,
				'Vous relisez, vous signez, vous envoyez : votre client vous paie directement.'
			]
		},
		{
			cle: 'pilote',
			pour: 'Votre logiciel n’a pas de connecteur (Sage, Cegid, EBP) : la mise en place de vos données et de votre poste client, avec vous.',
			prix: `${euros(p.prixCentimes)} HT`,
			conditions: [`${p.dureeJours} jours, la formule Pro comprise pendant le pilote.`]
		},
		{
			cle: 'fondateurs',
			pour: `Pro à l’année, prix bloqué à vie, pour les ${f.places} premières entreprises.`,
			prix: `${euros(f.prixCentimes)} HT par an`,
			conditions: [`Jusqu’au ${dateLongue(f.jusquAu)}.`]
		}
	];
}

/** Le formulaire d'une offre, dans sa feuille : cinq champs, et la mention qui dit à quoi ils servent. */
function FeuilleDeDemande({
	offre,
	onFermer
}: {
	readonly offre: OffreDemandable | null;
	readonly onFermer: () => void;
}) {
	const demander = useMutation(api.demandes.demanderUneOffre);
	const [champs, setChamps] = useState({
		nom: '',
		entreprise: '',
		email: '',
		telephone: '',
		message: '',
		piege: ''
	});
	const [etat, setEtat] = useState<'saisie' | 'envoi' | 'fait'>('saisie');
	const [erreur, setErreur] = useState<string | null>(null);
	const nomDeLOffre = offre === null ? '' : OFFRES[offre].nom;

	async function envoyer(e: FormEvent) {
		e.preventDefault();
		if (offre === null) return;
		setErreur(null);
		setEtat('envoi');
		try {
			const r = await demander({ offre, ...champs });
			if (r.ok) {
				setEtat('fait');
				suivre('offre-demandee', { offre });
			} else {
				setErreur(r.erreur);
				setEtat('saisie');
			}
		} catch {
			setErreur('La demande n’est pas partie. Réessayez dans un instant.');
			setEtat('saisie');
		}
	}

	const champ = (cle: keyof typeof champs) => ({
		value: champs[cle],
		onChange: (valeur: string) => setChamps((c) => ({ ...c, [cle]: valeur }))
	});

	return (
		<FeuillePleinEcran
			ouverte={offre !== null}
			onFermer={onFermer}
			titre="Demander"
			sousTitre={nomDeLOffre}
			pied={
				etat === 'fait' ? (
					<BoutonPrincipal pleineLargeur onClick={onFermer}>
						Fermer
					</BoutonPrincipal>
				) : (
					<BoutonPrincipal
						pleineLargeur
						type="submit"
						form="demande-offre"
						disabled={etat === 'envoi'}
					>
						Envoyer ma demande
					</BoutonPrincipal>
				)
			}
		>
			{etat === 'fait' ? (
				<div className="flex flex-col items-center gap-cladd-2xs py-cladd-sm text-center">
					<span className="flex size-12 items-center justify-center rounded-full bg-teinte-argent">
						<CheckIcon aria-hidden />
					</span>
					<p className="text-cladd-md font-semibold">Votre demande est notée.</p>
					<p className="text-cladd-sm leading-relaxed text-encre-site-douce">
						Nous vous répondons par e-mail, à {champs.email.trim()}, avec un devis.
					</p>
				</div>
			) : (
				<form
					id="demande-offre"
					onSubmit={(e) => void envoyer(e)}
					className="flex flex-col gap-cladd-xs"
				>
					<label className="flex flex-col gap-1.5">
						<span className="text-cladd-sm font-semibold">Votre entreprise</span>
						<Input
							{...champ('entreprise')}
							inputComponentProps={{ autoComplete: 'organization' }}
						/>
					</label>
					<label className="flex flex-col gap-1.5">
						<span className="text-cladd-sm font-semibold">Votre nom</span>
						<Input {...champ('nom')} inputComponentProps={{ autoComplete: 'name' }} />
					</label>
					<label className="flex flex-col gap-1.5">
						<span className="text-cladd-sm font-semibold">Votre adresse e-mail</span>
						<Input
							{...champ('email')}
							type="email"
							inputComponentProps={{ autoComplete: 'email' }}
							inputMode="email"
						/>
					</label>
					<label className="flex flex-col gap-1.5">
						<span className="text-cladd-sm font-semibold">Votre téléphone (facultatif)</span>
						<Input
							{...champ('telephone')}
							type="tel"
							inputComponentProps={{ autoComplete: 'tel' }}
						/>
					</label>
					<label className="flex flex-col gap-1.5">
						<span className="text-cladd-sm font-semibold">
							Ce que vous voulez nous dire (facultatif)
						</span>
						<Textarea {...champ('message')} size="lg" />
					</label>
					{/* Le champ piège : invisible, hors du parcours du clavier ; un humain le laisse vide. */}
					<input
						tabIndex={-1}
						aria-hidden
						autoComplete="off"
						className="absolute -left-full h-0 w-0 opacity-0"
						value={champs.piege}
						onChange={(e) => setChamps((c) => ({ ...c, piege: e.target.value }))}
					/>
					{erreur === null ? null : <p className="text-cladd-sm font-semibold">{erreur}</p>}
					<p className="text-cladd-xs leading-relaxed text-encre-site-douce">
						Vos coordonnées servent à répondre à votre demande, et à rien d’autre. Letikette les
						garde {enLettres(ANNEES_DE_CONSERVATION)} ans au plus après notre dernier échange.{' '}
						<Link to="/politique-de-confidentialite" className="underline underline-offset-2">
							Vos droits
						</Link>
					</p>
				</form>
			)}
		</FeuillePleinEcran>
	);
}

export function OffresSurDemande() {
	const [ouverte, setOuverte] = useState<OffreDemandable | null>(null);
	return (
		<SectionMarketing id="sur-demande" ton="creme" className="gap-cladd-lg">
			<div className="flex flex-col gap-cladd-2xs">
				<TitreSection>Sur demande</TitreSection>
				<Chapeau>
					Quand une formule ne suffit pas : un diagnostic de tout votre historique, une réclamation
					préparée pour vos clients publics, ou une mise en place accompagnée. Un devis, par e-mail.
				</Chapeau>
			</div>
			<div className="grid gap-cladd-2xs md:grid-cols-2">
				{cartes().map((c) => (
					<div
						key={c.cle}
						className="flex flex-col gap-cladd-2xs rounded-carte-site border-2 border-filet-creme bg-papier p-cladd-xs md:p-cladd-sm"
					>
						<span className="text-intertitre font-semibold">{OFFRES[c.cle].nom}</span>
						<p className="text-cladd-md leading-relaxed text-encre-site-douce">{c.pour}</p>
						<span className="font-serif text-prix-formule leading-none font-medium tracking-titre-section tabular-nums">
							{c.prix}
						</span>
						<ul className="flex flex-col gap-1">
							{c.conditions.map((condition) => (
								<li key={condition} className="text-cladd-sm leading-snug text-encre-site-douce">
									{condition}
								</li>
							))}
						</ul>
						<button
							type="button"
							onClick={() => setOuverte(c.cle)}
							className="mt-auto flex min-h-11 w-fit items-center gap-cladd-3xs text-cladd-md font-semibold underline underline-offset-4"
						>
							Demander
							<ArrowRightIcon size={18} aria-hidden />
						</button>
					</div>
				))}
			</div>
			<FeuilleDeDemande
				key={ouverte ?? 'aucune'}
				offre={ouverte}
				onFermer={() => setOuverte(null)}
			/>
		</SectionMarketing>
	);
}
