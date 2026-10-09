import { LinkIcon } from 'lucide-react';
import { SectionTitle, Surface } from '@cladd-ui/react';
import { BoutonSecondaire } from './bouton';
import { ChampCopiable } from './champ-copiable';
import { MessageErreur } from './cadre-auth';
import { dateCourte, eurosCentimes } from './format';

/**
 * LE LIEN QUE LE GÉRANT ENVOIE À SON CLIENT POUR QU'IL PAIE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ IL S'OUVRE SUR LE MONTANT DU JOUR, DATÉ À L'OUVERTURE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Un lien sur un calcul vivant montrerait au client un montant qui augmente
 * pendant qu'il le lit : le virement qu'il lancerait serait déjà faux en
 * arrivant, et le créancier aurait un reliquat à réclamer pour trois euros de
 * pénalités. Le montant se date donc quand le lien s'ouvre (09/10/2026) : il
 * fallait auparavant « arrêter un décompte » d'abord, un geste de plus pour le
 * même chiffre. Un seul lien vivant par dossier ; pour un montant plus récent,
 * on ferme l'ancien et on en ouvre un autre.
 *
 * ⚠️ LE GÉRANT ENVOIE LE LIEN LUI-MÊME. Ce logiciel ne l'expédie pas : il le
 * compose, et le gérant le colle dans sa lettre ou dans son courriel. C'est la
 * même règle que pour les courriers, pour la même raison.
 *
 * ⚠️ ET FERMER EST IMMÉDIAT, DONC DIT COMME TEL. Un lien fermé cesse de
 * répondre pour tout le monde : c'est ce qu'on veut quand on s'est trompé de
 * destinataire, et c'est ce qu'il faut annoncer avant de le faire.
 */

export interface LienDePaiementAffiche {
	readonly jeton: string;
	readonly arreteAu: string;
	readonly total: bigint;
	readonly creeLe: number;
	readonly revoqueLe?: number;
}

export interface LiensDePaiementAffiches {
	readonly liens: readonly LienDePaiementAffiche[];
	/** L'adresse publique, préfixe compris, telle qu'on la colle dans une lettre. */
	readonly adresseDe: (jeton: string) => string;
	readonly enCours: boolean;
	readonly erreur: string | null;
	/** Ouvre un lien sur le montant du jour, qui se date à ce moment-là. */
	readonly onOuvrir: () => void;
	readonly onFermer: (jeton: string) => void;
}

export function LiensDePaiement({
	liens,
	adresseDe,
	enCours,
	erreur,
	onOuvrir,
	onFermer
}: LiensDePaiementAffiches) {
	const vivants = liens.filter((lien) => lien.revoqueLe === undefined);

	return (
		<div className="flex flex-col gap-cladd-3xs">
			<SectionTitle>Le lien où votre client paie</SectionTitle>

			<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
				Une page à votre nom, avec le montant du jour et sa date, votre IBAN et un code à
				scanner qui pré-remplit le virement. Votre client paie depuis sa banque : rien ne passe par ce
				logiciel. C’est vous qui lui envoyez l’adresse.
			</p>

			{vivants.map((lien) => (
				<Surface
					key={lien.jeton}
					variant="transparent"
					outline={false}
					className="verre-carte rounded-cladd-xl"
					contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs"
				>
					<div className="flex flex-wrap items-baseline justify-between gap-cladd-3xs">
						<span className="text-cladd-sm font-semibold">
							Montant au {dateCourte(lien.arreteAu)}
						</span>
						<span className="shrink-0 text-cladd-sm tabular-nums">
							{eurosCentimes(lien.total)}
						</span>
					</div>
					<ChampCopiable
						etiquette="À coller dans votre lettre ou votre courriel"
						affichage={adresseDe(lien.jeton)}
						valeur={adresseDe(lien.jeton)}
					/>
					<BoutonSecondaire
						className="self-start"
						disabled={enCours}
						onClick={() => onFermer(lien.jeton)}
					>
						Fermer ce lien
					</BoutonSecondaire>
					<p className="text-cladd-2xs leading-relaxed text-cladd-fg-softest">
						Fermer prend effet tout de suite : l’adresse cesse de répondre, même si votre
						client l’a déjà ouverte.
					</p>
				</Surface>
			))}

			{erreur === null ? null : <MessageErreur>{erreur}</MessageErreur>}

			{/* Un seul lien vivant : il porte déjà son montant et sa date. */}
			{vivants.length > 0 ? null : (
				<BoutonSecondaire className="self-start" disabled={enCours} onClick={onOuvrir}>
					<LinkIcon />
					{enCours ? 'Ouverture…' : 'Ouvrir un lien sur le montant du jour'}
				</BoutonSecondaire>
			)}
		</div>
	);
}
