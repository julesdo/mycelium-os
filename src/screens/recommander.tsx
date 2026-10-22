import { useState } from 'react';
import {
	BoutonPrincipal,
	CarteCadeau,
	EnTeteDeGroupe,
	EtapesDeLaRecommandation,
	FeuilleDuQr,
	LigneDeReleve,
	Lien,
	ListeDeReleve,
	ListeDesInvitations,
	ObjectifDeLAnnee,
	PageEcran,
	PartageDuLien,
	QuestionsRepliables,
	dateRelative,
	type InvitationAffichee,
	type Lecture
} from '../ui';
import {
	etapeDeLInvitation,
	liensDePartage,
	messageDInvitation,
	type InvitationSuivie
} from '../lib/croissance/parrainage';
import { DUREE_ESSAI_JOURS, PARRAINAGE } from '../lib/config/tarifs';
import { eurosCentimesCourts } from '../ui/format';
import { TITRE_ECRAN } from './titres';

/**
 * « RECOMMANDER LETIKETTE » (22/10/2026) — la page du programme, refaite sur Revolut,
 * Wise, Gusto, Deel, N26, Cash App, Cleo, Wispr Flow, Numo et Chime après le verdict du
 * fondateur sur la première version (« juste un lien comme ça avec un seul bouton ») :
 *
 *   1. le cadeau et l'offre des deux côtés, en grand ;
 *   2. le partage — le seul bouton plein, les canaux en ronds, le lien, le QR code ;
 *   3. l'objectif de l'année, puis ce que les recommandations ont donné ;
 *   4. « Comment ça marche », les questions, et les conditions.
 *
 * ⚠️ AUCUN NOM D'ÉTABLISSEMENT RECOMMANDÉ : des dates et des étapes. Et aucun cadran à
 * zéro (règle d'écran n° 4) : sans invitation, la page montre le chemin.
 */

export interface RecommandationAffichee {
	/** L'adresse à partager, ou `null` pendant qu'elle se crée. */
	readonly lien: string | null;
	readonly nomEtablissement: string;
	readonly moisOfferts: number;
	readonly moisEnAttente: number;
	readonly moisCetteAnnee: number;
	readonly moisParAn: number;
	/** Un mois de la formule souscrite, HT, en centimes ; `null` sans abonnement payant. */
	readonly valeurDuMois: number | null;
	readonly invitations: readonly InvitationSuivie[];
	/** Le jour de la lecture, `AAAA-MM-JJ`. */
	readonly aujourdHui: string;
}

const SUJET = 'Un mois de Letikette, de ma part';

function jourIso(instant: number): string {
	return new Date(instant).toISOString().slice(0, 10);
}

/** « il y a 4 j », « hier », ou « le 12 sept. 2026 » au-delà de quatre-vingt-dix jours. */
function quand(instant: number, aujourdHui: string): string {
	const dit = dateRelative(jourIso(instant), aujourdHui);
	const premier = dit.charAt(0);
	return premier >= '0' && premier <= '9' ? `le ${dit}` : dit;
}

function versInvitation(
	invitation: InvitationSuivie,
	rang: number,
	aujourdHui: string
): InvitationAffichee {
	const { etape, ligne } = etapeDeLInvitation(invitation);
	return {
		cle: `${invitation.inscriteLe}-${rang}`,
		titre:
			invitation.abonneeLe === null
				? `Inscrite ${quand(invitation.inscriteLe, aujourdHui)}`
				: `Abonnée ${quand(invitation.abonneeLe, aujourdHui)}`,
		ligne,
		abonnee: etape === 'ABONNEE'
	};
}

export function EcranRecommander({
	donnees
}: {
	readonly donnees: Lecture<RecommandationAffichee | 'fermee'>;
}) {
	const [qrOuvert, setQrOuvert] = useState(false);
	const entete = {
		genre: 'poussee',
		titre: 'Recommander Letikette',
		retour: { vers: '/app/compte', libelle: TITRE_ECRAN.compte }
	} as const;

	if (donnees.etat !== 'pret') return <PageEcran entete={entete} etat={donnees.etat} />;
	if (donnees.valeur === 'fermee') {
		return (
			<PageEcran
				entete={entete}
				etat={{
					vide: {
						illustration: '🎁',
						titre: 'La recommandation ouvre avec les abonnements',
						explication:
							'Un mois offert se déduit d’un abonnement : la recommandation s’ouvrira en même temps que les formules payantes.',
						action: (
							<BoutonPrincipal as={Lien} to="/app/compte">
								Revenir à votre compte
							</BoutonPrincipal>
						)
					}
				}}
			/>
		);
	}

	const r = donnees.valeur;
	const mois = PARRAINAGE.moisOfferts;
	const valeur =
		r.valeurDuMois === null
			? null
			: `Soit ${eurosCentimesCourts(BigInt(r.valeurDuMois * mois))} HT sur votre formule`;
	const releve = [
		...(r.moisOfferts > 0 ? [{ titre: 'Mois offerts, déjà déduits', valeur: String(r.moisOfferts) }] : []),
		...(r.moisEnAttente > 0
			? [{ titre: 'Mois offerts, au prochain prélèvement', valeur: String(r.moisEnAttente) }]
			: [])
	];
	const essai = `${DUREE_ESSAI_JOURS} jours d’essai`;

	return (
		<PageEcran entete={entete}>
			<div className="flex flex-col gap-cladd-sm">
				<section className="flex flex-col items-center gap-cladd-2xs text-center">
					<CarteCadeau offertPar={r.nomEtablissement} mois={mois} valeur={valeur} />
					<div className="flex max-w-96 flex-col gap-1.5 pt-1">
						<h2 className="text-letikette-titre leading-tight font-bold tracking-tight">
							Un mois pour vous, un mois pour votre confrère
						</h2>
						<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
							Quand un confrère s’abonne par votre lien et paie sa première échéance, un mois de
							Letikette vous est offert à tous les deux.
						</p>
					</div>
				</section>

				{r.lien === null ? (
					<p className="text-center text-cladd-2xs text-cladd-fg-soft" role="status">
						Votre lien se prépare…
					</p>
				) : (
					<PartageDuLien
						lien={r.lien}
						message={messageDInvitation(r.lien)}
						liens={liensDePartage({ lien: r.lien, message: messageDInvitation(r.lien), sujet: SUJET })}
						onQr={() => setQrOuvert(true)}
					/>
				)}

				<ObjectifDeLAnnee
					gagnes={r.moisCetteAnnee}
					maximum={r.moisParAn}
					valeurDuMois={r.valeurDuMois}
				/>

				{r.invitations.length === 0 ? null : (
					<section className="flex flex-col gap-cladd-3xs">
						<EnTeteDeGroupe libelle="Vos invitations" nombre={r.invitations.length} />
						{releve.length === 0 ? null : (
							<ListeDeReleve>
								{releve.map((l) => (
									<LigneDeReleve key={l.titre} titre={l.titre} montant={l.valeur} />
								))}
							</ListeDeReleve>
						)}
						<ListeDesInvitations
							invitations={r.invitations.map((inv, rang) =>
								versInvitation(inv, rang, r.aujourdHui)
							)}
						/>
					</section>
				)}

				<section className="flex flex-col gap-cladd-3xs">
					<EnTeteDeGroupe libelle="Comment ça marche" />
					<EtapesDeLaRecommandation
						etapes={[
							{
								titre: 'Partagez votre lien',
								detail: 'Par WhatsApp, SMS, e-mail ou LinkedIn, ou en personne avec le QR code.'
							},
							{
								titre: 'Votre confrère s’abonne',
								detail: `${essai}, puis sa première échéance.`
							},
							{
								titre: `${mois} mois chacun`,
								detail: 'Déduit de votre prochain prélèvement, et du sien.'
							}
						]}
					/>
				</section>

				<section className="flex flex-col gap-cladd-3xs">
					<EnTeteDeGroupe libelle="Questions fréquentes" />
					<QuestionsRepliables
						questions={[
							{
								question: 'Quand mon mois s’applique-t-il ?',
								reponse: `Dès que votre confrère a payé sa première échéance (ses ${essai} n’en sont pas une), un mois est déduit de votre prochain prélèvement. Si une autre remise court déjà, il attend qu’elle se termine.`
							},
							{
								question: 'Combien de mois puis-je gagner ?',
								reponse: `Un par confrère abonné, jusqu’à ${r.moisParAn} sur douze mois glissants : une année entière.`
							},
							{
								question: 'Et si je n’ai pas encore d’abonnement ?',
								reponse: 'Votre mois vous attend : il s’appliquera à votre premier prélèvement.'
							},
							{
								question: 'Que voit mon confrère ?',
								reponse: `Une page qui lui dit que ${r.nomEtablissement} lui offre un mois de Letikette. Il s’inscrit comme tout le monde, avec ses ${essai}, et son mois s’applique après sa première échéance.`
							},
							{
								question: 'Que voyez-vous de lui ?',
								reponse:
									'La date de son inscription, et s’il s’est abonné. Jamais son nom ni ce qu’il fait de Letikette.'
							},
							{
								question: 'Un mois offert peut-il être versé en argent ?',
								reponse: 'Non, jamais : il se déduit d’un abonnement.'
							}
						]}
					/>
				</section>

				<p className="text-center text-cladd-3xs leading-relaxed text-cladd-fg-softer">
					Votre lien affiche le nom de votre entreprise à qui l’ouvre.{' '}
					<Lien to="/conditions-generales" className="underline">
						Conditions de la recommandation
					</Lien>
				</p>
			</div>

			{r.lien === null ? null : (
				<FeuilleDuQr
					ouverte={qrOuvert}
					onFermer={() => setQrOuvert(false)}
					lien={r.lien}
					offertPar={r.nomEtablissement}
				/>
			)}
		</PageEcran>
	);
}
