import { useState } from 'react';
import { Button, Chip } from '@cladd-ui/react';
import { CopyIcon, CheckIcon, MailIcon } from 'lucide-react';
import { redigerCourrier } from '../../lib/convex/egalim/courrier';
import { euros, pluriel } from '../../ui';

export interface Attestation {
	attestationId: string;
	supplierName: string;
	amountAtStake: number;
	pointsRecuperables: number;
	produits: string[];
	status: 'DRAFT' | 'SENT' | 'RECEIVED' | 'REFUSED';
}

const STATUTS: Record<Attestation['status'], string> = {
	DRAFT: 'À envoyer',
	SENT: 'Envoyée',
	RECEIVED: 'Reçue',
	REFUSED: 'Refusée'
};

/**
 * Les demandes d'attestation, et leurs courriers.
 *
 * C'est le point du diagnostic qui rapporte le plus vite : des points de ratio
 * récupérés sans changer un seul achat, simplement en réclamant des certificats
 * que le fournisseur détient déjà. Sur une prestation à 1 190 €, c'est souvent
 * ce qui la rembourse à lui seul.
 *
 * Le courrier est donné tout écrit et copiable. On ne l'envoie pas à la place
 * du gérant : c'est sa relation fournisseur, et un courrier signé par un tiers
 * inconnu n'obtient rien.
 */
export function Attestations({
	attestations,
	nomEtablissement,
	periodeDebut,
	periodeFin,
	onChangerStatut
}: {
	attestations: readonly Attestation[];
	nomEtablissement: string;
	periodeDebut: string;
	periodeFin: string;
	onChangerStatut: (id: string, statut: Attestation['status']) => void;
}) {
	const [ouverte, setOuverte] = useState<string | null>(null);
	const [copiee, setCopiee] = useState<string | null>(null);

	if (attestations.length === 0) return null;

	const pointsTotal = attestations.reduce((s, a) => s + a.pointsRecuperables, 0);
	const montantTotal = attestations.reduce((s, a) => s + a.amountAtStake, 0);

	async function copier(a: Attestation) {
		const texte = redigerCourrier({
			nomEtablissement,
			nomFournisseur: a.supplierName,
			produits: a.produits,
			montantEnJeuHT: a.amountAtStake,
			periodeDebut,
			periodeFin
		});
		await navigator.clipboard.writeText(texte);
		setCopiee(a.attestationId);
		window.setTimeout(() => setCopiee(null), 2000);
	}

	return (
		<section className="flex flex-col gap-cladd-3xs">
			<div>
				<h2 className="text-cladd-3xs font-semibold tracking-wide text-cladd-fg-softer uppercase">
					Points à récupérer sans rien changer à vos achats
				</h2>
				<p className="mt-1 text-cladd-xs text-cladd-fg-soft">
					{attestations.length} fournisseur{pluriel(attestations.length)} vous a
					{attestations.length > 1 ? 'ient' : ''} livré des produits présentés comme certifiés,
					sans que le certificat figure au dossier.{' '}
					<span className="font-semibold">
						{euros(montantTotal)} en jeu, soit environ {Math.round(pointsTotal)} point
						{pluriel(pointsTotal)} de taux durable.
					</span>
				</p>
			</div>

			<ul className="flex flex-col gap-cladd-3xs">
				{attestations.map((a) => (
					<li
						key={a.attestationId}
						className="rounded-cladd-md border border-cladd-outline p-cladd-3xs"
					>
						<div className="flex flex-wrap items-center justify-between gap-cladd-3xs">
							<div className="min-w-0">
								<p className="text-cladd-xs font-medium">{a.supplierName}</p>
								<p className="text-cladd-2xs text-cladd-fg-softer tabular-nums">
									{euros(a.amountAtStake)} · {a.produits.length} référence
									{pluriel(a.produits.length)} · environ {Math.round(a.pointsRecuperables)} point
									{pluriel(a.pointsRecuperables)}
								</p>
							</div>
							<div className="flex shrink-0 items-center gap-cladd-3xs">
								<Chip size="sm">{STATUTS[a.status]}</Chip>
								<Button
									variant="gradient"
									onClick={() => setOuverte(ouverte === a.attestationId ? null : a.attestationId)}
								>
									<MailIcon />
									{ouverte === a.attestationId ? 'Masquer' : 'Voir le courrier'}
								</Button>
							</div>
						</div>

						{ouverte === a.attestationId ? (
							<div className="mt-cladd-3xs flex flex-col gap-cladd-3xs">
								<pre className="max-h-96 overflow-auto rounded-cladd-md bg-cladd-surface-cut p-cladd-3xs text-cladd-2xs leading-relaxed whitespace-pre-wrap">
									{redigerCourrier({
										nomEtablissement,
										nomFournisseur: a.supplierName,
										produits: a.produits,
										montantEnJeuHT: a.amountAtStake,
										periodeDebut,
										periodeFin
									})}
								</pre>
								<div className="flex flex-wrap gap-cladd-3xs">
									<Button color="brand" variant="solid-fill" onClick={() => void copier(a)}>
										{copiee === a.attestationId ? <CheckIcon /> : <CopyIcon />}
										{copiee === a.attestationId ? 'Copié' : 'Copier le courrier'}
									</Button>
									{a.status === 'DRAFT' ? (
										<Button
											variant="gradient"
											onClick={() => onChangerStatut(a.attestationId, 'SENT')}
										>
											Je l&rsquo;ai envoyé
										</Button>
									) : null}
									{a.status === 'SENT' ? (
										<>
											<Button
												variant="gradient"
												onClick={() => onChangerStatut(a.attestationId, 'RECEIVED')}
											>
												J&rsquo;ai reçu le certificat
											</Button>
											<Button
												variant="gradient"
												onClick={() => onChangerStatut(a.attestationId, 'REFUSED')}
											>
												Refusé
											</Button>
										</>
									) : null}
								</div>
								{a.status === 'RECEIVED' ? (
									<p className="text-cladd-2xs text-cladd-fg-soft">
										Le certificat reçu ne reclasse rien tout seul : il ne dit pas quelles lignes
										il couvre, et ce diagnostic est figé. Confirmez les produits concernés dans
										votre file pour que la prochaine mesure en tienne compte.
									</p>
								) : null}
							</div>
						) : null}
					</li>
				))}
			</ul>
		</section>
	);
}
