import { Surface } from '@cladd-ui/react';
import { SectionMarketing } from './section';

/**
 * Pourquoi un abonnement, pour une obligation annuelle.
 *
 * C'EST LA PREMIÈRE OBJECTION, ET LA PAGE N'Y RÉPONDAIT PAS. Un gérant qui
 * perçoit Letikette comme une calculette de fin d'année ne paiera jamais tous
 * les mois. Il faut donc retourner la perception avant qu'elle se forme : on ne
 * vend pas un document annuel, on vend un suivi.
 *
 * Les trois arguments sont dans l'ordre de force décroissante pour la cible.
 * Le pilotage d'abord, parce que c'est le seul qui touche à la peur d'être en
 * infraction sans l'avoir vu venir. L'étalement ensuite, parce que c'est celui
 * qui parle au quotidien. La veille sur les prix en dernier, parce qu'elle
 * ouvre la suite sans rien promettre aujourd'hui.
 *
 * L'ANALOGIE COMPTABLE FERME LA SECTION. C'est la seule qui fasse comprendre
 * l'abonnement en une phrase à quelqu'un qui n'a jamais acheté de logiciel :
 * le bilan fiscal sort une fois par an, et personne ne conteste de payer son
 * cabinet tous les mois pour autant.
 */

const RAISONS = [
	{
		titre: 'Un GPS, pas un constat après l’accident.',
		texte:
			'Si vous découvrez en mars que vous êtes à 12 % de bio au lieu de 20, l’année est close et rien ne peut plus la rattraper. En voyant le retard en octobre, il vous reste deux mois de commandes pour le corriger.'
	},
	{
		titre: 'Cinq minutes par mois plutôt qu’une soirée en mars.',
		texte:
			'Douze mois de factures d’un seul coup, c’est une file de confirmation gigantesque à relire d’une traite. Mois par mois, vous validez à chaud, pendant que vous vous souvenez encore des livraisons. En mars, le bilan est déjà prêt.'
	},
	{
		titre: 'Vos prix d’achat sous l’œil, toute l’année.',
		texte:
			'En déposant vos factures au fil de l’eau, vous voyez qu’un fournisseur a monté la volaille de 10 % entre janvier et juin. Une fois par an, ce genre de dérive passe inaperçu et se paie douze mois.'
	}
] as const;

export function Abonnement() {
	return (
		<SectionMarketing fond="page">
			<h2 className="text-letikette-titre leading-tight font-extrabold tracking-tight md:text-letikette-chiffre">
				La déclaration est annuelle. Le suivi ne l’est pas.
			</h2>
			<p className="max-w-2xl text-cladd-md leading-relaxed font-normal text-cladd-fg-soft">
				C’est la question que tout le monde pose, et elle est légitime. Voici les trois raisons de
				déposer vos factures tous les mois plutôt qu’une fois par an.
			</p>

			<div className="grid gap-cladd-2xs md:grid-cols-3">
				{RAISONS.map((r) => (
					<Surface
						key={r.titre}
						outline
						className="rounded-cladd-2xl shadow-carte transition-shadow hover:shadow-carte-levee"
						contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs"
					>
						<span className="text-cladd-md leading-snug font-bold">{r.titre}</span>
						<span className="text-cladd-sm leading-relaxed font-normal text-cladd-fg-soft">
							{r.texte}
						</span>
					</Surface>
				))}
			</div>

			<Surface
				outline
				className="rounded-cladd-2xl"
				contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs"
			>
				<span className="max-w-3xl text-cladd-md leading-relaxed font-normal">
					C’est exactement votre cabinet comptable. Votre bilan fiscal n’est édité qu’une fois par
					an, et vous payez pourtant tous les mois pour que vos factures soient saisies et
					classées, et pour savoir où vous en êtes.
				</span>
				<span className="text-cladd-sm font-bold text-cladd-fg-softer">
					Letikette, c’est la même chose pour votre assiette.
				</span>
			</Surface>
		</SectionMarketing>
	);
}
