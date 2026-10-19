import { useState } from 'react';
import { Segmented, SegmentedButton } from '@cladd-ui/react';
import { DownloadIcon } from 'lucide-react';
import { BoutonPrincipal, EnTeteDeGroupe, FeuillePleinEcran, type Lecture } from '../ui';

/**
 * LES COURRIERS D'UN CLIENT PUBLIC (19/10/2026, lot 1 bis) : la demande de paiement des
 * intérêts moratoires, et, quand ses conditions sont réunies, le signalement pour
 * mandatement d'office. Le gérant lit ce qu'il signe, puis télécharge et envoie lui-même.
 *
 * ⚠️ LE SIGNALEMENT NE S'IMPOSE JAMAIS. Il n'apparaît que lorsque la loi le permet (trente
 * jours après le paiement du principal, une collectivité ou un hôpital), en second, et
 * rien ne le recommande : c'est une démarche que seul le gérant décide.
 */

export type CompositionAffichee =
	| {
			readonly ok: true;
			readonly titre: string;
			readonly destinataire: string;
			readonly objet: string;
			readonly corps: string;
			readonly resume: readonly string[];
	  }
	| { readonly ok: false; readonly manques: readonly string[] };

export interface CourriersPublicsAffiches {
	readonly acheteur: string;
	readonly reclamation: CompositionAffichee;
	readonly signalement: CompositionAffichee;
	readonly laissees: readonly { readonly reference: string; readonly raison: string }[];
}

export function FeuilleCourriersPublics({
	ouverte,
	onFermer,
	lecture,
	onTelecharger
}: {
	readonly ouverte: boolean;
	readonly onFermer: () => void;
	readonly lecture: Lecture<CourriersPublicsAffiches | null>;
	readonly onTelecharger: (courrier: Extract<CompositionAffichee, { ok: true }>) => void;
}) {
	const [vue, setVue] = useState<'reclamation' | 'signalement'>('reclamation');
	const courriers = lecture.etat === 'pret' ? lecture.valeur : null;
	const signalementPossible = courriers?.signalement.ok === true;
	const affiche =
		courriers === null
			? null
			: vue === 'signalement' && signalementPossible
				? courriers.signalement
				: courriers.reclamation;

	return (
		<FeuillePleinEcran
			ouverte={ouverte}
			onFermer={onFermer}
			titre="Demande de paiement"
			{...(courriers === null ? {} : { sousTitre: courriers.acheteur })}
			pied={
				<BoutonPrincipal
					pleineLargeur
					disabled={affiche === null || !affiche.ok}
					onClick={() => {
						if (affiche !== null && affiche.ok) onTelecharger(affiche);
					}}
				>
					<DownloadIcon />
					Télécharger le courrier
				</BoutonPrincipal>
			}
		>
			{lecture.etat !== 'pret' ? (
				<p className="px-1 text-cladd-2xs text-cladd-fg-soft">
					{lecture.etat === 'erreur' ? 'Le courrier n’a pas pu se préparer.' : 'Préparation…'}
				</p>
			) : courriers === null ? (
				<p className="px-1 text-cladd-2xs text-cladd-fg-soft">
					Ce client n’est pas un acheteur public : sa fiche dit son barème de retard.
				</p>
			) : (
				<div className="flex flex-col gap-cladd-sm">
					{signalementPossible ? (
						<Segmented activeColor="brand" activeVariant="solid-fill" className="w-full">
							<SegmentedButton active={vue === 'reclamation'} onClick={() => setVue('reclamation')}>
								Demande de paiement
							</SegmentedButton>
							<SegmentedButton active={vue === 'signalement'} onClick={() => setVue('signalement')}>
								Signalement
							</SegmentedButton>
						</Segmented>
					) : null}

					{affiche === null ? null : affiche.ok ? (
						<>
							<section className="flex flex-col gap-1.5">
								{affiche.resume.map((r) => (
									<p key={r} className="px-1 text-cladd-2xs leading-relaxed text-cladd-fg-soft">
										{r}
									</p>
								))}
							</section>
							<p className="verre-carte rounded-cladd-xl px-3.5 py-3 text-cladd-2xs leading-relaxed wrap-anywhere whitespace-pre-line">
								{affiche.corps}
							</p>
						</>
					) : (
						<section className="flex flex-col gap-cladd-3xs">
							<EnTeteDeGroupe libelle="Pour préparer ce courrier, il manque" />
							<ul className="verre-carte flex list-disc flex-col gap-1 rounded-cladd-xl py-3 pr-3.5 pl-8 text-cladd-2xs">
								{affiche.manques.map((m) => (
									<li key={m}>{m}</li>
								))}
							</ul>
						</section>
					)}

					{courriers.laissees.length === 0 ? null : (
						<section className="flex flex-col gap-cladd-3xs">
							<EnTeteDeGroupe
								libelle="Factures laissées hors du courrier"
								nombre={courriers.laissees.length}
							/>
							<ul className="verre-carte flex flex-col gap-2 rounded-cladd-xl px-3.5 py-3 text-cladd-2xs">
								{courriers.laissees.map((l) => (
									<li key={l.reference} className="flex flex-col gap-0.5">
										<span className="font-semibold">{l.reference}</span>
										<span className="text-cladd-fg-soft">{l.raison}</span>
									</li>
								))}
							</ul>
						</section>
					)}
				</div>
			)}
		</FeuillePleinEcran>
	);
}
