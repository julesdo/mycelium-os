import { SectionTitle } from '@cladd-ui/react';
import {
	Avatar,
	ChiffreHero,
	LigneCopiable,
	LigneFixe,
	LigneLien,
	ListeAnalyses,
	ListeDeRangees,
	QrDeVirement,
	dateCourte,
	eurosCentimes
} from '../ui';

/**
 * LA PAGE OÙ LE CLIENT VOIT CE QU'IL DOIT, ET COMMENT LE PAYER.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ ELLE EST AU NOM DU CRÉANCIER, ET DE PERSONNE D'AUTRE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * C'est la seule page du produit qu'un tiers regarde. Elle ne nomme pas ce
 * logiciel, n'en porte pas la marque, et ne se présente à aucun moment comme
 * un intermédiaire : un client qui lirait le nom d'un tiers y verrait un mandat
 * de recouvrement, et c'est précisément l'activité qu'on n'exerce pas (ligne
 * rouge n° 1, et `paiement.test.ts` la tient).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ ELLE MONTRE, ELLE NE RÉCLAME PAS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Aucune menace, aucune échéance comminatoire, aucun décompte qui tourne. Elle
 * porte un décompte ARRÊTÉ — figé, daté, décomposé — parce qu'un montant qui
 * augmente pendant qu'on le lit ne se paie pas, et parce que c'est ce qui
 * s'oppose à un tiers. Le client peut refaire le calcul ligne par ligne : c'est
 * ce que fera celui qui le conteste, et mieux vaut qu'il tombe juste.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ ET RIEN NE REMONTE D'ICI
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Aucun formulaire, aucun bouton « je conteste », aucune case « j'ai payé ».
 * Ce produit ne reçoit ni fonds ni réponse du débiteur. Une question se pose à
 * l'adresse du créancier, qui est écrite en bas — un `mailto:`, donc une
 * conversation qui commence dans la messagerie du client et finit dans celle du
 * créancier, sans passer par ici.
 */

export interface LigneAPayer {
	readonly reference: string;
	readonly principalRestantDu: bigint;
	readonly interets: bigint;
	readonly indemniteForfaitaire: bigint;
	readonly total: bigint;
}

export interface PageDePaiementAffichee {
	readonly creancier: {
		readonly denomination: string;
		readonly adresse?: string;
		readonly email?: string;
		readonly telephone?: string;
	};
	readonly clientNom: string;
	readonly arreteAu: string;
	readonly total: bigint;
	readonly principal: bigint;
	readonly interets: bigint;
	readonly indemniteForfaitaire: bigint;
	readonly lignes: readonly LigneAPayer[];
	readonly reference: string;
	readonly ibanLisible: string;
	/** La charge du QR, ou `null` : l'IBAN et la référence restent lisibles sans lui. */
	readonly chargeQr: string | null;
}

export type EtatPaiement =
	| { readonly etat: 'attente' }
	/** Jeton inconnu, ou lien fermé : la page ne dit pas lequel des deux. */
	| { readonly etat: 'introuvable' }
	| { readonly etat: 'pret'; readonly valeur: PageDePaiementAffichee };

export function EcranPaiement({ donnees }: { donnees: EtatPaiement }) {
	if (donnees.etat === 'attente') {
		return (
			<main className="flex min-h-dvh items-center justify-center p-cladd-xs">
				<p className="text-cladd-xs text-cladd-fg-soft">Ouverture…</p>
			</main>
		);
	}

	if (donnees.etat === 'introuvable') {
		return (
			<main className="flex min-h-dvh flex-col items-center justify-center gap-cladd-2xs p-cladd-xs text-center">
				<h1 className="text-cladd-md font-semibold">Ce lien ne répond plus.</h1>
				<p className="max-w-sm text-cladd-xs leading-relaxed text-cladd-fg-soft">
					Il a peut-être été fermé, ou remplacé par un autre. Demandez-en un nouveau à la personne
					qui vous l’a envoyé.
				</p>
			</main>
		);
	}

	const p = donnees.valeur;
	const nom = p.creancier.denomination;
	const plusieurs = p.lignes.length > 1;
	const joignable = p.creancier.email !== undefined || p.creancier.telephone !== undefined;

	/*
	  ═══════════════════════════════════════════════════════════════════════════
	  ⚠️ CE QUE LA PAGE ÉTAIT, ET CE QUE LES RÉFÉRENCES EN FONT (01/10/2026)
	  ═══════════════════════════════════════════════════════════════════════════

	  Relevé à 393 px : 1 656 px. Le montant dans une carte, alignée à gauche ;
	  puis le code QR — deux cent cinquante pixels EN TÊTE du virement, sur un
	  téléphone, c'est-à-dire sur l'écran même qu'aucune banque ne peut scanner ;
	  puis quatre cartes séparées pour quatre coordonnées, chacune en corps de
	  titre ; puis le détail en deux cartes, la seconde redisant la première quand
	  il n'y a qu'une facture.

	  Relevé sur Mobbin : la page de paiement de Square (le nom, le montant
	  centré, puis le reste), celle de Stripe, et les coordonnées de virement
	  d'OKX, de Shopee et d'Airwallex — groupées dans UNE carte, une rangée
	  chacune, la copie au bout. D'où la page : qui réclame, combien, comment
	  payer, de quoi c'est fait, et à qui parler.
	*/
	return (
		<main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-cladd-xs px-cladd-2xs py-cladd-xs">
			{/*
			  L'EN-TÊTE : QUI RÉCLAME, ET À QUI. Un client qui ouvre un lien reçu par
			  courriel doit reconnaître son fournisseur AVANT de lire un montant —
			  sans quoi la page ressemble à un hameçonnage, et c'est la fin. Ses
			  initiales, son nom, centrés : l'en-tête de Square et de Vipps.
			*/}
			<header className="flex flex-col items-center gap-1 pt-cladd-2xs text-center">
				<Avatar nom={nom} grand />
				<h1 className="mt-1 text-cladd-sm font-semibold">{nom}</h1>
				{p.clientNom === '' ? null : (
					<p className="text-cladd-2xs text-cladd-fg-soft">À l’attention de {p.clientNom}</p>
				)}
			</header>

			{/*
			  ⚠️ UN MONTANT ARRÊTÉ, ET LA LÉGENDE LE DIT. Un montant qui augmente
			  pendant qu'on le lit ne se paie pas : il est figé à sa date, pénalités
			  comprises jusqu'à elle, et rien au-delà.
			*/}
			<ChiffreHero
				centimes={p.total}
				surTitre="Reste à régler"
				legende={`Arrêté au ${dateCourte(p.arreteAu)}, pénalités comprises`}
			/>

			{/* ── COMMENT PAYER ────────────────────────────────────────────────── */}
			<section className="flex flex-col gap-cladd-3xs">
				<ListeDeRangees titre="Payer par virement">
					{/*
					  ⚠️ CE QU'ON LIT N'EST PAS CE QU'ON COLLE. L'IBAN se lit par groupes
					  de quatre — c'est ainsi qu'on le vérifie à l'œil — mais se colle sans
					  espaces ; le montant se lit « 6 373,50 € » et se colle « 6373,50 »,
					  parce que c'est ce qu'un formulaire de virement attend.
					*/}
					<LigneCopiable etiquette="Bénéficiaire" affichage={nom} valeur={nom} />
					<LigneCopiable
						etiquette="IBAN"
						affichage={p.ibanLisible}
						valeur={p.ibanLisible.replace(/ /g, '')}
					/>
					<LigneCopiable
						etiquette="Montant"
						affichage={eurosCentimes(p.total)}
						valeur={eurosCentimes(p.total).replace(/[^\d,]/g, '')}
					/>
					<LigneCopiable
						etiquette="Référence à rappeler"
						affichage={p.reference}
						valeur={p.reference}
					/>
				</ListeDeRangees>
				<p className="px-1 text-cladd-2xs leading-relaxed text-cladd-fg-softer">
					Rappelez la référence sur votre virement : c’est elle qui permet de reconnaître votre
					paiement.
				</p>
			</section>

			{/*
			  ⚠️ LE CODE QR, SEULEMENT LÀ OÙ IL SE SCANNE. Sur un téléphone, il occupait
			  le haut du virement alors qu'aucune banque ne lit l'écran qui l'affiche ;
			  les rangées à copier y font le travail. À partir de 640 px — une tablette,
			  un ordinateur —, la banque est dans la poche, et le code pré-remplit le
			  virement qu'on valide chez soi.
			*/}
			{p.chargeQr === null ? null : (
				<div className="hidden flex-col items-center gap-cladd-3xs sm:flex">
					<QrDeVirement
						charge={p.chargeQr}
						titre={`Virement de ${eurosCentimes(p.total)} à ${nom}, référence ${p.reference}`}
					/>
					<p className="max-w-xs text-center text-cladd-2xs leading-relaxed text-cladd-fg-softer">
						Ou scannez ce code avec l’application de votre banque : le virement se pré-remplit, vous
						le validez chez vous.
					</p>
				</div>
			)}

			{/*
			  ── DE QUOI CE MONTANT EST FAIT ─────────────────────────────────────────

			  ⚠️ CHAQUE FACTURE, PUIS CE QUI S'Y AJOUTE — et la somme se refait à la
			  main. Un montant qu'on ne peut pas décomposer est un montant qu'on demande
			  de croire, et c'est le client qui conteste qui refera le calcul. Les
			  factures portent leur montant restant dû ; les pénalités et les frais
			  suivent en deux rangées. À plusieurs factures, chacune dit sous sa
			  référence ce qu'elle porte de pénalités et de frais.
			*/}
			<section className="flex flex-col gap-cladd-3xs">
				<SectionTitle>De quoi ce montant est fait</SectionTitle>
				<ListeAnalyses>
					{p.lignes.length === 0 ? (
						<LigneFixe
							genre="contenu"
							titre="Factures restant à payer"
							valeur={eurosCentimes(p.principal)}
						/>
					) : (
						p.lignes.map((ligne) => (
							<LigneFixe
								key={ligne.reference}
								genre="contenu"
								titre={`Facture ${ligne.reference}`}
								valeur={eurosCentimes(ligne.principalRestantDu)}
								{...(plusieurs
									? {
											precision: `+ ${eurosCentimes(ligne.interets)} de pénalités, ${eurosCentimes(ligne.indemniteForfaitaire)} de frais`
										}
									: {})}
							/>
						))
					)}
					<LigneFixe
						genre="contenu"
						titre="Pénalités de retard"
						valeur={eurosCentimes(p.interets)}
					/>
					<LigneFixe
						genre="contenu"
						titre="Frais de recouvrement"
						valeur={eurosCentimes(p.indemniteForfaitaire)}
					/>
				</ListeAnalyses>
			</section>

			{/*
			  ── LA MAIN REND AU CRÉANCIER ───────────────────────────────────────────

			  Deux rangées qui SORTENT de la page : la messagerie du client, son
			  téléphone. Rien ne remonte d'ici — la conversation commence chez le
			  client et finit chez le créancier.
			*/}
			<footer className="mt-auto flex flex-col gap-cladd-3xs pt-cladd-2xs">
				<p className="px-1 text-cladd-2xs leading-relaxed text-cladd-fg-soft">
					{joignable
						? 'Une question, un désaccord, un règlement déjà parti ?'
						: `Une question, un désaccord, un règlement déjà parti ? Adressez-vous à ${nom}.`}
				</p>
				{joignable ? (
					<ListeAnalyses>
						{p.creancier.email === undefined ? null : (
							<LigneLien
								href={`mailto:${p.creancier.email}`}
								titre={`Écrire à ${nom}`}
								precision={p.creancier.email}
							/>
						)}
						{p.creancier.telephone === undefined ? null : (
							<LigneLien
								href={`tel:${p.creancier.telephone.replace(/\s/g, '')}`}
								titre="Appeler"
								precision={p.creancier.telephone}
							/>
						)}
					</ListeAnalyses>
				) : null}
				{p.creancier.adresse === undefined ? null : (
					<p className="text-center text-cladd-2xs text-cladd-fg-softest">
						{nom} · {p.creancier.adresse}
					</p>
				)}
			</footer>
		</main>
	);
}
