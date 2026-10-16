import { useState, type ReactNode } from 'react';
import { CalendarPlusIcon, MailIcon, PhoneIcon, StickyNoteIcon } from 'lucide-react';
import {
	ActionsRapides,
	BoutonSecondaire,
	EnTeteDeGroupe,
	ListeDeCartes,
	type ActionRapide
} from '../../ui';
import {
	ComposeurDeNote,
	FicheEnDeuxColonnes,
	HistoriqueParJour,
	IdentiteDeFiche,
	type EvenementAffiche
} from '../../ui/admin';
import {
	FeuilleDEchange,
	FeuilleDeTache,
	Tache,
	joursDHistorique,
	type TacheAffichee
} from './commun';

/**
 * LE CORPS D'UNE FICHE, COMPTE OU PROSPECT (16/10/2026).
 *
 * En tête, l'identité et quatre gestes rapides (HubSpot) : Note, Appel noté, E-mail,
 * Tâche. Puis, au bureau en deux colonnes et au téléphone en deux segments, les
 * détails et l'historique : « À faire » épinglé en tête (le « Focus » de
 * Pipedrive), le composeur, puis les faits groupés par jour.
 *
 * ⚠️ UN RÔLE EN LECTURE NE VOIT NI LES GESTES NI LE COMPOSEUR : le serveur les
 * refuserait, et un bouton qui échoue à chaque fois ment sur ce qu'on peut faire.
 */

export type TypeEchange = 'NOTE' | 'APPEL' | 'EMAIL' | 'REPONSE';

export interface GestesDeFiche {
	readonly onNoter: (type: TypeEchange, texte?: string) => Promise<void>;
	readonly onCreerTache: (titre: string, pour: number) => Promise<void>;
	readonly onCocher: (id: string, faite: boolean) => void;
}

type Feuille = null | 'APPEL' | 'EMAIL' | 'TACHE';

export function CorpsDeFiche({
	nom,
	ligne,
	apres,
	email,
	details,
	taches,
	evenements,
	maintenant,
	finDuJour,
	gestes
}: {
	readonly nom: string;
	readonly ligne?: string;
	readonly apres?: ReactNode;
	/** L'adresse à qui écrire : le premier administrateur d'un compte, le prospect. */
	readonly email?: string;
	readonly details: ReactNode;
	readonly taches: readonly TacheAffichee[];
	readonly evenements: readonly (EvenementAffiche & { readonly le: number })[];
	readonly maintenant: number;
	readonly finDuJour: number;
	/** Absents pour le rôle en lecture. */
	readonly gestes?: GestesDeFiche;
}) {
	const [feuille, setFeuille] = useState<Feuille>(null);
	const [segment, setSegment] = useState<'historique' | 'details'>('historique');
	const [note, setNote] = useState('');
	const [envoiEnCours, setEnvoiEnCours] = useState(false);

	async function envoyerLaNote() {
		if (gestes === undefined) return;
		setEnvoiEnCours(true);
		try {
			await gestes.onNoter('NOTE', note);
			setNote('');
		} catch {
			// Le refus est dit par l'appelant ; la note reste dans le composeur.
		} finally {
			setEnvoiEnCours(false);
		}
	}

	/** « Note » : le segment de l'historique, et le curseur dans le composeur. */
	function ecrireUneNote() {
		setSegment('historique');
		requestAnimationFrame(() =>
			document.querySelector<HTMLTextAreaElement>('[data-composeur-note] textarea')?.focus()
		);
	}

	const actions: ActionRapide[] =
		gestes === undefined
			? []
			: [
					{ cle: 'note', libelle: 'Note', icone: <StickyNoteIcon />, onClick: ecrireUneNote },
					{
						cle: 'appel',
						libelle: 'Appel noté',
						icone: <PhoneIcon />,
						onClick: () => setFeuille('APPEL')
					},
					{
						cle: 'email',
						libelle: 'E-mail',
						icone: <MailIcon />,
						onClick: () => setFeuille('EMAIL')
					},
					{
						cle: 'tache',
						libelle: 'Tâche',
						icone: <CalendarPlusIcon />,
						onClick: () => setFeuille('TACHE')
					}
				];
	const ouvertes = taches.filter((t) => t.faiteLe === undefined).sort((a, b) => a.pour - b.pour);
	const jours = joursDHistorique(evenements, maintenant);

	return (
		<>
			<FicheEnDeuxColonnes
				segment={segment}
				onSegment={setSegment}
				identite={
					<IdentiteDeFiche nom={nom} {...(ligne === undefined ? {} : { ligne })} apres={apres} />
				}
				gestes={actions.length === 0 ? null : <ActionsRapides actions={actions} />}
				details={details}
				historique={
					<>
						{ouvertes.length === 0 || gestes === undefined ? null : (
							<section className="flex flex-col gap-cladd-3xs">
								<EnTeteDeGroupe libelle="À faire" nombre={ouvertes.length} />
								<ListeDeCartes>
									{ouvertes.map((t) => (
										<Tache
											key={t.id}
											tache={t}
											maintenant={maintenant}
											onCocher={gestes.onCocher}
											avecFiche={false}
										/>
									))}
								</ListeDeCartes>
							</section>
						)}
						{gestes === undefined ? null : (
							<div data-composeur-note>
								<ComposeurDeNote
									valeur={note}
									onChange={setNote}
									onEnvoyer={() => void envoyerLaNote()}
									enCours={envoiEnCours}
								/>
							</div>
						)}
						{jours.length === 0 ? (
							<p className="px-1 text-cladd-2xs text-cladd-fg-soft">
								Rien n’est encore arrivé sur cette fiche. Une note, un appel ou une étape franchie
								s’inscriront ici.
							</p>
						) : (
							<HistoriqueParJour jours={jours} />
						)}
					</>
				}
			/>

			{gestes === undefined ? null : (
				<>
					<FeuilleDEchange
						ouverte={feuille === 'APPEL'}
						onFermer={() => setFeuille(null)}
						type="APPEL"
						onNoter={(texte) => gestes.onNoter('APPEL', texte)}
					/>
					<FeuilleDEchange
						ouverte={feuille === 'EMAIL'}
						onFermer={() => setFeuille(null)}
						type="EMAIL"
						onNoter={(texte) => gestes.onNoter('EMAIL', texte)}
						avant={
							email === undefined ? (
								<p className="px-1 text-cladd-2xs text-cladd-fg-soft">
									Aucune adresse connue pour cette fiche.
								</p>
							) : (
								<BoutonSecondaire as="a" href={`mailto:${email}`} pleineLargeur>
									<MailIcon aria-hidden />
									Écrire à {email}
								</BoutonSecondaire>
							)
						}
					/>
					<FeuilleDeTache
						ouverte={feuille === 'TACHE'}
						onFermer={() => setFeuille(null)}
						finDuJour={finDuJour}
						onCreer={gestes.onCreerTache}
						pour={nom}
					/>
				</>
			)}
		</>
	);
}
