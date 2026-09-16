import { useState, type ComponentProps } from 'react';
import { Button, Input } from '@cladd-ui/react';
import { CheckIcon } from 'lucide-react';
import { BoutonPrincipal, Champ, PageEcran, dateCourte, pluriel, type Lecture } from '../../ui';
import { sansEtablissement } from '../sans-etablissement';
import { TITRE_ECRAN } from '../titres';

/**
 * LE FORMULAIRE DE L'ÉTABLISSEMENT.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * POURQUOI IL A QUITTÉ L'ÉCRAN DE RÉGLAGES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Il y vivait, dépliés, en même temps qu'un second formulaire — celui du
 * créancier — et que l'apparence, trois liens et la déconnexion. À eux deux,
 * les formulaires faisaient l'essentiel du défilement : le créancier seul
 * mesure 2,99 écrans à 375 px.
 *
 * Or on n'ouvre pas les réglages pour remplir un formulaire : on les ouvre pour
 * ATTEINDRE quelque chose. La liste dit ce qui est réglé, la page règle. C'est
 * le motif de tous les écrans de réglages d'application mobile.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ IL NE DEMANDE PLUS DE SIREN, ET CE N'EST PAS UN OUBLI
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le même numéro se saisissait TROIS fois, dans deux champs différents : à la
 * création de l'entreprise (« SIRET »), ici (« SIREN ») et sur la page du
 * créancier (« SIREN ou SIRET »). Les deux premiers écrivaient
 * `organizations.siret`, que RIEN ne lit dans le domaine : le décompte et le
 * verrou de l'accueil lisent `profilsCreancier.siren`, le troisième.
 *
 * L'aide de ce champ était donc fausse au mot près — « sans lui, aucune
 * procédure ne peut être engagée » — alors que le remplir ne débloquait rien.
 * Le numéro vit maintenant à un seul endroit : la page du créancier, celle que
 * le domaine lit. Le `siret` déjà en base y sert de valeur de départ, et il
 * n'écrase jamais un numéro que le gérant y a saisi.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LE VOLUME SE MESURE, IL NE SE REDEMANDE PAS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * « Factures émises par an » se demandait à la création PUIS à chaque passage
 * ici, alors que le produit importe ces factures. La mesure s'affiche avec sa
 * FENÊTRE et sa SOURCE ; le champ reste, pour corriger.
 *
 * ⚠️ ET LE PALIER NE CHANGE JAMAIS TOUT SEUL. Un import partiel sous-estime le
 * volume, donc le palier facturé : reprendre la mesure est un geste du gérant,
 * suivi d'un enregistrement. Un abonnement qui changerait de palier sur une
 * lecture incomplète serait une modification de prix que personne n'a demandée.
 *
 * ⚠️ ET LA `key` RESTE POSÉE SUR L'IDENTIFIANT, à l'appel. C'est elle qui
 * garantit que les champs se réinitialisent si le gérant change
 * d'établissement, sans effet de synchronisation. La retirer en déménageant
 * aurait laissé les valeurs du précédent, en silence.
 */

/** Ce que le produit a compté dans les imports, avec la fenêtre qui l'explique. */
export interface VolumeMesure {
	readonly factures: number;
	/** Premier jour de la fenêtre, inclus (AAAA-MM-JJ). */
	readonly depuis: string;
	/** Dernier jour de la fenêtre, inclus (AAAA-MM-JJ). */
	readonly jusqua: string;
	/** La lecture s'est arrêtée au plafond : le compte est un PLANCHER, et se lit « au moins ». */
	readonly plafondAtteint: boolean;
}

/** La mesure, en une phrase qui porte sa fenêtre et sa source. */
function phraseDeLaMesure(mesure: VolumeMesure): string {
	const fenetre = `entre le ${dateCourte(mesure.depuis)} et le ${dateCourte(mesure.jusqua)}`;
	if (mesure.factures === 0) {
		return `Aucune facture émise ${fenetre} dans vos imports : votre déclaration reste la seule mesure.`;
	}
	const combien = mesure.factures.toLocaleString('fr-FR');
	const s = pluriel(mesure.factures);
	const plancher = mesure.plafondAtteint ? 'Au moins ' : '';
	return `${plancher}${combien} facture${s} émise${s} ${fenetre}, comptée${s} dans vos imports.`;
}

export function FormulaireEtablissement({
	initial,
	mesure,
	onEnregistrer
}: {
	initial: { nom: string; factures: string };
	/** La mesure, ou `null` tant qu'elle se lit : on n'affiche jamais un cadran à zéro en attendant. */
	mesure: VolumeMesure | null;
	onEnregistrer: (args: { name: string; facturesParAn?: number }) => Promise<unknown>;
}) {
	const [nom, setNom] = useState(initial.nom);
	const [factures, setFactures] = useState(initial.factures);
	const [enCours, setEnCours] = useState(false);
	const [enregistre, setEnregistre] = useState(false);

	async function enregistrer() {
		if (!nom.trim()) return;
		setEnCours(true);
		try {
			const nb = Number.parseInt(factures, 10);
			await onEnregistrer({
				name: nom.trim(),
				...(Number.isFinite(nb) && nb > 0 ? { facturesParAn: nb } : {})
			});
			setEnregistre(true);
			window.setTimeout(() => setEnregistre(false), 2000);
		} finally {
			setEnCours(false);
		}
	}

	// Dérivé au rendu, jamais posé dans un effet : c'est la règle React du projet.
	const reprenable =
		mesure !== null && mesure.factures > 0 && String(mesure.factures) !== factures.trim();

	return (
		<div className="flex flex-col gap-cladd-2xs">
			<Champ etiquette="Nom">
				<Input value={nom} onChange={setNom} name="organisation" size="lg" />
			</Champ>

			<div className="flex flex-col gap-cladd-3xs">
				<Champ
					etiquette="Factures émises par an"
					aide="Sert à dimensionner votre abonnement, jamais à limiter le produit."
				>
					<Input type="number" value={factures} onChange={setFactures} name="factures" size="lg" />
				</Champ>

				{/*
				  ⚠️ LA MESURE PORTE SA FENÊTRE ET SA SOURCE, TOUJOURS.

				  Un compte nu se lirait comme le volume de l'entreprise, alors que
				  c'est le volume de ce que le produit a LU. Un import qui ne couvre
				  que six mois donne un chiffre deux fois trop bas, et c'est la
				  fenêtre affichée qui le fait comprendre au lieu de le faire subir.
				*/}
				{mesure === null ? null : (
					<p className="text-cladd-3xs leading-relaxed text-cladd-fg-softer">
						{phraseDeLaMesure(mesure)}
					</p>
				)}

				{/*
				  ⚠️ REPRENDRE EST UN GESTE, PAS UNE SYNCHRONISATION. Le chiffre mesuré
				  ne s'écrit pas dans le champ tout seul : il décide du palier facturé,
				  et un import partiel le sous-estime.
				*/}
				{reprenable && mesure !== null ? (
					<Button
						size="sm"
						variant="transparent"
						outline={false}
						hoverable={false}
						className="verre-bouton min-h-12 self-start rounded-full px-3 text-cladd-2xs"
						onClick={() => setFactures(String(mesure.factures))}
					>
						Reprendre {mesure.factures.toLocaleString('fr-FR')}
					</Button>
				) : null}
			</div>

			<BoutonPrincipal
				className="self-start"
				loading={enCours}
				readOnly={enCours}
				onClick={() => void enregistrer()}
			>
				{enregistre ? <CheckIcon /> : null}
				{enregistre ? 'Enregistré' : 'Enregistrer'}
			</BoutonPrincipal>
		</div>
	);
}

/** Ce que la page affiche : le nom de l'établissement, son formulaire, la clé qui le remonte, et l'enregistrement que la route pilote. */
export interface EtablissementAffiche {
	readonly nom: string | undefined;
	readonly initial: ComponentProps<typeof FormulaireEtablissement>['initial'];
	/** Ce que les imports comptent, ou `null` tant que la lecture n'a pas répondu. */
	readonly mesure: VolumeMesure | null;
	/** L'identifiant de l'établissement : il remonte le formulaire quand on en change. */
	readonly cle: string;
	readonly onEnregistrer: ComponentProps<typeof FormulaireEtablissement>['onEnregistrer'];
}

export function EcranEtablissement({ donnees }: { donnees: Lecture<EtablissementAffiche | null> }) {
	const pret = donnees.etat === 'pret' ? donnees.valeur : null;

	return (
		<PageEcran
			entete={{
				genre: 'poussee',
				retour: { vers: '/app/parametres', libelle: TITRE_ECRAN.reglages, masqueEnVolets: true },
				titre: 'Votre établissement',
				sousTitre: pret?.nom
			}}
			etat={
				donnees.etat === 'pret' && pret === null
					? sansEtablissement('Créez-en un pour le régler.')
					: donnees.etat
			}
		>
			{pret === null ? null : (
				<FormulaireEtablissement
					key={pret.cle}
					initial={pret.initial}
					mesure={pret.mesure}
					onEnregistrer={pret.onEnregistrer}
				/>
			)}
		</PageEcran>
	);
}
