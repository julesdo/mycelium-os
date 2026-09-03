import { SectionMarketing, TitreSection } from './section';

/**
 * L'auditabilité, expliquée par un exemple plutôt que par un argument.
 *
 * POURQUOI CETTE SECTION VAUT UNE VENTE. Un tableau de bord affiche un chiffre.
 * Un contrôle ne demande pas le chiffre, il demande d'où il sort. C'est la
 * différence entre un outil qu'on regarde et un outil qu'on peut opposer, et
 * c'est la seule chose qui compte le jour où quelqu'un pose la question.
 *
 * ELLE EST LA SEULE SECTION SUR FOND D'ENCRE, et c'est réservé. Le bleu de nuit,
 * pleine largeur, texte inversé, ne sert pas à séduire mais à faire autorité :
 * c'est le bouclier juridique du produit, il doit peser plus lourd que le reste
 * de la page.
 *
 * LA TRAME EST CE QUI LA SAUVE D'ÊTRE UN TROU. Un aplat sombre de mille pixels
 * de haut est une interruption dans une page de papier. Les hachures à 135°,
 * à trois pour cent d'opacité, lui donnent le grain d'un papier de sécurité —
 * celui d'un titre, d'un acte, d'un diplôme — sans qu'on les remarque
 * consciemment. Elles sont dans `tokens.css`, en dégradé CSS : pas de requête,
 * pas de fichier, pas de couleur littérale dans le JSX.
 *
 * LE DOCUMENT RESTE BLANC. C'est le contraste qui fait la démonstration : la
 * pièce de preuve est un objet de papier, posé sur le fond sombre, exactement
 * comme elle le sera sur le bureau d'un contrôleur. Ses angles sont droits, et
 * ses champs sont séparés par des filets — c'est un formulaire, pas une carte.
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
		<SectionMarketing id="preuve" fond="encre">
			<TitreSection
				inverse
				sur="Auditabilité"
				titre="Chaque euro montre d’où il vient"
				chapeau="Un débiteur ne contestera pas votre total. Il refera le calcul."
			/>

			<div className="overflow-hidden rounded-panneau bg-papier text-plume">
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
					<span className="font-serif text-intertitre font-medium">FA-2026-118</span>
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

			<p className="max-w-3xl text-cladd-md leading-relaxed font-normal text-plume-inversee-douce">
				Un décompte arrêté ne bouge plus. C&rsquo;est ce qui prouve ce que vous réclamiez le jour où vous l&rsquo;avez réclamé.
			</p>
		</SectionMarketing>
	);
}
