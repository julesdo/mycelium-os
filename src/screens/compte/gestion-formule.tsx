import { useState, type ReactNode } from 'react';
import {
	ArrowLeftRightIcon,
	CalendarRangeIcon,
	CreditCardIcon,
	RotateCcwIcon,
	XIcon
} from 'lucide-react';
import { GRILLE, type Formule, type Rythme } from '../../lib/config/tarifs';
import {
	CarteBouton,
	ChoixDeFormule,
	ConfirmationDeChangement,
	EnTeteDeGroupe,
	FeuilleDeReussite,
	FeuilleDeResiliation,
	VignetteRangee,
	prixAffiche,
	type ApercuDeChangement
} from '../../ui';
import type { AbonnementAffiche } from './facturation';

/** Ce que l'écran peut faire sur un abonnement souscrit, branché par la route. */
export interface GestionAffichee {
	readonly apercu: (
		formule: Formule,
		rythme: Rythme
	) => Promise<{ aujourdhui: number; ensuite: number | null; prochainLe: number | null }>;
	readonly changer: (
		formule: Formule,
		rythme: Rythme,
		quitterLePrixFondateurs?: boolean
	) => Promise<unknown>;
	readonly resilier: (raison: string | undefined) => Promise<unknown>;
	readonly reprendre: () => Promise<unknown>;
	/** Le portail de Paddle : la carte, les factures. */
	readonly onGererLaCarte: () => void;
	readonly portailEnCours: boolean;
}

/**
 * GÉRER VOTRE FORMULE — quatre rangées, sur Oportun et Natural AI : passer à
 * l'année (tant qu'on est au mois), changer de formule, la carte et les
 * factures chez Paddle, résilier (ou reprendre, quand une résiliation est
 * programmée). Chaque changement montre son prix avant d'être confirmé.
 */
export function GestionDeLaFormule({
	abonnement,
	gestion,
	maintenant
}: {
	abonnement: AbonnementAffiche;
	gestion: GestionAffichee;
	maintenant: number;
}) {
	const [choixOuvert, setChoixOuvert] = useState(false);
	const [cible, setCible] = useState<{ formule: Formule; rythme: Rythme } | null>(null);
	const [apercu, setApercu] = useState<ApercuDeChangement>({ etat: 'attente' });
	const [resiliationOuverte, setResiliationOuverte] = useState(false);
	const [enCours, setEnCours] = useState(false);
	const [erreur, setErreur] = useState<string | null>(null);
	const [reussite, setReussite] = useState<{ titre: string; detail: string } | null>(null);

	const { formule, rythme, resiliationLe } = abonnement;
	if (formule === null || rythme === null) return null;
	const resilie = resiliationLe !== null;
	const aLEssai = abonnement.statut === 'trialing';
	const finLe = aLEssai
		? (abonnement.essaiFinLe ?? abonnement.prochainPrelevementLe)
		: abonnement.prochainPrelevementLe;

	function ouvrirLaConfirmation(f: Formule, r: Rythme) {
		setCible({ formule: f, rythme: r });
		setApercu({ etat: 'attente' });
		setErreur(null);
		gestion
			.apercu(f, r)
			.then((a) => setApercu({ etat: 'pret', ...a }))
			.catch((e: unknown) =>
				setApercu({
					etat: 'erreur',
					message: messageDe(e, 'Paddle n’a pas pu chiffrer ce changement.')
				})
			);
	}

	function agir(geste: () => Promise<unknown>, apres: () => void) {
		setEnCours(true);
		setErreur(null);
		geste()
			.then(apres)
			.catch((e: unknown) =>
				setErreur(messageDe(e, 'Le changement n’a pas pu se faire. Réessayez.'))
			)
			.finally(() => setEnCours(false));
	}

	return (
		<div className="flex flex-col gap-cladd-3xs">
			<EnTeteDeGroupe libelle="Gérer votre formule" />
			<div className="flex flex-col gap-2">
				{rythme === 'mensuel' && !resilie ? (
					<CarteBouton
						icone={vignette(CalendarRangeIcon)}
						titre="Passer à l’année"
						ligne={`2 mois offerts : ${prixAffiche(GRILLE[formule].annuel * 100)} HT par an`}
						onClick={() => ouvrirLaConfirmation(formule, 'annuel')}
					/>
				) : null}
				{resilie ? null : (
					<CarteBouton
						icone={vignette(ArrowLeftRightIcon)}
						titre="Changer de formule"
						ligne="Solo, Équipe ou Pro, au mois ou à l’année"
						onClick={() => setChoixOuvert(true)}
					/>
				)}
				<CarteBouton
					icone={vignette(CreditCardIcon)}
					titre="Carte et factures"
					ligne={gestion.portailEnCours ? 'Ouverture chez Paddle…' : 'Chez Paddle, notre revendeur'}
					onClick={gestion.onGererLaCarte}
				/>
				{resiliationLe !== null ? (
					<CarteBouton
						icone={vignette(RotateCcwIcon)}
						titre="Reprendre mon abonnement"
						ligne={`Rien ne s’arrêtera le ${dateEnLettres(resiliationLe)}`}
						onClick={() =>
							agir(gestion.reprendre, () =>
								setReussite({
									titre: 'Abonnement repris',
									detail: 'Rien ne s’arrête : vos relances continuent, au même prix.'
								})
							)
						}
					/>
				) : (
					<CarteBouton
						icone={vignette(XIcon)}
						titre="Résilier"
						ligne="Rien ne sera plus prélevé"
						onClick={() => {
							setErreur(null);
							setResiliationOuverte(true);
						}}
					/>
				)}
			</div>
			{erreur !== null && cible === null && !resiliationOuverte ? (
				<p className="px-1 text-cladd-2xs leading-relaxed text-cladd-fg-soft">{erreur}</p>
			) : null}

			<ChoixDeFormule
				ouverte={choixOuvert && cible === null}
				onFermer={() => setChoixOuvert(false)}
				recommandee={formule}
				essaiDisponible={false}
				enCours={false}
				maintenant={maintenant}
				utilisateurs={abonnement.utilisateurs}
				actuelle={{ formule, rythme }}
				onChoisir={ouvrirLaConfirmation}
			/>

			{cible !== null ? (
				<ConfirmationDeChangement
					ouverte
					onFermer={() => setCible(null)}
					formule={cible.formule}
					rythme={cible.rythme}
					aLEssai={aLEssai}
					quittePrixFondateurs={abonnement.prixFondateurs === true}
					apercu={apercu}
					enCours={enCours}
					erreur={erreur}
					onConfirmer={() =>
						agir(
							() =>
								gestion.changer(cible.formule, cible.rythme, abonnement.prixFondateurs === true),
							() => {
								setReussite({
									titre: 'Formule changée',
									detail: `${GRILLE[cible.formule].nom}, ${cible.rythme === 'annuel' ? 'à l’année' : 'au mois'}. ${aLEssai ? 'Votre essai continue.' : 'Paddle envoie la facture par e-mail.'}`
								});
								setCible(null);
								setChoixOuvert(false);
							}
						)
					}
				/>
			) : null}

			<FeuilleDeResiliation
				ouverte={resiliationOuverte}
				onFermer={() => setResiliationOuverte(false)}
				formule={formule}
				finLe={finLe}
				enCours={enCours}
				erreur={erreur}
				onResilier={(raison) =>
					agir(
						() => gestion.resilier(raison),
						() => {
							setResiliationOuverte(false);
							setReussite({
								titre: 'Abonnement résilié',
								detail:
									finLe === null
										? 'Rien ne sera plus prélevé. Tout reste ouvert jusqu’à la fin de la période.'
										: `Rien ne sera plus prélevé. Tout reste ouvert jusqu’au ${dateEnLettres(finLe)} ; vous pouvez reprendre d’ici là.`
							});
						}
					)
				}
				onFormuleDuDessous={(f) => {
					setResiliationOuverte(false);
					ouvrirLaConfirmation(f, rythme);
				}}
			/>

			{reussite !== null ? (
				<FeuilleDeReussite
					ouverte
					titre={reussite.titre}
					detail={reussite.detail}
					principale={{ libelle: 'Terminé', onClick: () => setReussite(null) }}
				/>
			) : null}
		</div>
	);
}

/** La vignette de la famille argent, avec le pictogramme du geste. */
function vignette(Picto: (props: { className?: string }) => ReactNode): ReactNode {
	return <VignetteRangee famille="ARGENT" className="size-10" picto={Picto} />;
}

function messageDe(e: unknown, repli: string): string {
	const donnees = (e as { data?: unknown }).data;
	return typeof donnees === 'string' ? donnees : repli;
}

function dateEnLettres(ms: number): string {
	return new Date(ms).toLocaleDateString('fr-FR', {
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	});
}
