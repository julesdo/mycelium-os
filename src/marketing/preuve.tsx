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
		cle: 'Le libellé du fournisseur',
		valeur: 'CAR0TTE RONDELLE 4/4 BIO 2.5KG',
		note: 'Conservé tel quel, avec le zéro que le scan a pris pour un O.'
	},
	{
		cle: 'Le classement retenu',
		valeur: 'Fruits et légumes · Bio (AB)',
		note: 'Compte au bio, et donc aussi au durable.'
	},
	{
		cle: 'La justification',
		valeur: 'La mention BIO figure au libellé ; le certificat fournisseur reste à obtenir.',
		note: 'Aucune ligne n’est classée sans une phrase qui dit pourquoi.'
	},
	{
		cle: 'L’indice de confiance',
		valeur: '74 %',
		note: 'Sous le seuil, donc envoyée en confirmation devant vous.'
	}
] as const;

export function Preuve() {
	return (
		<SectionMarketing id="preuve" fond="encre">
			<TitreSection
				inverse
				sur="Auditabilité"
				titre="Chaque ligne garde sa preuve"
				chapeau="Un contrôle ne vous demandera pas votre taux. Il vous demandera d’où il sort."
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
					<span className="font-serif text-intertitre font-medium">Carotte rondelle bio</span>
					<span className="text-cladd-sm text-plume-claire tabular-nums">
						52 lignes de facture · 3 120 € sur l&rsquo;exercice
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
				Un bilan livré ne bouge plus. C&rsquo;est ce qui le rend opposable deux ans plus tard.
			</p>
		</SectionMarketing>
	);
}
