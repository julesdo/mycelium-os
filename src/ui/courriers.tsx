import { useState } from 'react';
import { Chip, Input, Segmented, SegmentedButton, Surface } from '@cladd-ui/react';
import { BoutonPrincipal, BoutonSecondaire } from './bouton';
import { Champ } from './cadre-auth';
import { dateCourte } from './format';

/**
 * VOS COURRIERS — préparer, relire, valider, envoyer soi-même.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ VOUS ENVOYEZ, AVEC LETIKETTE. JAMAIS « LETIKETTE ENVOIE EN VOTRE NOM »
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Chaque courrier est à votre seul nom et sous votre signature. Le logiciel
 * remplit un modèle fixe avec les faits du dossier ; il n'écrit aucune phrase.
 * L'aperçu montre le document tel qu'il partira, avant toute validation, et
 * seul un administrateur de l'entreprise valide. Ce qui va devant un tribunal
 * passe par l'avocat que vous choisissez.
 *
 * ⚠️ LES MODÈLES SONT LISTÉS À ÉGALITÉ, dans l'ordre d'un dossier. Ceux qui ne
 * s'appliquent pas sont montrés avec leur raison, jamais cachés.
 */

export type ModeleCourrierAffiche =
	| 'RELANCE_OFFICIELLE'
	| 'ACCORD_ECHEANCIER'
	| 'DECLARATION_CREANCE'
	| 'INFORMATION_MANDATAIRE'
	| 'TRANSMISSION_AVOCAT'
	| 'DEMANDE_SIGNIFICATION';

export type ChoixCourrierAffiche =
	| {
			readonly modele: 'RELANCE_OFFICIELLE';
			readonly delaiJours: number;
			readonly suite: 'SUITE_GENERALE' | 'SUITE_JURIDICTION';
			readonly modalite: 'VIREMENT_IBAN' | 'SELON_FACTURES';
			readonly reserveIndemnisationComplementaire: boolean;
	  }
	| {
			readonly modele: 'ACCORD_ECHEANCIER';
			readonly nombre: number;
			readonly premiereEcheance: string;
			readonly intervalleMois: number;
			readonly penalites: 'MAINTENUES' | 'RENONCIATION' | null;
			readonly delaiRegularisationJours: number;
			readonly debiteurSignataireNom: string;
			readonly debiteurSignataireQualite: string;
	  }
	| {
			readonly modele: 'DECLARATION_CREANCE';
			readonly mandataireNom: string;
			readonly mandataireAdresse: string;
			readonly referenceDossier: string;
			readonly aucuneSurete: boolean;
			readonly aucunProces: boolean;
			readonly pouvoir: {
				readonly representantNom: string;
				readonly representantQualite: string;
				readonly fonctionDuSignataire: string;
			} | null;
	  }
	| {
			readonly modele: 'INFORMATION_MANDATAIRE';
			readonly mandataireNom: string;
			readonly mandataireAdresse: string;
	  }
	| {
			readonly modele: 'TRANSMISSION_AVOCAT';
			readonly intervenantId: string | null;
			readonly confidentiel: boolean;
	  }
	| {
			readonly modele: 'DEMANDE_SIGNIFICATION';
			readonly intervenantId: string | null;
			readonly juridiction: string;
			readonly numero: string;
			readonly nombrePieces: number;
	  };

export interface ModeleProposable {
	readonly cle: ModeleCourrierAffiche;
	readonly titre: string;
	/** Ce que fait ce courrier, en une phrase. */
	readonly description: string;
	/** `null` : le modèle s'applique. Sinon, pourquoi pas. */
	readonly indisponible: string | null;
}

export type ApercuAffiche =
	| {
			readonly ok: true;
			readonly titre: string;
			readonly destinataire: string;
			readonly canal: 'IMPRIMER_RECOMMANDE' | 'IMPRIMER_SIMPLE' | 'MESSAGERIE';
			readonly objet: string;
			readonly corps: string;
			readonly resume: readonly string[];
	  }
	| { readonly ok: false; readonly manques: readonly string[] };

export interface EnvoiAffiche {
	readonly id: string;
	readonly titre: string;
	readonly destinataire: string;
	readonly canal: 'IMPRIMER_RECOMMANDE' | 'IMPRIMER_SIMPLE' | 'MESSAGERIE';
	readonly objet: string;
	readonly corps: string;
	readonly resume: readonly string[];
	readonly etat: 'A_VALIDER' | 'VALIDE' | 'PARTI' | 'ABANDONNE';
	readonly prepareLe: string;
	readonly valideLe?: string;
	readonly empreinte?: string;
	readonly partiLe?: string;
	/** Le calcul joint peut se télécharger en annexe. */
	readonly annexeDisponible: boolean;
}

export interface IntervenantProposable {
	readonly id: string;
	readonly nom: string;
	readonly role: 'AVOCAT' | 'COMMISSAIRE_DE_JUSTICE' | 'AUTRE';
}

export interface CourriersDuDossier {
	readonly modeles: readonly ModeleProposable[];
	readonly envois: readonly EnvoiAffiche[];
	readonly peutValider: boolean;
	readonly intervenants: readonly IntervenantProposable[];
	/** Le texte de l'annonce d'ouverture, mot pour mot, pour y lire la personne nommée. */
	readonly citationAnnonce: string | null;
	/** L'aperçu des choix en cours : `undefined` en calcul, `null` sans choix. */
	readonly apercu: ApercuAffiche | null | undefined;
	readonly aujourdHui: string;
	readonly enCours: boolean;
	readonly erreur: string | null;
	readonly onChoisir: (choix: ChoixCourrierAffiche | null) => void;
	readonly onPreparer: (choix: ChoixCourrierAffiche) => void;
	readonly onValider: (envoiId: string) => void;
	readonly onDeclarerParti: (envoiId: string, partiLe: string) => void;
	readonly onAbandonner: (envoiId: string) => void;
	readonly onTelechargerPdf: (envoi: EnvoiAffiche) => void;
	readonly onTelechargerAnnexe: (envoi: EnvoiAffiche) => void;
}

/**
 * LES MODÈLES, À ÉGALITÉ, dans l'ordre d'un dossier. Ceux qui ne s'appliquent
 * pas sont montrés avec leur raison, jamais cachés.
 */
export function modelesProposables(
	sante: 'INCONNUE' | 'SAINE' | 'PROCEDURE_COLLECTIVE' | 'RADIEE',
	ordonnanceRendue: boolean
): ModeleProposable[] {
	const auClient =
		sante === 'PROCEDURE_COLLECTIVE'
			? 'Votre client est en procédure collective : on ne lui écrit plus, on déclare ce qu’il vous doit.'
			: sante === 'RADIEE'
				? 'Votre client est radié : personne ne peut recevoir ce courrier.'
				: null;
	const procedureCollective =
		sante === 'PROCEDURE_COLLECTIVE'
			? null
			: 'Seulement quand votre client est en procédure collective.';
	return [
		{
			cle: 'RELANCE_OFFICIELLE',
			titre: 'Lettre de relance officielle',
			description:
				'Réclame officiellement le paiement, avec une date limite (le mot du droit : mise en demeure).',
			indisponible: auClient
		},
		{
			cle: 'ACCORD_ECHEANCIER',
			titre: 'Accord d’échéancier',
			description: 'Votre client reconnaît ce qu’il vous doit et paie en plusieurs fois.',
			indisponible: auClient
		},
		{
			cle: 'TRANSMISSION_AVOCAT',
			titre: 'Transmettre le dossier à votre avocat',
			description: 'Tout le dossier part chez votre avocat, pour qu’il l’examine et décide.',
			indisponible: null
		},
		{
			cle: 'DEMANDE_SIGNIFICATION',
			titre: 'Demander au commissaire de justice de remettre la décision',
			description:
				'Le commissaire de justice (l’ancien huissier) remet la décision du juge à votre client.',
			indisponible: ordonnanceRendue
				? null
				: 'Seulement après la décision du juge, à noter dans « Voir les autres choix ».'
		},
		{
			cle: 'DECLARATION_CREANCE',
			titre: 'Déclarer ce qu’il vous doit',
			description: 'À la personne nommée par le tribunal, avant la date limite.',
			indisponible: procedureCollective
		},
		{
			cle: 'INFORMATION_MANDATAIRE',
			titre: 'Demander des nouvelles à la personne nommée par le tribunal',
			description: 'Savoir si vous êtes sur la liste de ceux à qui votre client doit de l’argent.',
			indisponible: procedureCollective
		}
	];
}

const CANAL: Record<EnvoiAffiche['canal'], string> = {
	IMPRIMER_RECOMMANDE: 'À imprimer, signer et envoyer en recommandé avec avis de réception',
	IMPRIMER_SIMPLE: 'À imprimer en deux exemplaires, à signer par vous et par votre client',
	MESSAGERIE: 'À envoyer depuis votre propre messagerie'
};

const ETAT: Record<EnvoiAffiche['etat'], string> = {
	A_VALIDER: 'À valider',
	VALIDE: 'Validé',
	PARTI: 'Parti',
	ABANDONNE: 'Abandonné'
};

/** Les choix de départ d'un modèle : aucune valeur juridique, seulement des choix de produit. */
function choixInitial(modele: ModeleCourrierAffiche, aujourdHui: string): ChoixCourrierAffiche {
	switch (modele) {
		case 'RELANCE_OFFICIELLE':
			return {
				modele,
				delaiJours: 8,
				suite: 'SUITE_GENERALE',
				modalite: 'VIREMENT_IBAN',
				reserveIndemnisationComplementaire: false
			};
		case 'ACCORD_ECHEANCIER':
			return {
				modele,
				nombre: 3,
				premiereEcheance: aujourdHui,
				intervalleMois: 1,
				penalites: null,
				delaiRegularisationJours: 15,
				debiteurSignataireNom: '',
				debiteurSignataireQualite: ''
			};
		case 'DECLARATION_CREANCE':
			return {
				modele,
				mandataireNom: '',
				mandataireAdresse: '',
				referenceDossier: '',
				aucuneSurete: false,
				aucunProces: false,
				pouvoir: null
			};
		case 'INFORMATION_MANDATAIRE':
			return { modele, mandataireNom: '', mandataireAdresse: '' };
		case 'TRANSMISSION_AVOCAT':
			return { modele, intervenantId: null, confidentiel: true };
		case 'DEMANDE_SIGNIFICATION':
			return { modele, intervenantId: null, juridiction: '', numero: '', nombrePieces: 0 };
	}
}

function Choix<T extends string | number | boolean | null>({
	options,
	valeur,
	onChange
}: {
	options: readonly { readonly valeur: T; readonly libelle: string }[];
	valeur: T;
	onChange: (v: T) => void;
}) {
	return (
		<Segmented className="flex-wrap self-start" activeColor="neutral" activeVariant="solid">
			{options.map((o) => (
				<SegmentedButton
					key={String(o.valeur)}
					active={valeur === o.valeur}
					onClick={() => onChange(o.valeur)}
				>
					{o.libelle}
				</SegmentedButton>
			))}
		</Segmented>
	);
}

function FormulaireChoix({
	choix,
	onChange,
	intervenants,
	citationAnnonce
}: {
	choix: ChoixCourrierAffiche;
	onChange: (c: ChoixCourrierAffiche) => void;
	intervenants: readonly IntervenantProposable[];
	citationAnnonce: string | null;
}) {
	switch (choix.modele) {
		case 'RELANCE_OFFICIELLE':
			return (
				<div className="flex flex-col gap-cladd-2xs">
					<Champ
						etiquette="Délai laissé à votre client"
						aide="C’est vous qui choisissez : la loi parle d’un délai raisonnable. Trois jours d’acheminement s’y ajoutent."
					>
						<Choix
							options={[
								{ valeur: 8, libelle: '8 jours' },
								{ valeur: 15, libelle: '15 jours' },
								{ valeur: 30, libelle: '30 jours' }
							]}
							valeur={choix.delaiJours}
							onChange={(delaiJours) => onChange({ ...choix, delaiJours })}
						/>
					</Champ>
					<Champ etiquette="Ce que la lettre annonce s’il ne paie pas">
						<Choix
							options={[
								{ valeur: 'SUITE_GENERALE' as const, libelle: 'Toute action utile' },
								{ valeur: 'SUITE_JURIDICTION' as const, libelle: 'Saisir le tribunal' }
							]}
							valeur={choix.suite}
							onChange={(suite) => onChange({ ...choix, suite })}
						/>
					</Champ>
					<Champ etiquette="Comment il vous paie">
						<Choix
							options={[
								{ valeur: 'VIREMENT_IBAN' as const, libelle: 'Virement sur mon IBAN' },
								{ valeur: 'SELON_FACTURES' as const, libelle: 'Comme indiqué sur mes factures' }
							]}
							valeur={choix.modalite}
							onChange={(modalite) => onChange({ ...choix, modalite })}
						/>
					</Champ>
					<Champ etiquette="Réserver des frais au-delà des frais de recouvrement, sur justificatifs">
						<Choix
							options={[
								{ valeur: false, libelle: 'Non' },
								{ valeur: true, libelle: 'Oui' }
							]}
							valeur={choix.reserveIndemnisationComplementaire}
							onChange={(reserveIndemnisationComplementaire) =>
								onChange({ ...choix, reserveIndemnisationComplementaire })
							}
						/>
					</Champ>
				</div>
			);
		case 'ACCORD_ECHEANCIER':
			return (
				<div className="flex flex-col gap-cladd-2xs">
					<Champ etiquette="Nombre de versements">
						<Input
							size="lg"
							inputMode="numeric"
							value={String(choix.nombre)}
							onChange={(v) => onChange({ ...choix, nombre: Number.parseInt(v, 10) || 0 })}
						/>
					</Champ>
					<Champ etiquette="Premier versement, au plus tard le">
						<Input
							size="lg"
							type="date"
							value={choix.premiereEcheance}
							onChange={(premiereEcheance) => onChange({ ...choix, premiereEcheance })}
						/>
					</Champ>
					<Champ etiquette="Un versement tous les">
						<Choix
							options={[
								{ valeur: 1, libelle: '1 mois' },
								{ valeur: 2, libelle: '2 mois' },
								{ valeur: 3, libelle: '3 mois' }
							]}
							valeur={choix.intervalleMois}
							onChange={(intervalleMois) => onChange({ ...choix, intervalleMois })}
						/>
					</Champ>
					<Champ etiquette="Les pénalités pendant l’échéancier">
						<Choix
							options={[
								{
									valeur: 'RENONCIATION' as const,
									libelle: 'Y renoncer tant qu’il paie à l’heure'
								},
								{ valeur: 'MAINTENUES' as const, libelle: 'Les maintenir' }
							]}
							valeur={choix.penalites}
							onChange={(penalites) => onChange({ ...choix, penalites })}
						/>
					</Champ>
					<Champ etiquette="Jours laissés pour rattraper un versement manqué">
						<Choix
							options={[
								{ valeur: 8, libelle: '8 jours' },
								{ valeur: 15, libelle: '15 jours' },
								{ valeur: 30, libelle: '30 jours' }
							]}
							valeur={choix.delaiRegularisationJours}
							onChange={(delaiRegularisationJours) =>
								onChange({ ...choix, delaiRegularisationJours })
							}
						/>
					</Champ>
					<Champ etiquette="Qui signe pour votre client (nom et prénom)">
						<Input
							size="lg"
							value={choix.debiteurSignataireNom}
							onChange={(debiteurSignataireNom) => onChange({ ...choix, debiteurSignataireNom })}
						/>
					</Champ>
					<Champ etiquette="Sa fonction">
						<Input
							size="lg"
							value={choix.debiteurSignataireQualite}
							onChange={(debiteurSignataireQualite) =>
								onChange({ ...choix, debiteurSignataireQualite })
							}
						/>
					</Champ>
				</div>
			);
		case 'DECLARATION_CREANCE':
		case 'INFORMATION_MANDATAIRE':
			return (
				<div className="flex flex-col gap-cladd-2xs">
					{citationAnnonce === null ? null : (
						<blockquote className="border-l-2 border-cladd-outline pl-cladd-3xs text-cladd-2xs leading-relaxed">
							« {citationAnnonce} »
						</blockquote>
					)}
					<Champ etiquette="La personne nommée par le tribunal (nom, tel qu’écrit dans l’annonce)">
						<Input
							size="lg"
							value={choix.mandataireNom}
							onChange={(mandataireNom) => onChange({ ...choix, mandataireNom })}
						/>
					</Champ>
					<Champ etiquette="Son adresse">
						<Input
							size="lg"
							value={choix.mandataireAdresse}
							onChange={(mandataireAdresse) => onChange({ ...choix, mandataireAdresse })}
						/>
					</Champ>
					{choix.modele === 'DECLARATION_CREANCE' ? (
						<>
							<Champ etiquette="Sa référence du dossier, si elle vous a écrit (facultatif)">
								<Input
									size="lg"
									value={choix.referenceDossier}
									onChange={(referenceDossier) => onChange({ ...choix, referenceDossier })}
								/>
							</Champ>
							<Champ etiquette="Rien ne protège ce que votre client vous doit : ni gage, ni hypothèque, ni clause qui vous laisse propriétaire de la marchandise jusqu’au paiement">
								<Choix
									options={[
										{ valeur: true, libelle: 'Je le confirme' },
										{ valeur: false, libelle: 'Pas sûr' }
									]}
									valeur={choix.aucuneSurete}
									onChange={(aucuneSurete) => onChange({ ...choix, aucuneSurete })}
								/>
							</Champ>
							<Champ etiquette="Aucun autre procès n’est en cours sur ces factures">
								<Choix
									options={[
										{ valeur: true, libelle: 'Je le confirme' },
										{ valeur: false, libelle: 'Pas sûr' }
									]}
									valeur={choix.aucunProces}
									onChange={(aucunProces) => onChange({ ...choix, aucunProces })}
								/>
							</Champ>
							<Champ etiquette="La personne qui signe est-elle le représentant légal de votre entreprise ?">
								<Choix
									options={[
										{ valeur: true, libelle: 'Oui' },
										{ valeur: false, libelle: 'Non, un pouvoir est joint' }
									]}
									valeur={choix.pouvoir === null}
									onChange={(representant) =>
										onChange({
											...choix,
											pouvoir: representant
												? null
												: { representantNom: '', representantQualite: '', fonctionDuSignataire: '' }
										})
									}
								/>
							</Champ>
							{choix.pouvoir === null ? null : (
								<>
									<Champ etiquette="Le représentant légal (nom et prénom)">
										<Input
											size="lg"
											value={choix.pouvoir.representantNom}
											onChange={(representantNom) =>
												onChange({ ...choix, pouvoir: { ...choix.pouvoir!, representantNom } })
											}
										/>
									</Champ>
									<Champ etiquette="Sa fonction (gérant, président…)">
										<Input
											size="lg"
											value={choix.pouvoir.representantQualite}
											onChange={(representantQualite) =>
												onChange({ ...choix, pouvoir: { ...choix.pouvoir!, representantQualite } })
											}
										/>
									</Champ>
									<Champ etiquette="La fonction de la personne qui signe">
										<Input
											size="lg"
											value={choix.pouvoir.fonctionDuSignataire}
											onChange={(fonctionDuSignataire) =>
												onChange({ ...choix, pouvoir: { ...choix.pouvoir!, fonctionDuSignataire } })
											}
										/>
									</Champ>
								</>
							)}
						</>
					) : null}
				</div>
			);
		case 'TRANSMISSION_AVOCAT':
		case 'DEMANDE_SIGNIFICATION': {
			const role = choix.modele === 'TRANSMISSION_AVOCAT' ? 'AVOCAT' : 'COMMISSAIRE_DE_JUSTICE';
			const proposables = intervenants.filter((i) => i.role === role);
			return (
				<div className="flex flex-col gap-cladd-2xs">
					<Champ
						etiquette={
							choix.modele === 'TRANSMISSION_AVOCAT'
								? 'Votre avocat'
								: 'Le commissaire de justice (l’ancien huissier)'
						}
						aide={
							proposables.length === 0
								? 'Ajoutez-le d’abord à votre carnet, dans « Voir les autres choix ».'
								: undefined
						}
					>
						{proposables.length === 0 ? null : (
							<Choix
								options={proposables.map((i) => ({
									valeur: i.id as string | null,
									libelle: i.nom
								}))}
								valeur={choix.intervenantId}
								onChange={(intervenantId) => onChange({ ...choix, intervenantId })}
							/>
						)}
					</Champ>
					{choix.modele === 'TRANSMISSION_AVOCAT' ? (
						<Champ etiquette="Marquer la lettre « confidentiel »">
							<Choix
								options={[
									{ valeur: true, libelle: 'Oui' },
									{ valeur: false, libelle: 'Non' }
								]}
								valeur={choix.confidentiel}
								onChange={(confidentiel) => onChange({ ...choix, confidentiel })}
							/>
						</Champ>
					) : (
						<>
							<Champ etiquette="Le tribunal qui a rendu la décision (tel qu’écrit dessus)">
								<Input
									size="lg"
									value={choix.juridiction}
									onChange={(juridiction) => onChange({ ...choix, juridiction })}
								/>
							</Champ>
							<Champ etiquette="Le numéro de la décision">
								<Input
									size="lg"
									value={choix.numero}
									onChange={(numero) => onChange({ ...choix, numero })}
								/>
							</Champ>
							<Champ etiquette="Nombre de documents que le greffe vous a rendus">
								<Input
									size="lg"
									inputMode="numeric"
									value={choix.nombrePieces === 0 ? '' : String(choix.nombrePieces)}
									onChange={(v) =>
										onChange({ ...choix, nombrePieces: Number.parseInt(v, 10) || 0 })
									}
								/>
							</Champ>
						</>
					)}
				</div>
			);
		}
	}
}

function Texte({ corps }: { corps: string }) {
	return (
		<pre className="max-h-96 overflow-auto rounded-cladd-md border border-cladd-outline p-cladd-3xs font-sans text-cladd-2xs leading-relaxed whitespace-pre-wrap">
			{corps}
		</pre>
	);
}

function Apercu({
	apercu,
	enCours,
	onPreparer
}: {
	apercu: ApercuAffiche | null | undefined;
	enCours: boolean;
	onPreparer: () => void;
}) {
	if (apercu === undefined) {
		return <p className="text-cladd-xs text-cladd-fg-soft">Composition de l’aperçu…</p>;
	}
	if (apercu === null) return null;
	if (!apercu.ok) {
		return (
			<div className="flex flex-col gap-1">
				<p className="text-cladd-xs font-semibold">Ce qu’il manque pour préparer ce courrier</p>
				<ul className="flex flex-col gap-0.5">
					{apercu.manques.map((m) => (
						<li key={m} className="text-cladd-xs text-cladd-fg-soft">
							· {m}
						</li>
					))}
				</ul>
			</div>
		);
	}
	return (
		<div className="flex flex-col gap-cladd-3xs">
			<p className="text-cladd-xs font-semibold">
				Pour {apercu.destinataire} · {CANAL[apercu.canal]}
			</p>
			{apercu.resume.map((phrase) => (
				<p key={phrase} className="text-cladd-xs leading-snug">
					{phrase}
				</p>
			))}
			<p className="text-cladd-2xs text-cladd-fg-soft">
				Pré-rempli avec vos données. Les chiffres suivent les textes cités dans le calcul ; les
				lignes marquées « lecture » reposent sur une interprétation qu’aucun juge n’a confirmée.
				Aucun avocat n’a relu ce modèle.
			</p>
			<Texte corps={apercu.corps} />
			<BoutonPrincipal className="self-start" disabled={enCours} onClick={onPreparer}>
				Préparer ce courrier
			</BoutonPrincipal>
		</div>
	);
}

function Envoi({
	envoi,
	peutValider,
	aujourdHui,
	enCours,
	onValider,
	onDeclarerParti,
	onAbandonner,
	onTelechargerPdf,
	onTelechargerAnnexe
}: {
	envoi: EnvoiAffiche;
	peutValider: boolean;
	aujourdHui: string;
	enCours: boolean;
	onValider: () => void;
	onDeclarerParti: (partiLe: string) => void;
	onAbandonner: () => void;
	onTelechargerPdf: () => void;
	onTelechargerAnnexe: () => void;
}) {
	const [partiLe, setPartiLe] = useState(aujourdHui);
	const [texteOuvert, setTexteOuvert] = useState(envoi.etat === 'A_VALIDER');
	const [copie, setCopie] = useState(false);
	const mailto = `mailto:?subject=${encodeURIComponent(envoi.objet)}&body=${encodeURIComponent(envoi.corps)}`;

	return (
		<Surface
			variant="transparent"
			outline={false}
			className="verre-carte rounded-cladd-xl"
			contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs"
		>
			<div className="flex flex-wrap items-baseline justify-between gap-cladd-3xs">
				<p className="text-cladd-sm font-semibold">{envoi.titre}</p>
				<Chip size="md" color="neutral">
					{ETAT[envoi.etat]}
					{envoi.etat === 'PARTI' && envoi.partiLe !== undefined
						? ` le ${dateCourte(envoi.partiLe)}`
						: ''}
				</Chip>
			</div>
			<p className="text-cladd-xs text-cladd-fg-soft">
				Pour {envoi.destinataire} · {CANAL[envoi.canal]} · préparé le {dateCourte(envoi.prepareLe)}
				{envoi.valideLe === undefined ? '' : ` · validé le ${dateCourte(envoi.valideLe)}`}
			</p>
			{envoi.etat === 'A_VALIDER'
				? envoi.resume.map((phrase) => (
						<p key={phrase} className="text-cladd-xs leading-snug">
							{phrase}
						</p>
					))
				: null}

			<BoutonSecondaire className="self-start" onClick={() => setTexteOuvert((o) => !o)}>
				{texteOuvert ? 'Masquer le texte' : 'Lire le texte'}
			</BoutonSecondaire>
			{texteOuvert ? <Texte corps={envoi.corps} /> : null}
			{envoi.empreinte === undefined ? null : (
				<p className="text-cladd-2xs break-all text-cladd-fg-softest">
					Texte figé à la validation · empreinte {envoi.empreinte.slice(0, 16)}…
				</p>
			)}

			{envoi.etat === 'A_VALIDER' ? (
				<div className="flex flex-wrap gap-cladd-3xs">
					{peutValider ? (
						<BoutonPrincipal disabled={enCours} onClick={onValider}>
							Valider ce courrier
						</BoutonPrincipal>
					) : (
						<p className="text-cladd-xs text-cladd-fg-soft">
							Un administrateur de votre entreprise doit le valider.
						</p>
					)}
					<BoutonSecondaire disabled={enCours} onClick={onAbandonner}>
						Abandonner
					</BoutonSecondaire>
				</div>
			) : null}

			{envoi.etat === 'VALIDE' || envoi.etat === 'PARTI' ? (
				<div className="flex flex-wrap gap-cladd-3xs">
					<BoutonSecondaire onClick={onTelechargerPdf}>Télécharger le PDF</BoutonSecondaire>
					{envoi.annexeDisponible ? (
						<BoutonSecondaire onClick={onTelechargerAnnexe}>
							Télécharger le calcul joint
						</BoutonSecondaire>
					) : null}
					{envoi.canal === 'MESSAGERIE' ? (
						<>
							<BoutonSecondaire onClick={() => window.open(mailto, '_self')}>
								Ouvrir dans ma messagerie
							</BoutonSecondaire>
							<BoutonSecondaire
								onClick={() => {
									void navigator.clipboard.writeText(envoi.corps).then(() => {
										setCopie(true);
										window.setTimeout(() => setCopie(false), 2000);
									});
								}}
							>
								{copie ? 'Copié' : 'Copier le texte'}
							</BoutonSecondaire>
						</>
					) : null}
				</div>
			) : null}

			{envoi.etat === 'VALIDE' ? (
				<div className="flex flex-col gap-cladd-3xs border-t border-cladd-outline pt-cladd-3xs">
					<p className="text-cladd-xs">
						Une fois envoyé, dites-le ici : la date du départ est celle qui compte.
					</p>
					<div className="flex flex-wrap items-end gap-cladd-3xs">
						<Input size="lg" type="date" value={partiLe} onChange={setPartiLe} />
						<BoutonSecondaire
							disabled={enCours || partiLe === ''}
							onClick={() => onDeclarerParti(partiLe)}
						>
							Je l’ai envoyé ce jour-là
						</BoutonSecondaire>
						<BoutonSecondaire disabled={enCours} onClick={onAbandonner}>
							Abandonner
						</BoutonSecondaire>
					</div>
				</div>
			) : null}
		</Surface>
	);
}

export function Courriers({ courriers }: { courriers: CourriersDuDossier }) {
	const [choix, setChoix] = useState<ChoixCourrierAffiche | null>(null);

	function choisir(c: ChoixCourrierAffiche | null) {
		setChoix(c);
		courriers.onChoisir(c);
	}

	return (
		<div className="flex flex-col gap-cladd-2xs">
			{courriers.erreur === null ? null : (
				<p className="text-cladd-xs text-cladd-fg">{courriers.erreur}</p>
			)}

			{courriers.envois
				.filter((e) => e.etat !== 'ABANDONNE')
				.map((envoi) => (
					<Envoi
						key={envoi.id}
						envoi={envoi}
						peutValider={courriers.peutValider}
						aujourdHui={courriers.aujourdHui}
						enCours={courriers.enCours}
						onValider={() => courriers.onValider(envoi.id)}
						onDeclarerParti={(partiLe) => courriers.onDeclarerParti(envoi.id, partiLe)}
						onAbandonner={() => courriers.onAbandonner(envoi.id)}
						onTelechargerPdf={() => courriers.onTelechargerPdf(envoi)}
						onTelechargerAnnexe={() => courriers.onTelechargerAnnexe(envoi)}
					/>
				))}

			<p className="text-cladd-2xs font-semibold">Préparer un courrier</p>
			<div className="flex flex-col gap-cladd-3xs">
				{courriers.modeles.map((m) => {
					const actif = choix?.modele === m.cle;
					return (
						<Surface
							key={m.cle}
							variant="transparent"
							outline={false}
							className="verre-carte rounded-cladd-xl"
							contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs"
						>
							<div className="flex flex-wrap items-center justify-between gap-cladd-3xs">
								<div className="flex min-w-0 flex-col">
									<p className="text-cladd-sm font-semibold">{m.titre}</p>
									<p className="text-cladd-xs text-cladd-fg-soft">
										{m.indisponible ?? m.description}
									</p>
								</div>
								{m.indisponible === null ? (
									<BoutonSecondaire
										onClick={() =>
											choisir(actif ? null : choixInitial(m.cle, courriers.aujourdHui))
										}
									>
										{actif ? 'Fermer' : 'Préparer'}
									</BoutonSecondaire>
								) : null}
							</div>
							{actif && choix !== null ? (
								<>
									<FormulaireChoix
										choix={choix}
										onChange={choisir}
										intervenants={courriers.intervenants}
										citationAnnonce={courriers.citationAnnonce}
									/>
									<Apercu
										apercu={courriers.apercu}
										enCours={courriers.enCours}
										onPreparer={() => {
											courriers.onPreparer(choix);
											choisir(null);
										}}
									/>
								</>
							) : null}
						</Surface>
					);
				})}
			</div>
		</div>
	);
}
