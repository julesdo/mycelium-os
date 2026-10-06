import { LEGAL_CONFIG } from '../lib/config/legal';
import { SectionMarketing } from './section';

/**
 * LE MOT DU FONDATEUR — une lettre, pas un encart (06/10/2026).
 *
 * Elle suit les limites, et c'est l'ordre qui la rend utile : sans personne
 * derrière, un refus se lit comme une clause ; signé, il se lit comme un choix.
 * Et c'est le dernier écran avant qu'on demande de l'argent : celui qui le
 * demande s'est présenté d'abord.
 *
 * Une feuille de papier posée sur un aplat lavande, légèrement de travers, la
 * serif pour le texte et la main pour la signature — Daylight et Handshake.
 *
 * ⚠️ LA SIGNATURE N'EST PAS UNE IMAGE DE PARAPHE. Imiter une main serait un
 * faux ; un nom posé dans une écriture manuscrite dit « c'est moi qui écris ».
 */
const NOTE = [
	'Je n’ai pas écrit Letikette pour vous vendre une procédure. Je l’ai écrit pour le calcul : l’échéance, le taux du semestre, le nombre de jours, et tout recommencer à la facture suivante. À la main, personne ne va au bout, et ce qui n’est pas calculé ne se réclame pas.',
	'Alors le logiciel compte, il date, il prévient. Il ne fera rien à votre place, et vous venez de lire tout ce qu’il refuse de faire.',
	'Letikette est écrit à Bordeaux, dans une entreprise individuelle qui porte mon nom. Le numéro en bas de cette page est le mien, et c’est moi qui réponds.'
] as const;

export function Note() {
	return (
		<SectionMarketing ton="creme" courbe className="items-center">
			<div
				aria-hidden
				className="galet galet-c inset-x-0 top-24 bottom-24 -z-10 mx-auto max-w-4xl bg-teinte-temps"
			/>
			<article className="apparait flex w-full max-w-2xl flex-col gap-cladd-2xs rounded-carte-site bg-papier p-cladd-sm shadow-carte-chaude md:p-cladd-xl">
				<p className="text-cladd-xs font-semibold tracking-widest text-encre-site-claire uppercase">
					Le mot du fondateur
				</p>
				{NOTE.map((paragraphe) => (
					<p key={paragraphe.slice(0, 24)} className="font-serif text-chapeau leading-relaxed">
						{paragraphe}
					</p>
				))}
				<div className="flex flex-col gap-1 pt-cladd-2xs">
					<span className="signature-note text-titre-section leading-none text-encre-site-douce">
						{LEGAL_CONFIG.directeurPublication}
					</span>
					<span className="text-cladd-xs font-medium tracking-widest text-encre-site-claire uppercase">
						{LEGAL_CONFIG.legalForm} · SIRET {LEGAL_CONFIG.siret}
					</span>
				</div>
			</article>
		</SectionMarketing>
	);
}
