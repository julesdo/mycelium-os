import { SectionTitle, Surface } from '@cladd-ui/react';
import { ChampCopiable, QrDeVirement, dateCourte, eurosCentimes, pluriel } from '../ui';

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

function Carte({ children }: { children: React.ReactNode }) {
	return (
		<Surface
			variant="transparent"
			outline={false}
			className="verre-carte rounded-cladd-xl"
			contentClassName="flex flex-col gap-cladd-3xs p-cladd-xs"
		>
			{children}
		</Surface>
	);
}

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
					Il a peut-être été fermé, ou remplacé par un autre. Demandez-en un nouveau à la
					personne qui vous l’a envoyé.
				</p>
			</main>
		);
	}

	const p = donnees.valeur;

	return (
		<main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-cladd-2xs p-cladd-xs">
			{/*
			  L'EN-TÊTE : QUI RÉCLAME, ET À QUI. Un client qui ouvre un lien reçu par
			  courriel doit reconnaître son fournisseur AVANT de lire un montant —
			  sans quoi la page ressemble à un hameçonnage, et c'est la fin.
			*/}
			<header className="flex flex-col gap-1">
				<p className="text-cladd-2xs tracking-wide text-cladd-fg-softer uppercase">
					{p.creancier.denomination}
				</p>
				{p.clientNom === '' ? null : (
					<h1 className="text-cladd-md font-semibold">À l’attention de {p.clientNom}</h1>
				)}
			</header>

			<Carte>
				<p className="text-cladd-2xs text-cladd-fg-soft">
					Ce qu’il reste à régler, arrêté au {dateCourte(p.arreteAu)}
				</p>
				<p className="text-letikette-chiffre font-bold tabular-nums">
					{eurosCentimes(p.total)}
				</p>
				<p className="text-cladd-2xs leading-relaxed text-cladd-fg-softer">
					Ce montant est figé à cette date. Les pénalités de retard courues après ne sont pas
					comprises.
				</p>
			</Carte>

			{/* ── COMMENT PAYER ────────────────────────────────────────────────── */}
			<section className="flex flex-col gap-cladd-3xs">
				<SectionTitle>Payer par virement</SectionTitle>
				<Carte>
					<div className="flex flex-wrap items-start gap-cladd-xs">
						{p.chargeQr === null ? null : (
							<div className="flex shrink-0 flex-col items-center gap-1">
								<QrDeVirement
									charge={p.chargeQr}
									titre={`Virement de ${eurosCentimes(p.total)} à ${p.creancier.denomination}, référence ${p.reference}`}
								/>
								<p className="max-w-48 text-center text-cladd-2xs leading-relaxed text-cladd-fg-softer">
									Scannez ce code avec l’application de votre banque : le virement se
									pré-remplit, vous le validez chez vous.
								</p>
							</div>
						)}

						{/*
						  ⚠️ `basis-56` FAIT PASSER LA COLONNE À LA LIGNE SUR UN TÉLÉPHONE.
						  Avec `flex-1` seul, elle acceptait une base nulle : elle se
						  tassait à trente-cinq pixels à côté du code, et la page débordait
						  de trente-deux pixels sur le côté à 375 px. Au-delà de 375 + le
						  code, les deux tiennent côte à côte d'elles-mêmes.
						*/}
						<div className="flex min-w-0 flex-1 basis-56 flex-col gap-cladd-3xs">
							{/*
							  ⚠️ L'IBAN ET LA RÉFÉRENCE SONT COPIABLES, TOUJOURS. Le QR est un
							  confort ; un client sur ordinateur, ou dont la banque ne lit pas les
							  QR, doit pouvoir recopier sans faute. Un IBAN retapé à la main est
							  le geste qui fait remettre un paiement au lendemain.
							*/}
							<ChampCopiable
								etiquette="Bénéficiaire"
								affichage={p.creancier.denomination}
								valeur={p.creancier.denomination}
							/>
							{/*
							  ⚠️ CE QU'ON LIT N'EST PAS CE QU'ON COLLE. L'IBAN se lit par
							  groupes de quatre — c'est ainsi qu'il figure sur un relevé, et
							  c'est ainsi qu'on le vérifie à l'œil — mais il se colle sans
							  espaces, parce que c'est ce qu'un formulaire de virement attend.
							*/}
							<ChampCopiable
								etiquette="IBAN"
								affichage={p.ibanLisible}
								valeur={p.ibanLisible.replace(/ /g, '')}
							/>
							<ChampCopiable
								etiquette="Montant"
								affichage={eurosCentimes(p.total)}
								valeur={eurosCentimes(p.total)}
							/>
							<ChampCopiable
								etiquette="Référence à rappeler"
								affichage={p.reference}
								valeur={p.reference}
							/>
							<p className="text-cladd-2xs leading-relaxed text-cladd-fg-softer">
								Rappelez la référence sur votre virement : c’est elle qui permet de
								reconnaître votre paiement.
							</p>
						</div>
					</div>
				</Carte>
			</section>

			{/* ── LE DÉTAIL ────────────────────────────────────────────────────── */}
			<section className="flex flex-col gap-cladd-3xs">
				<SectionTitle>De quoi ce montant est fait</SectionTitle>
				<Carte>
					<Ligne intitule="Factures restant à payer" montant={p.principal} />
					<Ligne intitule="Pénalités de retard" montant={p.interets} />
					<Ligne intitule="Frais de recouvrement" montant={p.indemniteForfaitaire} />
					<div className="mt-cladd-3xs border-t border-cladd-outline pt-cladd-3xs">
						<Ligne intitule="Total" montant={p.total} fort />
					</div>
				</Carte>

				{/*
				  ⚠️ LE DÉTAIL PAR FACTURE, ET PAS SEULEMENT LE TOTAL. Un montant qu'on
				  ne peut pas décomposer est un montant qu'on demande de croire — et
				  c'est le client qui conteste qui refera le calcul. Autant qu'il ait
				  les lignes sous les yeux.
				*/}
				{p.lignes.length === 0 ? null : (
					<Carte>
						<p className="text-cladd-2xs text-cladd-fg-soft">
							{p.lignes.length} facture{pluriel(p.lignes.length)}
						</p>
						{p.lignes.map((ligne) => (
							<div key={ligne.reference} className="flex flex-col gap-0.5">
								<Ligne intitule={ligne.reference} montant={ligne.total} fort />
								<p className="text-cladd-2xs text-cladd-fg-softer tabular-nums">
									dont {eurosCentimes(ligne.principalRestantDu)} de facture,{' '}
									{eurosCentimes(ligne.interets)} de pénalités de retard et{' '}
									{eurosCentimes(ligne.indemniteForfaitaire)} de frais de recouvrement
								</p>
							</div>
						))}
					</Carte>
				)}
			</section>

			{/* ── LA MAIN REND AU CRÉANCIER ────────────────────────────────────── */}
			<footer className="mt-auto flex flex-col gap-1 pt-cladd-xs">
				<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
					Une question, un désaccord, ou un règlement déjà parti ? Écrivez à{' '}
					{p.creancier.denomination}
					{p.creancier.email === undefined ? (
						'.'
					) : (
						<>
							{' '}
							à l’adresse{' '}
							<a className="underline" href={`mailto:${p.creancier.email}`}>
								{p.creancier.email}
							</a>
							{p.creancier.telephone === undefined ? '.' : `, ou au ${p.creancier.telephone}.`}
						</>
					)}
				</p>
				{p.creancier.adresse === undefined ? null : (
					<p className="text-cladd-2xs text-cladd-fg-softest">{p.creancier.adresse}</p>
				)}
			</footer>
		</main>
	);
}

function Ligne({
	intitule,
	montant,
	fort = false
}: {
	intitule: string;
	montant: bigint;
	fort?: boolean;
}) {
	return (
		<div className="flex items-baseline justify-between gap-cladd-3xs">
			<span className={fort ? 'text-cladd-sm font-semibold' : 'text-cladd-xs'}>{intitule}</span>
			<span
				className={`shrink-0 tabular-nums ${fort ? 'text-cladd-sm font-semibold' : 'text-cladd-xs'}`}
			>
				{eurosCentimes(montant)}
			</span>
		</div>
	);
}
