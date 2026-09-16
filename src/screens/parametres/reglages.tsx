import type { ReactNode } from 'react';
import { ListButton, ListItem, SectionTitle, Segmented, SegmentedButton } from '@cladd-ui/react';
import {
	CreditCardIcon,
	DatabaseIcon,
	LogOutIcon,
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
	useDeuxVolets,
	type Lecture
} from '../../ui';
import type { EtatCritere } from './creancier';

/** Les cinq sections des réglages, chacune une route de la mise en page `_reglages`. */
export type SectionReglages = 'etablissement' | 'creancier' | 'abonnement' | 'equipe' | 'donnees';

/** Ce que l'écran affiche : l'établissement, le profil du créancier, le thème, et les deux gestes que la route pilote. */
export interface ReglagesAffiches {
	/** L'établissement actif, ou `null`. */
	readonly org: { readonly name?: string; readonly siret?: string } | null;
	/** Le profil du créancier, ou `null` tant qu'aucun n'est enregistré. La route attend sa lecture. */
	readonly profil: { readonly siren?: string; readonly estCommercant?: EtatCritere } | null;
	readonly theme: Theme;
	readonly onChoisirTheme: (theme: Theme) => void;
	readonly onSeDeconnecter: () => void;
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
 * précisément le champ qui bloque toute procédure.
 *
 * ⚠️ APPARENCE ET SE DÉCONNECTER N'OUVRENT RIEN. Deux thèmes ne méritent ni une
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
	const detailOuvert = sectionOuverte !== null;
	/**
	 * ⚠️ SUR `/app/parametres`, LE VOLET DROIT MONTRE L'ÉTABLISSEMENT, et sa rangée
	 * ne s'allume qu'en deux volets : sous 1024 px, la section est montée mais
	 * masquée, et l'anneau désignerait ce que personne ne voit.
	 */
	const selectionnee = sectionOuverte ?? (deuxVolets ? 'etablissement' : null);
	const entete = { genre: 'onglet', titre: 'Réglages' } as const;

	if (donnees.etat !== 'pret') {
		return (
			<MaitreDetail
				maitre={<PageEcran entete={entete} etat={donnees.etat} />}
				detail={detail}
				detailOuvert={detailOuvert}
			/>
		);
	}

	const { org, profil, theme, onChoisirTheme, onSeDeconnecter } = donnees.valeur;

	return (
		<MaitreDetail
			detail={detail}
			detailOuvert={detailOuvert}
			maitre={
				<PageEcran entete={entete}>
					<section className="flex flex-col gap-cladd-3xs">
						<SectionTitle>Recouvrement</SectionTitle>
						<ListeAnalyses>
							<LigneAnalyse
								vers="/app/parametres/etablissement"
								icone={<Building2Icon />}
								titre="Votre établissement"
								valeur={org?.name ?? 'À renseigner'}
								attention={!org?.siret}
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
								selectionnee={selectionnee === 'abonnement'}
							/>
							<LigneAnalyse
								vers="/app/equipe"
								icone={<UsersIcon />}
								titre="Équipe"
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
						{/* Deux états exclusifs : c'est un `Segmented`, pas un bouton qui
						    annonce la bascule. « Passer en sombre » oblige à déduire l'état
						    courant depuis l'action proposée, ce qui se lit à l'envers. */}
						<ListItem>
							<span className="text-cladd-fg-soft">Apparence</span>
							<Segmented className="ml-auto" activeColor="neutral" activeVariant="solid">
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
