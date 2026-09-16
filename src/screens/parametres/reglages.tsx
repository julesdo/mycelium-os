import { useState, type ReactNode } from 'react';
import { ListButton, ListItem, SectionTitle, Segmented, SegmentedButton } from '@cladd-ui/react';
import {
	CreditCardIcon,
	DatabaseIcon,
	LogOutIcon,
	MonitorIcon,
	MoonIcon,
	SunIcon,
	UsersIcon,
	Building2Icon,
	ReceiptTextIcon
} from 'lucide-react';
import type { Theme } from '../../app/use-theme';
import {
	LigneAnalyse,
	ListeAnalyses,
	MaitreDetail,
	PageEcran,
	pluriel,
	useDeuxVolets,
	type Lecture
} from '../../ui';
import { TITRE_ECRAN } from '../titres';
import type { EtatCritere } from './creancier';

/** Les cinq sections des réglages, chacune une route de la mise en page `_reglages`. */
export type SectionReglages = 'etablissement' | 'creancier' | 'abonnement' | 'equipe' | 'donnees';

/** Ce que la rangée de l'abonnement dit, sans entrer : l'offre en cours, ou l'essai qui court. */
export interface AbonnementEnRangee {
	readonly isDev: boolean;
	readonly palier: string;
	readonly paddleStatus: string | null;
	/** L'essai, s'il court ENCORE. `null` sinon : voir `billing.etatAbonnement`. */
	readonly essaiFiniLe: number | null;
}

/** Ce que la rangée de l'équipe dit, sans entrer : qui est là, et qui est attendu. */
export interface EquipeEnRangee {
	readonly membres: number;
	readonly invitations: number;
}

/** Ce que l'écran affiche : l'établissement, le profil du créancier, le thème, et les deux gestes que la route pilote. */
export interface ReglagesAffiches {
	/** L'établissement actif, ou `null`. */
	readonly org: { readonly name?: string } | null;
	/** Le profil du créancier, ou `null` tant qu'aucun n'est enregistré. La route attend sa lecture. */
	readonly profil: { readonly siren?: string; readonly estCommercant?: EtatCritere } | null;
	/**
	 * ⚠️ `null` TANT QUE LA LECTURE N'A PAS RÉPONDU, et la rangée ne montre alors
	 * aucune valeur. Jamais « Aucun abonnement » en attendant : ce serait un
	 * cadran à zéro sur une information qu'on n'a pas encore.
	 */
	readonly abonnement: AbonnementEnRangee | null;
	/** Même règle : `null` tant qu'on ne sait pas, jamais « 0 membre ». */
	readonly equipe: EquipeEnRangee | null;
	readonly theme: Theme;
	readonly onChoisirTheme: (theme: Theme) => void;
	readonly onSeDeconnecter: () => void;
}

/** « Essai, 12 jours », « Palier M », « Développement » — ou rien tant qu'on ne sait pas. */
function valeurAbonnement(etat: AbonnementEnRangee | null, maintenant: number): string | undefined {
	if (etat === null) return undefined;
	if (etat.isDev) return 'Développement';
	if (etat.paddleStatus === 'active' || etat.paddleStatus === 'trialing') {
		return `Palier ${etat.palier}`;
	}
	if (etat.essaiFiniLe !== null) {
		const jours = Math.max(0, Math.ceil((etat.essaiFiniLe - maintenant) / (24 * 60 * 60 * 1000)));
		return `Essai, ${jours} jour${pluriel(jours)}`;
	}
	return 'Aucun abonnement';
}

/** « 3 membres · 1 invitation » — ou rien tant qu'on ne sait pas. */
function valeurEquipe(etat: EquipeEnRangee | null): string | undefined {
	if (etat === null) return undefined;
	const gens = `${etat.membres} membre${pluriel(etat.membres)}`;
	if (etat.invitations === 0) return gens;
	return `${gens} · ${etat.invitations} invitation${pluriel(etat.invitations)}`;
}

/**
 * LES RÉGLAGES : LES SECTIONS À GAUCHE, LA SECTION OUVERTE À DROITE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ ON N'OUVRE PAS LES RÉGLAGES POUR REMPLIR UN FORMULAIRE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * On les ouvre pour ATTEINDRE quelque chose. La liste dit ce qui est réglé, et
 * surtout ce qui NE L'EST PAS ; la section règle. Les deux formulaires vivaient
 * dépliés ici : celui du créancier mesure à lui seul 2,99 écrans de défilement
 * à 375 px.
 *
 * ⚠️ LA VALEUR D'UNE RANGÉE EST L'ÉTAT DU RÉGLAGE, PAS SON NOM. « SIREN
 * manquant » sur la rangée du créancier se voit sans entrer, et c'est
 * précisément le champ qui bloque toute procédure. Les trois rangées du compte
 * suivent la même règle depuis qu'elles portent l'offre en cours et la taille
 * de l'équipe : une rangée muette est une rangée qu'il faut ouvrir pour savoir.
 *
 * ⚠️ ET UNE VALEUR QU'ON N'A PAS ENCORE NE S'INVENTE PAS. Tant que la
 * facturation ou l'équipe se lisent, la rangée reste sans valeur — jamais
 * « 0 membre », qui se lit comme une réponse.
 *
 * ⚠️ APPARENCE ET SE DÉCONNECTER N'OUVRENT RIEN. Trois thèmes ne méritent ni une
 * route ni une moitié d'écran : ils se choisissent sur la rangée. Et la
 * déconnexion est un geste, sans valeur ni chevron.
 */
export function EcranReglages({
	donnees,
	detail,
	sectionOuverte
}: {
	donnees: Lecture<ReglagesAffiches>;
	/** La section rendue à droite (l'`Outlet` de la mise en page), ou `null` en erreur. */
	detail: ReactNode;
	/** La section que l'adresse nomme, ou `null` sur `/app/parametres`. */
	sectionOuverte: SectionReglages | null;
}) {
	// Avant tout retour anticipé : un crochet appelé sous condition change d'ordre d'un rendu à l'autre.
	const deuxVolets = useDeuxVolets();
	/*
	  L'heure est LUE UNE FOIS, au montage. Un `Date.now()` dans le corps d'un
	  composant le rend non idempotent : deux rendus du même état donneraient deux
	  nombres de jours différents. Même mécanique que `EssaiEnCours`.
	*/
	const [maintenant] = useState(() => Date.now());
	const detailOuvert = sectionOuverte !== null;
	/**
	 * ⚠️ SUR `/app/parametres`, LE VOLET DROIT MONTRE L'ÉTABLISSEMENT, et sa rangée
	 * ne s'allume qu'en deux volets : sous 1024 px, la section est montée mais
	 * masquée, et l'anneau désignerait ce que personne ne voit.
	 */
	const selectionnee = sectionOuverte ?? (deuxVolets ? 'etablissement' : null);
	const entete = { genre: 'onglet', titre: TITRE_ECRAN.reglages } as const;

	if (donnees.etat !== 'pret') {
		return (
			<MaitreDetail
				maitre={<PageEcran entete={entete} etat={donnees.etat} />}
				detail={detail}
				detailOuvert={detailOuvert}
			/>
		);
	}

	const { org, profil, abonnement, equipe, theme, onChoisirTheme, onSeDeconnecter } =
		donnees.valeur;

	return (
		<MaitreDetail
			detail={detail}
			detailOuvert={detailOuvert}
			maitre={
				<PageEcran entete={entete}>
					<section className="flex flex-col gap-cladd-3xs">
						<SectionTitle>Recouvrement</SectionTitle>
						<ListeAnalyses>
							{/*
							  ⚠️ PLUS D'ALERTE SUR `org.siret` ICI. Le SIREN a quitté la page de
							  l'établissement : il se saisissait trois fois pour n'être lu qu'une,
							  sur `profilsCreancier.siren`. C'est la rangée du créancier qui porte
							  désormais l'alerte, et c'est elle qui mène au champ que le domaine lit.
							*/}
							<LigneAnalyse
								vers="/app/parametres/etablissement"
								icone={<Building2Icon />}
								titre="Votre établissement"
								valeur={org?.name ?? 'À renseigner'}
								attention={!org?.name}
								selectionnee={selectionnee === 'etablissement'}
							/>
							<LigneAnalyse
								vers="/app/parametres/creancier"
								icone={<ReceiptTextIcon />}
								titre="Votre entreprise sur un décompte"
								valeur={
									!profil?.siren
										? 'SIREN manquant'
										: profil.estCommercant === 'unknown'
											? 'À compléter'
											: 'Renseigné'
								}
								attention={!profil?.siren || profil.estCommercant === 'unknown'}
								selectionnee={selectionnee === 'creancier'}
							/>
						</ListeAnalyses>
					</section>

					{/*
					  L'abonnement, l'équipe et les données entrent par ici plutôt que par
					  trois onglets de plus : ce sont des écrans qu'on ouvre deux fois par
					  an, et chaque dizaine de pixels que la barre prend en hauteur est une
					  rangée en moins sur une tablette en paysage.
					*/}
					<section className="flex flex-col gap-cladd-3xs">
						<SectionTitle>Compte</SectionTitle>
						<ListeAnalyses>
							<LigneAnalyse
								vers="/app/abonnement"
								icone={<CreditCardIcon />}
								titre="Abonnement"
								valeur={valeurAbonnement(abonnement, maintenant)}
								selectionnee={selectionnee === 'abonnement'}
							/>
							<LigneAnalyse
								vers="/app/equipe"
								icone={<UsersIcon />}
								titre="Équipe"
								valeur={valeurEquipe(equipe)}
								selectionnee={selectionnee === 'equipe'}
							/>
							<LigneAnalyse
								vers="/app/donnees"
								icone={<DatabaseIcon />}
								titre="Vos données"
								selectionnee={selectionnee === 'donnees'}
							/>
						</ListeAnalyses>
					</section>

					<ListeAnalyses>
						{/* Trois états exclusifs : c'est un `Segmented`, pas un bouton qui
    annonce la bascule. « Passer en sombre » oblige à déduire l'état
    courant depuis l'action proposée, ce qui se lit à l'envers.

    ⚠️ « AUTOMATIQUE » EST LE DÉFAUT, et il ne se justifie pas à l'écran.
    Le paragraphe qui vivait ici expliquait pourquoi le sombre avait été
    choisi pour tout le monde : une décision de conception, pas une aide,
    et qui contredisait le « tablette d'abord » du projet. */}
						<ListItem className="flex flex-wrap items-center gap-cladd-3xs">
							<span className="text-cladd-fg-soft">Apparence</span>
							<Segmented className="ml-auto" activeColor="neutral" activeVariant="solid">
								<SegmentedButton active={theme === 'auto'} onClick={() => onChoisirTheme('auto')}>
									<MonitorIcon />
									Automatique
								</SegmentedButton>
								<SegmentedButton active={theme === 'dark'} onClick={() => onChoisirTheme('dark')}>
									<MoonIcon />
									Sombre
								</SegmentedButton>
								<SegmentedButton active={theme === 'light'} onClick={() => onChoisirTheme('light')}>
									<SunIcon />
									Clair
								</SegmentedButton>
							</Segmented>
						</ListItem>
						{/* La rangée du kit, sans chevron : elle ne pousse aucune page. Même
    apparence que les rangées de `ListeAnalyses`. */}
						<ListButton
							icon={<LogOutIcon />}
							className="verre-bouton"
							hoverable={false}
							onClick={onSeDeconnecter}
						>
							Se déconnecter
						</ListButton>
					</ListeAnalyses>
				</PageEcran>
			}
		/>
	);
}
