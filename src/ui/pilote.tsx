import { useState } from 'react';
import { Popup, PopupContent, Spinner, Surface } from '@cladd-ui/react';
import { AlertTriangleIcon, CheckIcon } from 'lucide-react';
import { PLAN_PAR_DEFAUT } from '../lib/verticales/recouvrement/plan-relance';
import { BoutonPrincipal, BoutonTexte } from './bouton';
import { LigneDeReleve, ListeDeReleve } from './carte-rangee';
import { cn } from './cn';
import { dateCourte } from './format';

/**
 * LE PILOTE, EN DIRECT — ce que l'agent fait, sous les yeux du gérant.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LE TRAVAIL SE MONTRE (08/10/2026)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le fondateur : « rendre le travail de l'IA visible. Si l'automatisation est
 * trop instantanée, l'utilisateur n'a pas confiance et va vouloir tout
 * revérifier. » Un dossier qui apparaît d'un coup se vérifie ; un pilote qu'on
 * a vu lire les factures, repérer les retards et ouvrir le dossier de Durand se
 * croit. Chaque étape se coche au moment où elle se fait (`recouvrement/pilote.ts`,
 * `avancerTravail`) : ce qu'on voit est ce qui se passe.
 *
 * ⚠️ AU REPOS, IL DIT QU'IL VEILLE, ET DEPUIS QUAND. Un pilote muet ressemble à
 * un pilote arrêté. « Relu à 14 h 32 » est la preuve qu'il tourne ; son absence
 * (« pas encore relu ») se dit aussi, au lieu d'un faux « tout va bien ».
 */

export interface TravailPiloteAffiche {
	readonly id: string;
	/** Ce que fait le pilote, au présent : « Relit votre dépôt ». */
	readonly titre: string;
	readonly etapes: readonly { readonly libelle: string; readonly faite: boolean }[];
	readonly etat: 'EN_ATTENTE' | 'EN_COURS' | 'FAIT' | 'ECHEC';
	/** Ce que le travail a produit, une fois fini. */
	readonly bilan: string | null;
	readonly termineLe: number | null;
}

export interface RelanceProgrammeeAffichee {
	readonly envoiId: string;
	readonly client: string;
	/** « Rappel », « Deuxième rappel », « Lettre officielle ». */
	readonly etape: string;
	readonly partiraLe: number;
}

export interface PiloteAffiche {
	/** La dernière veille terminée, ou `null` : il ne s'est jamais réveillé ici. */
	readonly derniereVeille: number | null;
	/** Les plus récents d'abord. */
	readonly travaux: readonly TravailPiloteAffiche[];
	/** Le gérant a laissé le pilote relancer seul. */
	readonly envoiAutomatique: boolean;
	/** Quand les relances ont été activées, et si c'est par ce compte. */
	readonly activeLe?: number | null;
	readonly activeParVous?: boolean;
	/** Ce compte peut activer ou couper les relances : un administrateur. */
	readonly peutActiver: boolean;
	/** Ce qui part bientôt, le plus proche d'abord. */
	readonly programmes: readonly RelanceProgrammeeAffichee[];
}

/** L'heure du gérant, pas celle du serveur : « 14 h 32 ». */
const HEURE = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });

export function PiloteEnDirect({
	pilote,
	aujourdHui,
	onActiver,
	onRetenir
}: {
	readonly pilote: PiloteAffiche;
	/** Le jour de l'interface (UTC) : une tâche d'aujourd'hui dit son heure, une plus ancienne sa date. */
	readonly aujourdHui: string;
	/** Laisser le pilote relancer seul, ou le couper. */
	readonly onActiver?: (actif: boolean) => void;
	/** Retenir une relance programmée : elle ne part pas, le client sort du pilote. */
	readonly onRetenir?: (envoiId: string) => void;
}) {
	const [feuille, setFeuille] = useState(false);
	const enCours = pilote.travaux.find((t) => t.etat === 'EN_COURS') ?? null;
	const enAttente = pilote.travaux.filter((t) => t.etat === 'EN_ATTENTE').length;
	/*
	  ⚠️ CE QU'IL A FAIT, ET PAS SEULEMENT SA DERNIÈRE TÂCHE. Une relecture suivie
	  de l'ouverture de trois dossiers se lisait comme une seule ligne : on ne
	  voyait que la fin. Les trois dernières tâches disent la suite de ce qui a été
	  fait, comme le relevé d'un collaborateur.
	*/
	const faits = pilote.travaux.filter((t) => t.etat === 'FAIT' || t.etat === 'ECHEC').slice(0, 3);

	return (
		<Surface
			variant="transparent"
			outline={false}
			className="verre-carte rounded-cladd-xl"
			contentClassName="flex flex-col gap-cladd-3xs px-3.5 py-cladd-3xs"
		>
			<div className="flex items-center justify-between gap-2">
				<span className="flex items-center gap-2 text-cladd-xs font-semibold">
					<span
						aria-hidden
						className={cn(
							'relative inline-flex size-2 shrink-0 rounded-full bg-cladd-fg',
							enCours !== null && 'pouls'
						)}
					/>
					Le pilote
				</span>
				<span className="text-cladd-2xs text-cladd-fg-soft tabular-nums">
					{enCours !== null
						? 'au travail'
						: pilote.derniereVeille === null
							? 'pas encore relu'
							: `relu à ${HEURE.format(new Date(pilote.derniereVeille))}`}
				</span>
			</div>

			{enCours !== null ? (
				<TravailEnDirect travail={enCours} enAttente={enAttente} />
			) : faits.length > 0 ? (
				<ul className="flex flex-col gap-1.5">
					{faits.map((travail) => (
						<TravailFait key={travail.id} travail={travail} aujourdHui={aujourdHui} />
					))}
				</ul>
			) : (
				<p className="text-cladd-2xs leading-snug text-cladd-fg-soft">
					Il surveille vos échéances et vos dates limites pour agir, et se remet au travail dès
					qu’une facture ou un virement arrive.
				</p>
			)}

			{/*
			  LES RELANCES — ce qui part bientôt, ou l'invitation à les lui confier.

			  ⚠️ CE QUI PART SEUL SE VOIT AVANT DE PARTIR, avec le geste pour l'arrêter.
			  C'est la condition de la confiance dans un envoi automatique : on ne
			  laisse partir que ce qu'on aurait pu retenir.
			*/}
			<div className="flex flex-col gap-1.5 border-t border-cladd-outline pt-cladd-3xs">
				{!pilote.envoiAutomatique ? (
					<>
						<p className="text-cladd-2xs leading-snug text-cladd-fg-soft">
							Il peut envoyer seul les rappels et la lettre officielle de votre plan, à votre nom.
						</p>
						{pilote.peutActiver && onActiver !== undefined ? (
							<BoutonPrincipal pleineLargeur onClick={() => setFeuille(true)}>
								Laisser le pilote relancer
							</BoutonPrincipal>
						) : (
							<p className="text-cladd-2xs text-cladd-fg-softer">
								Un administrateur de votre entreprise peut l’activer.
							</p>
						)}
					</>
				) : pilote.programmes.length === 0 ? (
					<div className="flex items-center justify-between gap-2">
						<p className="text-cladd-2xs text-cladd-fg-soft">
							{pilote.activeLe === undefined || pilote.activeLe === null
								? 'Il relance pour vous.'
								: `Activé ${pilote.activeParVous === true ? 'par vous ' : ''}le ${dateCourte(new Date(pilote.activeLe).toISOString().slice(0, 10))}.`}{' '}
							Rien ne part dans l’heure.
						</p>
						{pilote.peutActiver && onActiver !== undefined ? (
							<BoutonTexte onClick={() => onActiver(false)}>Couper</BoutonTexte>
						) : null}
					</div>
				) : (
					<>
						<p className="text-cladd-2xs font-semibold text-cladd-fg-soft">Part bientôt</p>
						<ul className="flex flex-col gap-1">
							{pilote.programmes.slice(0, 3).map((relance) => (
								<li key={relance.envoiId} className="flex items-center justify-between gap-2">
									<span className="min-w-0 text-cladd-2xs leading-snug">
										<span className="font-medium">{relance.etape}</span>
										<span className="text-cladd-fg-soft">
											{' · '}
											{relance.client} · {DEPART.format(new Date(relance.partiraLe))}
										</span>
									</span>
									{onRetenir === undefined ? null : (
										<BoutonTexte className="shrink-0" onClick={() => onRetenir(relance.envoiId)}>
											Retenir
										</BoutonTexte>
									)}
								</li>
							))}
						</ul>
						{pilote.programmes.length > 3 ? (
							<p className="text-cladd-2xs text-cladd-fg-softer">
								Et {pilote.programmes.length - 3} autre{pilote.programmes.length - 3 > 1 ? 's' : ''}
								, dans leurs dossiers.
							</p>
						) : null}
					</>
				)}
			</div>

			{onActiver === undefined ? null : (
				<FeuilleDActivation
					ouverte={feuille}
					onFermer={() => setFeuille(false)}
					onActiver={() => {
						setFeuille(false);
						onActiver(true);
					}}
				/>
			)}
		</Surface>
	);
}

/** « jeu. 10:00 » : le jour et l'heure du départ, chez le gérant. */
const DEPART = new Intl.DateTimeFormat('fr-FR', {
	weekday: 'short',
	hour: '2-digit',
	minute: '2-digit'
});

/** Ce qui sépare deux étapes, dit en clair : « 3 jours après l'échéance ». */
function delaiEnClair(rang: number, attente: number): string {
	return rang === 0 ? `${attente} jours après l’échéance` : `${attente} jours plus tard`;
}

/**
 * CE QUE LE PILOTE ENVERRA, LU AVANT DE LE LUI CONFIER.
 *
 * ⚠️ L'ACTIVATION EST UN ENGAGEMENT, DONC ELLE SE FAIT EN CONNAISSANCE DE CAUSE.
 * Le plan tel qu'il est, d'où et quand ça part, ce qui l'arrête, et ce qui ne
 * part jamais seul : tout ce qu'il faut pour ne pas être surpris par un envoi.
 */
function FeuilleDActivation({
	ouverte,
	onFermer,
	onActiver
}: {
	readonly ouverte: boolean;
	readonly onFermer: () => void;
	readonly onActiver: () => void;
}) {
	return (
		<Popup
			open={ouverte}
			onOpenChange={(o) => {
				if (!o) onFermer();
			}}
			headerLeft={
				<span className="px-2 pb-1 text-cladd-xs font-semibold">Laisser le pilote relancer</span>
			}
			contentClassName="max-w-lg"
		>
			<PopupContent>
				<div className="flex flex-col gap-cladd-3xs">
					<ListeDeReleve>
						{PLAN_PAR_DEFAUT.map((etape, rang) => (
							<LigneDeReleve
								key={etape.cle}
								titre={etape.nom}
								ligne={
									etape.automatique
										? delaiEnClair(rang, etape.attente)
										: `${delaiEnClair(rang, etape.attente)}, vous décidez`
								}
							/>
						))}
					</ListeDeReleve>
					<ul className="flex flex-col gap-1.5 text-cladd-2xs leading-relaxed text-cladd-fg-soft">
						<li>Par e-mail, à votre nom. Les réponses arrivent à votre adresse.</li>
						<li>En semaine, entre 9 h et 18 h.</li>
						<li>Chaque relance s’affiche une heure avant de partir, et se retient d’un geste.</li>
						<li>
							La lettre officielle attend un décompte arrêté par vous : trois points que vous seul
							connaissez.
						</li>
						<li>
							Un paiement arrête tout. Un client en procédure collective ou radié n’est pas relancé,
							et un client se retire du pilote depuis sa fiche.
						</li>
					</ul>
					<BoutonPrincipal pleineLargeur onClick={onActiver}>
						Activer les relances
					</BoutonPrincipal>
				</div>
			</PopupContent>
		</Popup>
	);
}

/**
 * UN TRAVAIL QUI TOURNE : ses étapes, cochées, en cours, à venir.
 *
 * ⚠️ L'ÉTAPE EN COURS EST ANNONCÉE AU LECTEUR D'ÉCRAN (`aria-live`) : c'est la
 * seule ligne qui change, et elle change d'elle-même.
 */
function TravailEnDirect({
	travail,
	enAttente
}: {
	readonly travail: TravailPiloteAffiche;
	readonly enAttente: number;
}) {
	const rang = travail.etapes.findIndex((e) => !e.faite);
	const courante = rang < 0 ? null : travail.etapes[rang]!;
	return (
		<div className="flex flex-col gap-1.5">
			<p className="text-cladd-xs font-medium">{travail.titre}</p>
			<ol className="flex flex-col gap-1">
				{travail.etapes.map((etape, i) => {
					const etat = etape.faite ? 'faite' : i === rang ? 'courante' : 'avenir';
					return (
						<li
							key={`${i}-${etape.libelle}`}
							className={cn(
								'pilote-etape flex items-center gap-2 text-cladd-2xs leading-snug',
								etat === 'faite' && 'text-cladd-fg-soft',
								etat === 'courante' && 'text-cladd-fg',
								etat === 'avenir' && 'text-cladd-fg-softest'
							)}
						>
							<span aria-hidden className="flex size-4 shrink-0 items-center justify-center">
								{etat === 'faite' ? (
									<CheckIcon className="pilote-coche size-3.5" strokeWidth={2.5} />
								) : etat === 'courante' ? (
									<Spinner size="xs" />
								) : (
									<span className="size-1.5 rounded-full bg-current opacity-50" />
								)}
							</span>
							<span className="min-w-0">{etape.libelle}</span>
						</li>
					);
				})}
			</ol>
			<p className="sr-only" aria-live="polite">
				{courante === null ? travail.titre : courante.libelle}
			</p>
			{enAttente === 0 ? null : (
				<p className="text-cladd-2xs text-cladd-fg-softer">
					Puis {enAttente} autre{enAttente > 1 ? 's' : ''} tâche{enAttente > 1 ? 's' : ''}.
				</p>
			)}
		</div>
	);
}

/** Ce que le pilote a fait, en une ligne : le titre, puis ce que ça a donné, et quand. */
function TravailFait({
	travail,
	aujourdHui
}: {
	readonly travail: TravailPiloteAffiche;
	readonly aujourdHui: string;
}) {
	const echec = travail.etat === 'ECHEC';
	const quand =
		travail.termineLe === null
			? null
			: new Date(travail.termineLe).toISOString().slice(0, 10) === aujourdHui
				? HEURE.format(new Date(travail.termineLe))
				: dateCourte(new Date(travail.termineLe).toISOString().slice(0, 10));
	return (
		<li className="flex items-start gap-2 text-cladd-2xs leading-snug">
			<span aria-hidden className="flex size-4 shrink-0 items-center justify-center pt-0.5">
				{echec ? (
					<AlertTriangleIcon className="size-3.5" />
				) : (
					<CheckIcon className="size-3.5" strokeWidth={2.5} />
				)}
			</span>
			<span className="min-w-0">
				<span className="font-medium">{travail.titre}</span>
				<span className="text-cladd-fg-soft">
					{' · '}
					{echec
						? 'interrompu. Il reprendra à la prochaine veille.'
						: (travail.bilan ?? 'terminé.')}
				</span>
			</span>
			{quand === null ? null : (
				<span className="ml-auto shrink-0 pl-2 text-cladd-fg-softer tabular-nums">{quand}</span>
			)}
		</li>
	);
}
