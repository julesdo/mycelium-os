import { useState } from 'react';
import { Input, Popup, PopupContent } from '@cladd-ui/react';
import { ChevronLeftIcon } from 'lucide-react';
import { BoutonPrincipal, BoutonTexte } from './bouton';
import { Champ, MessageErreur } from './cadre-auth';
import { CarteBouton, CarteLien, ListeDeCartes } from './carte-rangee';
import { VignetteRangee } from './familles';
import { eurosCentimes, jourDecale } from './format';

/**
 * « IL VOUS A RÉPONDU ? » — UNE QUESTION, CINQ ISSUES (analyse des parcours du 08/10/2026).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LE MOMENT QUE LE PRODUIT NE SERVAIT PAS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Les relances partent au nom du gérant, et les réponses arrivent dans SA
 * messagerie, ou au téléphone. C'est le moment le plus fréquent d'un impayé —
 * « il m'a rappelé, il paie vendredi » — et il fallait, pour le noter, ouvrir
 * l'historique, choisir « Une promesse » dans un segment de quatre, remplir un
 * texte libre, un montant et une date. Pour « il conteste », il fallait savoir
 * que le questionnaire vivait dans la rangée « Désaccord ». Pour « il veut payer
 * en trois fois », il n'y avait rien.
 *
 * La question est posée comme le client y a répondu, sur le modèle de Cash App
 * (« What type of issue are you having? » : une carte par cas, son titre et une
 * ligne qui dit ce qui va se passer). Chaque issue mène à UN geste.
 *
 * ⚠️ AUCUNE ISSUE NE BLOQUE LE DOSSIER. « Il conteste » se note et le dossier
 * continue (une contestation ne bloque jamais rien) ; « il dit avoir payé » mène
 * à l'endroit où l'on note un règlement, sans rien suspendre.
 */
export function FeuilleReponseClient({
	ouverte,
	onFermer,
	client,
	debiteurId,
	resteDu,
	aujourdHui,
	enCours = false,
	erreur = null,
	onPromesse,
	onEcheancier,
	onContestation,
	onAutre
}: {
	readonly ouverte: boolean;
	readonly onFermer: () => void;
	readonly client: string;
	readonly debiteurId: string;
	/** Ce qui reste dû sur les factures, hors pénalités : le montant proposé d'office. */
	readonly resteDu: bigint;
	readonly aujourdHui: string;
	readonly enCours?: boolean;
	readonly erreur?: string | null;
	readonly onPromesse: (promesse: { montantEuros: string; le: string }) => void;
	/** Absent quand il ne reste rien à échelonner, ou qu'un échéancier court déjà. */
	readonly onEcheancier?: () => void;
	readonly onContestation: () => void;
	readonly onAutre: () => void;
}) {
	const [etape, setEtape] = useState<'CHOIX' | 'PROMESSE'>('CHOIX');
	const [montant, setMontant] = useState(() => eurosCentimes(resteDu).replace(/[^\d,]/g, ''));
	const [le, setLe] = useState(() => jourDecale(aujourdHui, 7));

	const fermer = () => {
		setEtape('CHOIX');
		onFermer();
	};

	return (
		<Popup
			open={ouverte}
			onOpenChange={(o) => {
				if (!o) fermer();
			}}
			headerLeft={
				etape === 'CHOIX' ? (
					<span className="px-2 pb-1 text-cladd-xs font-semibold">Il vous a répondu ?</span>
				) : (
					<BoutonTexte className="pb-1" onClick={() => setEtape('CHOIX')}>
						<ChevronLeftIcon />
						Il vous a répondu ?
					</BoutonTexte>
				)
			}
			contentClassName="max-w-lg"
		>
			<PopupContent>
				{etape === 'CHOIX' ? (
					<div className="flex flex-col gap-cladd-3xs">
						<p className="px-1 text-cladd-2xs leading-relaxed text-cladd-fg-soft">
							Ce que {client} vous a dit, au téléphone ou par écrit.
						</p>
						<ListeDeCartes>
							<CarteBouton
								titre="Il va payer"
								ligne="Un jour, et le montant"
								icone={<VignetteRangee famille="ARGENT" className="size-10" />}
								onClick={() => setEtape('PROMESSE')}
							/>
							{onEcheancier === undefined ? null : (
								<CarteBouton
									titre="Il veut payer en plusieurs fois"
									ligne="Un échéancier, suivi versement par versement"
									icone={<VignetteRangee famille="TEMPS" className="size-10" />}
									onClick={() => {
										fermer();
										onEcheancier();
									}}
								/>
							)}
							<CarteBouton
								titre="Il conteste"
								ligne="Notez ce qu’il dit : le dossier continue"
								icone={<VignetteRangee famille="QUESTION" className="size-10" />}
								onClick={() => {
									fermer();
									onContestation();
								}}
							/>
							<CarteLien
								vers="/app/clients/$id"
								parametres={{ id: debiteurId }}
								titre="Il dit avoir déjà payé"
								ligne="Notez le règlement sur sa fiche"
								icone={<VignetteRangee famille="PAPIERS" className="size-10" />}
							/>
							<CarteBouton
								titre="Autre chose"
								ligne="Une note dans l’historique du dossier"
								icone={<VignetteRangee famille="MACHINE" className="size-10" />}
								onClick={() => {
									fermer();
									onAutre();
								}}
							/>
						</ListeDeCartes>
					</div>
				) : (
					<div className="flex flex-col gap-cladd-3xs">
						<Champ etiquette="Combien, en euros">
							<Input
								inputMode="decimal"
								value={montant}
								onChange={setMontant}
								placeholder="1 200,00"
							/>
						</Champ>
						<Champ
							etiquette="Pour quel jour"
							aide="Je ne le relance pas avant ce jour, plus trois jours pour que le virement arrive."
						>
							<Input type="date" value={le} onChange={setLe} />
						</Champ>
						{erreur === null ? null : <MessageErreur>{erreur}</MessageErreur>}
						<BoutonPrincipal
							pleineLargeur
							disabled={enCours || montant.trim() === '' || le < aujourdHui}
							onClick={() => {
								onPromesse({ montantEuros: montant, le });
								fermer();
							}}
						>
							{enCours ? 'Enregistrement…' : 'Noter sa promesse'}
						</BoutonPrincipal>
					</div>
				)}
			</PopupContent>
		</Popup>
	);
}
