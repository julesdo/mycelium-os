import { DUREE_ESSAI_JOURS } from '../../lib/config/tarifs';

/**
 * LE CHAMP D'INSCRIPTION DU SITE (maquette V26) : l'adresse, puis « Commencer l'essai ».
 *
 * Son comportement vit dans `ui/site/champ-email.ts` (la coche quand l'adresse tient, l'erreur dite
 * en quittant le champ, la correction d'un domaine courant). L'envoi ouvre `/inscription` à
 * l'étape du mot de passe, l'adresse portée par l'état de l'historique, jamais par l'URL.
 *
 * La maquette affichait ensuite « C'est noté. Étape suivante : votre mot de passe » sur place ;
 * le site va droit à cette étape, et le bloc a disparu.
 */
/**
 * `jour` sur un tableau clair (l'appel) : le bouton d'encre, et l'étiquette qui se balance dessous ;
 * `nuit` sur l'aube de l'en-tête : le bouton clair, sans étiquette.
 */
export function ChampInscription({
	id,
	ton
}: {
	readonly id: string;
	readonly ton: 'jour' | 'nuit';
}) {
	const aide = `aide-${id}`;
	return (
		<>
			<form className={`inscription inscription-${ton}`} data-inscription="" noValidate>
				<div className="champ">
					<svg className="champ-icone" viewBox="0 0 24 24" aria-hidden="true">
						<rect x="3.2" y="5.6" width="17.6" height="12.8" rx="2.6" />
						<path className="env-rabat" d="M4 7.2l8 5.9 8-5.9" />
					</svg>
					<input
						id={id}
						name="email"
						type="email"
						inputMode="email"
						autoComplete="email"
						autoCapitalize="off"
						autoCorrect="off"
						spellCheck="false"
						enterKeyHint="go"
						placeholder=" "
						aria-describedby={aide}
						required
					/>
					<label htmlFor={id}>E-mail professionnel</label>
					<span className="champ-bout">
						<svg className="champ-ok" viewBox="0 0 20 20" aria-hidden="true">
							<circle cx="10" cy="10" r="8.3" pathLength="1" />
							<path d="M6.2 10.4l2.6 2.6 5-5.5" pathLength="1" />
						</svg>
						<button
							type="button"
							className="champ-effacer"
							aria-label="Effacer l’adresse"
							tabIndex={-1}
						>
							<svg viewBox="0 0 16 16" aria-hidden="true">
								<path d="M5 5l6 6M11 5l-6 6" />
							</svg>
						</button>
					</span>
				</div>
				<button
					className={ton === 'jour' ? 'bouton bouton-encre cta' : 'bouton bouton-clair cta'}
					type="submit"
					data-cta=""
				>
					<span className="cta-fond" aria-hidden="true" />
					<span className="cta-attente" aria-hidden="true" />
					<span className="cta-txt">Commencer l’essai</span>
					<svg className="cta-fleche" viewBox="0 0 10 10" aria-hidden="true">
						<path className="ligne" d="M0 5h7" />
						<path className="pointe" d="M1 1l4 4-4 4" />
					</svg>
					{ton === 'jour' ? (
						<span className="cta-etq" aria-hidden="true">
							<span className="cta-etq-papier">
								<b>{`${DUREE_ESSAI_JOURS} jours d’essai`}</b>0 € aujourd’hui
							</span>
						</span>
					) : null}
				</button>
			</form>
			<p className="aide" id={aide} aria-live="polite" />
		</>
	);
}
