import { useState } from 'react';
import { Input, Popup, PopupContent } from '@cladd-ui/react';
import { CheckIcon } from 'lucide-react';
import { BoutonPrincipal, BoutonSecondaire } from './bouton';
import { Champ, MessageErreur } from './cadre-auth';
import { cn } from './cn';
import { dateCourte } from './format';
import { Lien } from './lien';
import { NOM_DU_PILOTE } from './plume';

/**
 * CLASSER UN DOSSIER — en feuille, une raison à choisir (08/10/2026).
 *
 * Sur le modèle de Cash App (« What type of issue are you having? ») : une carte
 * par raison, son titre et une ligne qui dit ce qu'elle veut dire, puis UN bouton.
 * Wise ferme une demande (« Close request ») ; Stripe marque une facture
 * « uncollectible ». Ici, rien n'est effacé, et le dossier se rouvre d'un toucher.
 *
 * ⚠️ AUCUNE COULEUR DE SEUIL. Classer n'est pas « grave » : c'est une décision
 * du gérant, et la feuille la présente comme telle.
 */

export type MotifClassement = 'GESTE_COMMERCIAL' | 'IRRECOUVRABLE' | 'ERREUR' | 'AUTRE';

const MOTIFS: readonly {
	readonly cle: MotifClassement;
	readonly titre: string;
	readonly ligne: string;
}[] = [
	{
		cle: 'GESTE_COMMERCIAL',
		titre: 'Je fais un geste',
		ligne: 'Vous renoncez à cette somme, pour garder le client.'
	},
	{
		cle: 'IRRECOUVRABLE',
		titre: 'Je n’y crois plus',
		ligne: 'L’entreprise a fermé, ou la somme ne vaut plus la peine.'
	},
	{
		cle: 'ERREUR',
		titre: 'Facture en erreur ou en double',
		ligne: 'Un avoir la corrigera dans votre comptabilité.'
	},
	{ cle: 'AUTRE', titre: 'Autre raison', ligne: 'Dites-la en quelques mots.' }
];

export function FeuilleClassement({
	ouverte,
	onFermer,
	debiteurId,
	enCours = false,
	erreur = null,
	onClasser
}: {
	readonly ouverte: boolean;
	readonly onFermer: () => void;
	readonly debiteurId: string;
	readonly enCours?: boolean;
	readonly erreur?: string | null;
	readonly onClasser: (motif: MotifClassement, note?: string) => void;
}) {
	const [motif, setMotif] = useState<MotifClassement | null>(null);
	const [note, setNote] = useState('');
	const pret = motif !== null && (motif !== 'AUTRE' || note.trim() !== '');

	return (
		<Popup
			open={ouverte}
			onOpenChange={(o) => {
				if (!o) onFermer();
			}}
			headerLeft={<span className="px-2 pb-1 text-cladd-xs font-semibold">Classer le dossier</span>}
			contentClassName="max-w-lg"
		>
			<PopupContent>
				<div className="flex flex-col gap-cladd-3xs">
					<p className="px-1 text-cladd-2xs leading-relaxed text-cladd-fg-soft">
						Il a payé ?{' '}
						<Lien
							to="/app/clients/$id"
							params={{ id: debiteurId }}
							className="font-medium text-cladd-primary underline underline-offset-2"
						>
							Notez le règlement sur sa fiche
						</Lien>{' '}
						: c’est lui qui solde les factures.
					</p>

					<div role="radiogroup" aria-label="Pourquoi le classer" className="flex flex-col gap-2">
						{MOTIFS.map((m) => {
							const choisi = motif === m.cle;
							return (
								<button
									key={m.cle}
									type="button"
									role="radio"
									aria-checked={choisi}
									onClick={() => setMotif(m.cle)}
									className={cn(
										'verre-carte verre-bouton flex min-h-14 w-full items-center gap-3 rounded-cladd-xl px-3.5 py-2.5 text-left',
										choisi && 'outline-2 outline-cladd-primary'
									)}
								>
									<span className="flex min-w-0 flex-1 flex-col">
										<span className="text-cladd-xs font-semibold">{m.titre}</span>
										<span className="text-cladd-2xs text-cladd-fg-soft">{m.ligne}</span>
									</span>
									<span
										aria-hidden
										className={cn(
											'flex size-5 shrink-0 items-center justify-center rounded-full border-2',
											choisi
												? 'border-cladd-primary bg-cladd-primary text-white'
												: 'border-cladd-fg/25'
										)}
									>
										{choisi ? <CheckIcon className="size-3" strokeWidth={3} /> : null}
									</span>
								</button>
							);
						})}
					</div>

					{motif === null ? null : (
						<Champ
							etiquette={motif === 'AUTRE' ? 'Pourquoi' : 'Un mot pour plus tard (facultatif)'}
						>
							<Input value={note} onChange={setNote} placeholder="Ce que vous voulez retenir" />
						</Champ>
					)}

					{erreur === null ? null : <MessageErreur>{erreur}</MessageErreur>}

					<BoutonPrincipal
						pleineLargeur
						disabled={!pret || enCours}
						onClick={() => {
							if (motif === null) return;
							onClasser(motif, note.trim() === '' ? undefined : note.trim());
						}}
					>
						{enCours ? 'Enregistrement…' : 'Classer le dossier'}
					</BoutonPrincipal>
					<p className="px-1 text-center text-cladd-3xs leading-relaxed text-cladd-fg-softer">
						Rien n’est effacé. Les relances s’arrêtent, le dossier quitte vos alertes et ce qui vous
						est dû, et se rouvre d’un toucher.
					</p>
				</div>
			</PopupContent>
		</Popup>
	);
}

/** Le dossier classé, en tête de sa page : pourquoi, quand, et le geste qui le rouvre. */
export function BandeauDossierClasse({
	libelle,
	le,
	note,
	onRouvrir
}: {
	readonly libelle: string;
	readonly le: string;
	readonly note?: string;
	readonly onRouvrir?: () => void;
}) {
	return (
		<section className="verre-carte flex flex-col gap-cladd-3xs rounded-cladd-xl p-cladd-2xs">
			<p className="text-cladd-sm font-semibold">Classé le {dateCourte(le)}</p>
			<p className="text-cladd-2xs leading-snug text-cladd-fg-soft">
				{libelle}
				{note === undefined ? '' : `. ${note}`}
			</p>
			<p className="text-cladd-2xs leading-snug text-cladd-fg-soft">
				{NOM_DU_PILOTE} ne le relance plus et ne le surveille plus.
			</p>
			{onRouvrir === undefined ? null : (
				<BoutonSecondaire className="self-start" onClick={onRouvrir}>
					Rouvrir le dossier
				</BoutonSecondaire>
			)}
		</section>
	);
}
