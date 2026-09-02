import { useState } from 'react';
import { Surface, Button, Input } from '@cladd-ui/react';
import { PenLineIcon, ShieldCheckIcon, TriangleAlertIcon, XIcon } from 'lucide-react';
import { SectionEcran, MessageErreur, empreinteLisible } from '../../ui';
import { MENTION_PORTEE_SIGNATURE } from '../../lib/verticales/egalim/mentions';

const DATE_HEURE = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' });

/**
 * L'état de signature d'un bilan, et les deux actions qui s'y rattachent.
 *
 * SIGNÉ, ON MONTRE LA PREUVE ET PAS UNE COCHE VERTE. Qui a signé, à quel titre,
 * depuis quel compte, à quelle heure serveur, et sur quelle empreinte. C'est
 * exactement ce qu'on présenterait si quelqu'un contestait — donc c'est ce
 * qu'on affiche, sans le replier derrière un « détails ».
 *
 * L'EMPREINTE EST REVÉRIFIÉE À CHAQUE LECTURE. Un diagnostic est figé par
 * construction : l'empreinte ne devrait jamais bouger. C'est précisément pour
 * ça qu'on la revérifie — le jour où elle bougerait, plus rien d'autre ne le
 * signalerait, et une signature portant sur une mesure modifiée serait pire
 * qu'une absence de signature.
 */
export function BlocSignature({
	signature,
	empreinteConcorde,
	enCours,
	erreur,
	onOuvrirSignature,
	onRevoquer
}: {
	signature: {
		nomSignataire: string;
		fonction: string;
		email: string;
		signeLe: number;
		empreinte: string;
		mention: string;
		trace: string | null;
	} | null;
	empreinteConcorde: boolean;
	enCours: boolean;
	erreur: string | null;
	onOuvrirSignature: () => void;
	onRevoquer: (motif: string) => void;
}) {
	const [retrait, setRetrait] = useState(false);
	const [motif, setMotif] = useState('');

	if (!signature) {
		return (
			<SectionEcran
				titre="Signature"
				legende="Un bilan signé porte le nom de qui l'approuve, la date, et l'empreinte de la mesure approuvée."
				actions={
					<Button color="brand" variant="solid-fill" onClick={onOuvrirSignature}>
						<PenLineIcon />
						Signer ce bilan
					</Button>
				}
			>
				{erreur ? <MessageErreur>{erreur}</MessageErreur> : null}
				<p className="text-cladd-2xs leading-relaxed text-cladd-fg-softer">
					{MENTION_PORTEE_SIGNATURE}
				</p>
			</SectionEcran>
		);
	}

	return (
		<SectionEcran
			titre="Signature"
			legende={`Signé le ${DATE_HEURE.format(new Date(signature.signeLe))}.`}
			actions={
				retrait ? null : (
					<Button onClick={() => setRetrait(true)} disabled={enCours}>
						<XIcon />
						Retirer
					</Button>
				)
			}
		>
			{erreur ? <MessageErreur>{erreur}</MessageErreur> : null}

			{/* L'ALERTE QUI COMPTE. Elle ne devrait jamais s'afficher — un
			    diagnostic est figé. Si elle s'affiche, c'est qu'une mesure censée
			    être immuable a changé, et la signature ne porte plus dessus. */}
			{!empreinteConcorde ? (
				<Surface
					outline
					color="orange"
					className="rounded-cladd-lg"
					contentClassName="flex items-start gap-cladd-3xs p-cladd-3xs"
				>
					<TriangleAlertIcon size={16} className="mt-0.5 shrink-0 text-cladd-primary" />
					<p className="text-cladd-2xs leading-relaxed">
						Le bilan ne correspond plus à l&rsquo;empreinte signée. Cette signature ne porte donc
						plus sur la mesure affichée : retirez-la et signez de nouveau.
					</p>
				</Surface>
			) : null}

			<div className="flex flex-wrap items-start gap-cladd-2xs">
				<div className="min-w-0 flex-1">
					<p className="text-cladd-sm font-semibold">
						{signature.nomSignataire} — {signature.fonction}
					</p>
					<p className="text-cladd-2xs text-cladd-fg-soft">{signature.email}</p>
					<p className="mt-cladd-3xs text-cladd-xs leading-relaxed">{signature.mention}</p>
				</div>

				{/* Le tracé, quand il y en a un. Sur fond blanc franc : une signature
				    à l'encre bleue sur un fond chaud perd son contraste, et c'est
				    l'élément que l'œil cherche en premier. */}
				{signature.trace ? (
					<img
						src={signature.trace}
						alt={`Signature manuscrite de ${signature.nomSignataire}`}
						className="h-20 w-auto max-w-64 rounded-cladd-sm bg-white object-contain"
					/>
				) : null}
			</div>

			<div className="flex flex-col gap-1">
				<p className="flex items-center gap-1.5 text-cladd-3xs font-semibold tracking-wide text-cladd-fg-softer uppercase">
					<ShieldCheckIcon size={12} />
					Empreinte de la mesure signée
				</p>
				<p className="text-cladd-3xs leading-relaxed break-all text-cladd-fg-softer">
					{empreinteLisible(signature.empreinte)}
				</p>
			</div>

			{retrait ? (
				<div className="flex flex-col gap-cladd-3xs border-t border-cladd-outline pt-cladd-2xs">
					<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
						La signature reste consignée, marquée comme retirée avec votre motif. Elle
						n&rsquo;est pas effacée&nbsp;: un journal qui se réécrit ne prouve rien, y compris
						quand il dit vrai.
					</p>
					<Input
						value={motif}
						onChange={setMotif}
						placeholder="Motif du retrait — par exemple : erreur sur la fonction du signataire"
					/>
					<div className="flex gap-cladd-3xs">
						<Button
							color="red"
							variant="solid-fill"
							disabled={motif.trim() === ''}
							loading={enCours}
							readOnly={enCours}
							onClick={() => onRevoquer(motif.trim())}
						>
							Retirer la signature
						</Button>
						<Button onClick={() => setRetrait(false)} disabled={enCours}>
							Annuler
						</Button>
					</div>
				</div>
			) : null}
		</SectionEcran>
	);
}
