import { Surface } from '@cladd-ui/react';
import { Illustration } from '../ui';

/**
 * L'auditabilité, expliquée par un exemple plutôt que par un argument.
 *
 * POURQUOI CETTE SECTION VAUT UNE VENTE. Un tableau de bord affiche un chiffre.
 * Un contrôle ne demande pas le chiffre, il demande d'où il sort. C'est la
 * différence entre un outil qu'on regarde et un outil qu'on peut opposer, et
 * c'est la seule chose qui compte le jour où quelqu'un pose la question.
 *
 * On montre donc l'anatomie d'une ligne, avec un vrai libellé abîmé par l'OCR
 * — « CAR0TTE », avec un zéro à la place du O. Un exemple propre laisserait
 * croire qu'on ne traite que des factures propres, ce qui n'arrive jamais.
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
		<section className="flex flex-col gap-cladd-2xs px-cladd-2xs py-cladd-md">
			<h2 className="text-letikette-titre leading-tight font-bold tracking-tight md:text-letikette-chiffre">
				Chaque ligne garde sa preuve
			</h2>
			<p className="max-w-2xl text-cladd-sm leading-relaxed text-cladd-fg-soft">
				Un contrôle ne vous demandera pas votre taux. Il vous demandera d&rsquo;où il sort. Voici ce
				qu&rsquo;une seule ligne de facture conserve, pendant toute la durée légale.
			</p>

			<Surface
				outline
				className="rounded-cladd-2xl shadow-carte"
				contentClassName="flex flex-col gap-cladd-2xs p-cladd-2xs"
			>
				<div className="flex items-center gap-cladd-3xs">
					<Illustration libelle="CAROTTE RONDELLE BIO" famille="FRUITS_LEGUMES" taille="lg" />
					<div className="flex min-w-0 flex-col">
						<span className="truncate text-cladd-sm font-semibold">Carotte rondelle bio</span>
						<span className="text-cladd-2xs text-cladd-fg-softer">
							52 lignes de facture · 3 120 € sur l&rsquo;exercice
						</span>
					</div>
				</div>

				<dl className="flex flex-col gap-cladd-3xs">
					{ANATOMIE.map((a) => (
						<div
							key={a.cle}
							className="flex flex-col gap-1 rounded-cladd-xs p-cladd-3xs transition-colors hover:bg-cladd-surface-cut sm:grid sm:grid-cols-3 sm:items-baseline sm:gap-cladd-3xs"
						>
							<dt className="text-cladd-2xs font-semibold text-cladd-fg-softer">{a.cle}</dt>
							<dd className="sm:col-span-2 sm:flex sm:flex-col sm:gap-1">
								<span className="text-cladd-sm leading-relaxed">{a.valeur}</span>
								<span className="text-cladd-2xs leading-relaxed text-cladd-fg-softer">
									{a.note}
								</span>
							</dd>
						</div>
					))}
				</dl>
			</Surface>

			<p className="max-w-3xl text-cladd-xs leading-relaxed text-cladd-fg-soft">
				Un bilan livré est figé à sa date. Si vous déposez d&rsquo;autres factures ensuite, elles
				produisent un nouveau bilan, daté à son tour. L&rsquo;ancien reste consultable tel
				qu&rsquo;il était, ce qui est la seule façon de tenir une trace utilisable deux ans plus
				tard.
			</p>
		</section>
	);
}
