import { useState, type FormEvent } from 'react';
import { Link } from '@tanstack/react-router';
import { useMutation } from 'convex/react';
import { Input } from '@cladd-ui/react';
import { ArrowRightIcon, CheckIcon } from 'lucide-react';
import { api } from '../lib/convex/_generated/api';
import { PARAMETRES } from '../lib/verticales/recouvrement/parametres';
import { PROCEDURES } from '../lib/verticales/recouvrement/procedures';
import { CONSERVATION_INSCRIPTION_MS } from '../lib/crm/attente';
import { suivre } from '../app/analytique';
import { BoutonAffiche } from '../ui';
import { Chapeau, SectionMarketing, TitreSection } from './section';

/**
 * LA PROCÉDURE SANS JUGE, ET SA LISTE D'ATTENTE (19/10/2026, audit stratégique, décision 16).
 *
 * Une loi de 2026 a créé une voie où le commissaire de justice obtient, sans tribunal, le
 * droit de faire saisir pour une facture que le client ne conteste pas. Elle ne fonctionne
 * pas tant que son décret n'est pas paru. La page le dit, l'état LU AU REGISTRE
 * (`PROCEDURES['l126-creances-commerciales'].peutEvaluer()`), jamais écrit à la main ; les
 * conditions et les délais viennent des entrées du registre, chacune sous sa source.
 *
 * ⚠️ AUCUN VERDICT (ligne rouge n° 3) : la page décrit la voie, elle ne dit jamais qu'il
 * faudrait l'engager. Et Letikette ne fait pas l'acte : le commissaire de justice a seul
 * le droit de le faire ; le logiciel prépare le dossier et le lui transmet.
 */

const CONDITIONS: Readonly<Record<string, string>> = {
	certaine: 'Une somme que votre client ne discute pas dans son principe',
	liquide: 'Un montant chiffré',
	exigible: 'Une échéance passée',
	facturationEntreCommercants: 'Une facture entre commerçants'
};

function dateLongue(iso: string): string {
	return new Date(`${iso}T12:00:00Z`).toLocaleDateString('fr-FR', {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
		timeZone: 'UTC'
	});
}

function Source({ children }: { children: string }) {
	return <p className="text-cladd-xs leading-snug text-encre-site-douce">{children}</p>;
}

export function PageSansJuge() {
	const procedure = PROCEDURES['l126-creances-commerciales'];
	const ouverte = procedure.peutEvaluer();
	const decret = PARAMETRES.tarifCommissaireJusticeL126;
	const conditions = PARAMETRES.conditionsCreanceL126;
	const mois = PARAMETRES.delaiContestationL126;
	const jours = PARAMETRES.delaiProcesVerbalNonContestation;
	const etapes = [
		{
			titre: 'Le commissaire de justice lui demande de payer',
			texte: `Il remet à votre client un commandement de payer. Votre client a ${mois.valeur === 1 ? 'un mois' : `${mois.valeur} mois`} pour payer, ou pour contester.`,
			source: mois.source
		},
		{
			titre: 'Sans contestation, le droit de faire saisir',
			texte: `Au plus tôt ${jours.valeur} jours après ce délai, le commissaire constate que votre client n’a pas contesté, et le greffe en fait un acte qui donne le droit de faire saisir (« titre exécutoire »).`,
			source: jours.source
		},
		{
			titre: 'Une contestation y met fin',
			texte: procedure.conditionsEchec[0] ?? '',
			source: mois.source
		}
	];

	return (
		<>
			<SectionMarketing ton="creme" className="gap-cladd-lg pt-36 md:pt-44">
				<div className="flex max-w-3xl flex-col gap-cladd-2xs">
					<p className="text-cladd-sm font-semibold text-encre-site-douce">
						{ouverte ? 'Procédure sans juge : ouverte' : 'Procédure sans juge : pas encore ouverte'}
					</p>
					<h1 className="font-serif text-affiche-colonne leading-tight font-medium tracking-titre-section text-balance">
						Une voie sans tribunal pour une facture que votre client ne conteste pas.
					</h1>
					<Chapeau>
						{ouverte
							? 'La voie est ouverte. Letikette prépare le dossier, vos factures et le décompte daté, et le transmet au commissaire de justice que vous choisissez.'
							: `Une loi de 2026 la crée, mais elle ne fonctionne pas encore : le décret qui en fixe les modalités n’est pas paru (vérifié le ${dateLongue(decret.verifieLe)}). Laissez votre adresse : vous serez prévenu le jour où elle s’ouvre.`}
					</Chapeau>
				</div>
				{ouverte ? (
					<div>
						<BoutonAffiche as={Link} to="/inscription" fond="jour">
							Créer un compte
							<ArrowRightIcon />
						</BoutonAffiche>
					</div>
				) : (
					<FormulaireDAttente />
				)}
			</SectionMarketing>
			<SectionMarketing ton="creme" className="gap-cladd-sm pt-0 md:pt-0">
				<TitreSection>Pour quelles factures</TitreSection>
				<ul className="grid gap-cladd-2xs md:grid-cols-2">
					{conditions.valeur.map((c) => (
						<li
							key={c}
							className="rounded-carte-site bg-papier p-cladd-xs text-cladd-md leading-relaxed shadow-carte-chaude"
						>
							{CONDITIONS[c] ?? c}
						</li>
					))}
				</ul>
				<Source>{conditions.source}</Source>
			</SectionMarketing>
			<SectionMarketing ton="creme" className="gap-cladd-sm pt-0 md:pt-0">
				<TitreSection>Comment elle se déroule</TitreSection>
				<div className="grid gap-cladd-sm md:grid-cols-3">
					{etapes.map((e) => (
						<article
							key={e.titre}
							className="flex flex-col gap-cladd-2xs rounded-carte-site bg-papier p-cladd-xs shadow-carte-chaude md:row-span-3 md:grid md:grid-rows-subgrid md:p-cladd-sm"
						>
							<h2 className="text-intertitre leading-snug font-semibold">{e.titre}</h2>
							<p className="text-cladd-md leading-relaxed text-encre-site-douce">{e.texte}</p>
							<Source>{e.source}</Source>
						</article>
					))}
				</div>
				<p className="max-w-3xl text-cladd-md leading-relaxed text-encre-site-douce">
					Le commissaire de justice (l’ancien huissier) est seul à pouvoir faire cette démarche.
					Letikette ne la fait pas à votre place : il prépare le dossier et le lui transmet.
				</p>
			</SectionMarketing>
		</>
	);
}

/** L'adresse, l'entreprise si on veut, et un bouton. Rien ne s'inscrit avant la confirmation. */
function FormulaireDAttente() {
	const sInscrire = useMutation(api.attente.sInscrire);
	const [champs, setChamps] = useState({ email: '', entreprise: '', piege: '' });
	const [etat, setEtat] = useState<'saisie' | 'envoi' | 'fait'>('saisie');
	const [erreur, setErreur] = useState<string | null>(null);
	const annees = Math.round(CONSERVATION_INSCRIPTION_MS / (365 * 24 * 60 * 60 * 1000));

	async function envoyer(e: FormEvent) {
		e.preventDefault();
		setErreur(null);
		setEtat('envoi');
		try {
			const r = await sInscrire(champs);
			if (r.ok) {
				setEtat('fait');
				suivre('attente-inscrite');
			} else {
				setErreur(r.erreur);
				setEtat('saisie');
			}
		} catch {
			setErreur('L’inscription n’est pas partie. Réessayez dans un instant.');
			setEtat('saisie');
		}
	}

	if (etat === 'fait') {
		return (
			<div className="flex max-w-xl items-start gap-cladd-2xs rounded-carte-site bg-papier p-cladd-xs shadow-carte-chaude">
				<span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-teinte-argent">
					<CheckIcon aria-hidden />
				</span>
				<p className="text-cladd-md leading-relaxed">
					Un e-mail vient de partir à {champs.email.trim()}. Confirmez votre adresse depuis le lien
					qu’il contient : sans confirmation, rien n’est gardé.
				</p>
			</div>
		);
	}

	return (
		<form
			onSubmit={(e) => void envoyer(e)}
			className="light cladd-color-brand relative flex max-w-xl flex-col gap-cladd-xs rounded-carte-site bg-papier p-cladd-xs shadow-carte-chaude md:p-cladd-sm"
		>
			<label className="flex flex-col gap-1.5">
				<span className="text-cladd-sm font-semibold">Votre adresse e-mail</span>
				<Input
					value={champs.email}
					onChange={(email) => setChamps((c) => ({ ...c, email }))}
					type="email"
					inputMode="email"
					inputComponentProps={{ autoComplete: 'email' }}
				/>
			</label>
			<label className="flex flex-col gap-1.5">
				<span className="text-cladd-sm font-semibold">Votre entreprise (facultatif)</span>
				<Input
					value={champs.entreprise}
					onChange={(entreprise) => setChamps((c) => ({ ...c, entreprise }))}
					inputComponentProps={{ autoComplete: 'organization' }}
				/>
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
			<div>
				<BoutonAffiche as="button" type="submit" fond="jour" disabled={etat === 'envoi'}>
					Me prévenir
					<ArrowRightIcon />
				</BoutonAffiche>
			</div>
			<p className="text-cladd-xs leading-relaxed text-encre-site-douce">
				Votre adresse sert à vous prévenir de l’ouverture de cette voie, et à rien d’autre.
				Letikette la garde {annees} ans au plus, et vous pouvez quitter la liste depuis chaque
				message.{' '}
				<Link to="/politique-de-confidentialite" className="underline underline-offset-2">
					Vos droits
				</Link>
			</p>
		</form>
	);
}
