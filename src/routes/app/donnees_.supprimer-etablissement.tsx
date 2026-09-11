import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation } from 'convex/react';
import { Button, Dialog, DialogRoot, DialogTrigger } from '@cladd-ui/react';
import { TrashIcon } from 'lucide-react';
import { api } from '../../lib/convex/_generated/api';
import { EnteteDetail, Page, PageBody, pluriel } from '../../ui';
import { messageDErreur } from '../../screens/equipe/equipe';

export const Route = createFileRoute('/app/donnees_/supprimer-etablissement')({
	component: PageSupprimerEtablissement
});

const NOMBRE = new Intl.NumberFormat('fr-FR');

/**
 * SUPPRIMER L'ÉTABLISSEMENT — un geste destructeur, sur son propre écran.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI IL NE PEUT PAS RESTER DANS UNE CARTE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Il était la troisième section d'un écran qui en comptait quatre : on le
 * croisait en faisant défiler, entre un inventaire et un autre bouton rouge.
 * Toutes les applications mobiles mettent un réglage destructeur derrière une
 * rangée qui pousse vers sa propre page — non par cérémonie, mais parce qu'un
 * geste irréversible ne doit pas être atteignable par accident.
 *
 * ⚠️ ET LA CONFIRMATION EST UNE SAISIE, PAS UNE CASE. Le nom exact de
 * l'établissement. C'est le seul garde-fou qui résiste au clic machinal — et il
 * est revérifié côté serveur : l'écran peut le demander, seul le serveur peut
 * l'exiger.
 *
 * ⚠️ IL N'Y A PAS DE CORBEILLE. Le règlement demande l'effacement, pas la mise
 * de côté. L'écran le dit avant, pas après.
 */
function PageSupprimerEtablissement() {
	const navigate = useNavigate();
	const apercu = useQuery(api.rgpd.apercuDeMesDonnees, {});
	const supprimer = useMutation(api.rgpd.supprimerEtablissement);
	const [erreur, setErreur] = useState<string | null>(null);

	return (
		<Page>
			<EnteteDetail
				retourVers="/app/donnees"
				retourLibelle="Vos données"
				titre="Supprimer l’établissement"
				sousTitre={apercu?.nomEtablissement}
			/>
			<PageBody>
				<div className="mx-auto flex w-full max-w-2xl flex-col gap-cladd-2xs">
					{apercu === undefined || apercu === null ? (
						<p className="text-cladd-xs text-cladd-fg-soft">Chargement…</p>
					) : (
						<>
							<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
								Ses {NOMBRE.format(apercu.factures)} facture{pluriel(apercu.factures)}, ses{' '}
								{NOMBRE.format(apercu.debiteurs)} débiteur{pluriel(apercu.debiteurs)}, ses{' '}
								{NOMBRE.format(apercu.decomptes)} décompte{pluriel(apercu.decomptes)} et les pièces
								qui les soutiennent sont effacés définitivement. Il n’y a pas de corbeille : le
								règlement demande l’effacement, pas la mise de côté. Les {apercu.membres} personnes
								qui y accèdent en perdent l’accès immédiatement.
							</p>
							<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
								Si vous avez besoin de ces chiffres plus tard — une créance se prescrit en plusieurs
								années — préparez votre export avant.
							</p>

							{erreur ? (
								<p className="text-cladd-xs leading-relaxed" role="alert">
									{erreur}
								</p>
							) : null}

							<DialogRoot>
								<DialogTrigger>
									<Button className="self-start" color="red" size="lg">
										<TrashIcon />
										Supprimer {apercu.nomEtablissement}
									</Button>
								</DialogTrigger>
								<Dialog
									title={`Supprimer ${apercu.nomEtablissement} ?`}
									text={`Cette action est définitive. ${NOMBRE.format(apercu.factures)} facture${pluriel(apercu.factures)} et ${NOMBRE.format(apercu.decomptes)} décompte${pluriel(apercu.decomptes)} seront effacés. Saisissez le nom exact de l’établissement pour confirmer.`}
									requireConfirmText={apercu.nomEtablissement}
									cancelButtonText="Annuler"
									confirmButtonText="Supprimer définitivement"
									confirmButtonColor="red"
									onConfirm={() => {
										setErreur(null);
										void supprimer({ confirmation: apercu.nomEtablissement })
											.then(() => navigate({ to: '/bienvenue' }))
											.catch((e: unknown) => setErreur(messageDErreur(e)));
									}}
								/>
							</DialogRoot>
						</>
					)}
				</div>
			</PageBody>
		</Page>
	);
}
