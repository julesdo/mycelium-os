import { SectionMarketing } from './section';

/**
 * L'auditabilité, expliquée par un exemple plutôt que par un argument.
 *
 * POURQUOI CETTE SECTION VAUT UNE VENTE. Un tableau de bord affiche un chiffre.
 * Un contrôle ne demande pas le chiffre, il demande d'où il sort. C'est la
 * différence entre un outil qu'on regarde et un outil qu'on peut opposer, et
 * c'est la seule chose qui compte le jour où quelqu'un pose la question.
 *
 * ⚠️ ELLE ÉTAIT « LA SEULE SECTION SUR FOND D'ENCRE », ET ÇA NE VEUT PLUS RIEN
 * DIRE. Le bleu de nuit tramé était réservé à elle seule parce que la page
 * était de papier : un aplat sombre au milieu du crème faisait autorité par
 * contraste. La page entière passe au noir, section par section ; une bande
 * sombre dans une page noire ne distingue plus rien.
 *
 * Ce qui reste vrai, et qui est l'essentiel : LE DOCUMENT RESTE BLANC. Le
 * contraste qui fait la démonstration n'a pas changé de sens, il a changé de
 * côté. La pièce de preuve est un objet de PAPIER, posé sur le fond sombre,
 * exactement comme elle le sera sur le bureau d'un contrôleur.
 *
 * LA TRAME DE SÉCURITÉ PART AVEC LE FOND D'ENCRE. Elle donnait le grain d'un
 * titre ou d'un acte à un aplat qui n'existe plus. `encre-tramee` n'est plus
 * appelée par personne depuis que les sept sections sont en noir vrai : c'est
 * du CSS mort, et `section.tsx` dit quand il part.
 *
 * Ses angles sont droits et ses champs sont séparés par des filets pleins :
 * c'est un FORMULAIRE, pas une carte. C'est le seul endroit de la page où le
 * filet n'est pas tireté, parce que c'est le seul endroit qui imite un
 * document et non une planche.
 *
 * On montre l'anatomie d'une ligne avec un vrai libellé abîmé par l'OCR,
 * « CAR0TTE », avec un zéro à la place du O. Un exemple propre laisserait croire
 * qu'on ne traite que des factures propres, ce qui n'arrive jamais.
 */

const ANATOMIE = [
	{
		cle: 'La période',
		valeur: 'Du 1er juillet au 3 septembre 2026 — 64 jours',
		note: 'Découpée au jour où le taux change, et au jour où un règlement est tombé.'
	},
	{
		cle: 'Le principal retenu',
		valeur: '6 000,00 €',
		note: 'Ce qui restait dû ce jour-là : 10 000 € moins un acompte de 4 000 €.'
	},
	{
		cle: 'Le taux appliqué',
		valeur: '12,40 % l’an, base 365',
		note: 'Le taux BCE du second semestre 2026, majoré de dix points. Pas celui d’aujourd’hui.'
	},
	{
		cle: 'Les intérêts de la période',
		valeur: '210,63 €',
		note: '6 000 × 12,40 % × 64 / 365. Un débiteur peut le refaire à la main.'
	}
] as const;

export function Preuve() {
	return (
		<SectionMarketing id="preuve">
			{/* LE RAIL TECHNIQUE, comme sur les autres sections reprises. */}
			<div className="flex items-center justify-between gap-cladd-2xs border-b border-dashed border-filet-nuit pb-cladd-3xs text-cladd-3xs font-medium tracking-widest text-craie-sourde uppercase">
				<span>Auditabilité</span>
				<span className="tabular-nums">Décompte arrêté</span>
			</div>

			<div className="flex flex-col gap-cladd-2xs">
				<h2 className="apparait max-w-4xl font-affiche text-titre-section leading-tight font-semibold tracking-titre-section text-balance">
					Chaque euro montre{' '}
					<span className="text-craie-claire">d’où il vient.</span>
				</h2>
				<p className="apparait max-w-2xl text-chapeau leading-relaxed font-normal text-craie-douce">
					Un débiteur ne contestera pas votre total. Il refera le calcul.
				</p>
			</div>

			{/*
			  ⚠️ LA PIÈCE RESTE CLAIRE SUR LE NOIR, ET C'EST TOUT SON EFFET. Ailleurs
			  sur la page, un panneau clair est un ÉCRAN du produit ; ici c'est un
			  DOCUMENT, et c'est la seule chose de la page qui doive se lire comme
			  une feuille qu'on sort d'un dossier. Le contraste maximal avec le fond
			  est exactement ce qu'on veut : une pièce opposable ne se fond pas dans
			  la mise en page qui l'entoure.
			*/}
			<div className="apparait overflow-hidden rounded-panneau bg-papier text-plume ring-1 ring-filet-nuit-vif">
				{/*
				  PAS D'ILLUSTRATION ICI, ET C'EST UN RETRAIT RÉFLÉCHI. Une vignette
				  emoji ouvrait cette carte. Elle a sa place dans l'application, où elle
				  aide un gérant à repérer une famille d'un coup d'œil entre deux
				  services — mais en tête de la pièce qu'on présente comme opposable à
				  un contrôleur, un dessin de carotte détruit exactement ce que la
				  section vient établir. C'est le seul endroit de la page où le ton doit
				  être celui d'un document, pas d'une interface.
				*/}
				<div className="flex flex-wrap items-baseline justify-between gap-cladd-3xs border-b border-trait bg-papier-chaud p-cladd-2xs md:p-cladd-xs">
					<span className="text-intertitre font-semibold">FA-2026-118</span>
					<span className="text-cladd-sm text-plume-claire tabular-nums">
						Fournitures Durand · exigible le 1er mai 2026
					</span>
				</div>

				<dl className="divide-y divide-trait">
					{ANATOMIE.map((a) => (
						<div
							key={a.cle}
							className="flex flex-col gap-1 p-cladd-2xs sm:grid sm:grid-cols-3 sm:items-baseline sm:gap-cladd-2xs md:px-cladd-xs"
						>
							<dt className="text-cladd-2xs font-semibold tracking-widest text-plume-claire uppercase">
								{a.cle}
							</dt>
							<dd className="sm:col-span-2 sm:flex sm:flex-col sm:gap-1">
								<span className="text-cladd-md leading-relaxed font-normal">{a.valeur}</span>
								<span className="text-cladd-sm leading-relaxed font-normal text-plume-claire">
									{a.note}
								</span>
							</dd>
						</div>
					))}
				</dl>
			</div>

			<p className="max-w-3xl text-cladd-md leading-relaxed font-normal text-craie-douce">
				Un décompte arrêté ne bouge plus. C&rsquo;est ce qui prouve ce que vous réclamiez le jour où vous l&rsquo;avez réclamé.
			</p>
		</SectionMarketing>
	);
}
