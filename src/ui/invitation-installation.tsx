import { Button } from '@cladd-ui/react';
import { XIcon } from 'lucide-react';

/**
 * L'INVITATION À INSTALLER — une notification en haut de l'écran, comme celles du
 * téléphone (15/10/2026).
 *
 * L'icône que l'on aura sur son écran d'accueil, ce que l'installation change en
 * une ligne, un bouton qui ouvre la fenêtre d'installation d'Android, et une croix
 * pour plus tard. Elle descend du haut de l'écran sans rien pousser, dans le verre
 * de la barre du bas, et ne revient pas d'elle-même : c'est `app/installation.ts`
 * qui décide quand.
 *
 * ⚠️ AU TÉLÉPHONE SEULEMENT (\`lg:hidden\`) : l'offre ne vise que les téléphones Android.
 */
export function InvitationInstallation({
	onInstaller,
	onPlusTard
}: {
	readonly onInstaller: () => void;
	readonly onPlusTard: () => void;
}) {
	return (
		<section
			aria-label="Installer l’application Letikette"
			className="invitation-installation verre-barre fixed inset-x-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-40 flex items-center gap-3 rounded-[1.75rem] py-2.5 pr-1.5 pl-2.5 lg:hidden"
		>
			<img
				src="/icone-192.png"
				alt=""
				aria-hidden
				className="size-11 shrink-0 rounded-[0.8rem] shadow-sm ring-1 ring-cladd-outline"
			/>
			<span className="flex min-w-0 flex-1 flex-col gap-0.5">
				<span className="truncate text-cladd-xs leading-tight font-semibold">
					Letikette, comme une app
				</span>
				<span className="text-cladd-2xs leading-snug text-cladd-fg-soft">
					Sur votre écran d’accueil, en plein écran.
				</span>
			</span>
			{/* La pilule de l'action principale, à la taille compacte : c'est le geste de la notification. */}
			<Button
				size="md"
				rounded
				variant="transparent"
				outline={false}
				hoverable={false}
				className="pilule-principale shrink-0 px-4 font-semibold"
				onClick={onInstaller}
			>
				Installer
			</Button>
			<Button
				size="md"
				square
				rounded
				variant="transparent"
				outline={false}
				hoverable={false}
				aria-label="Plus tard"
				title="Plus tard"
				className="shrink-0 text-cladd-fg-softer"
				onClick={onPlusTard}
			>
				<XIcon aria-hidden />
			</Button>
		</section>
	);
}
