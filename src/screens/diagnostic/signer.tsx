import { useState } from 'react';
import { Popup, PopupContent, Button, Input, Checkbox, SectionTitle } from '@cladd-ui/react';
import { PenLineIcon, ShieldCheckIcon } from 'lucide-react';
import { PaveSignature, Champ, MessageErreur, empreinteLisible } from '../../ui';
import { MENTION_SIGNATURE, MENTION_PORTEE_SIGNATURE } from '../../lib/convex/egalim/mentions';

/**
 * La feuille de signature.
 *
 * TROIS PRINCIPES, ET ILS SE VOIENT TOUS LES TROIS À L'ÉCRAN.
 *
 * **On montre ce qui est signé avant de le faire signer.** L'empreinte de la
 * mesure est affichée, lisible, découpée en blocs — pas cachée derrière un
 * « détails techniques ». C'est ce qui distingue une signature d'un
 * acquiescement, et c'est aussi ce qui permet à quelqu'un de vérifier plus
 * tard qu'il a bien signé CE bilan-là.
 *
 * **On dit ce que la signature vaut, au moment de signer.** La mention de
 * portée est au-dessus du bouton, pas dans des conditions générales. Elle dit
 * que c'est une signature simple et non qualifiée — l'inverse de ce qu'un
 * produit a envie d'écrire, et exactement ce qu'un gérant doit savoir avant
 * d'engager sa direction.
 *
 * **La case n'est pas pré-cochée.** Un consentement pré-donné n'en est pas un,
 * et sur un acte qui engage, c'est la première chose qu'un avocat regarde.
 */
export function FeuilleSignature({
	empreinte,
	nomParDefaut,
	enCours,
	erreur,
	onSigner,
	onFermer
}: {
	empreinte: string;
	nomParDefaut: string;
	enCours: boolean;
	erreur: string | null;
	onSigner: (v: { nom: string; fonction: string; trace: string | null }) => void;
	onFermer: () => void;
}) {
	const [nom, setNom] = useState(nomParDefaut);
	const [fonction, setFonction] = useState('');
	const [trace, setTrace] = useState<string | null>(null);
	const [accepte, setAccepte] = useState(false);

	const complet = nom.trim() !== '' && fonction.trim() !== '' && accepte;

	return (
		<Popup
			open
			onOpenChange={(ouvert) => {
				if (!ouvert) onFermer();
			}}
			contentClassName="max-w-180"
			headerLeft={<span className="px-2 pb-1 text-cladd-sm font-semibold">Signer ce bilan</span>}
		>
			<PopupContent>
				<div className="flex flex-col gap-cladd-2xs">
					<div className="grid gap-cladd-2xs sm:grid-cols-2">
						<Champ etiquette="Nom du signataire">
							<Input value={nom} onChange={setNom} name="signataire" />
						</Champ>
						<Champ etiquette="Fonction" aide="À quel titre vous signez.">
							<Input
								value={fonction}
								onChange={setFonction}
								name="fonction"
								placeholder="Responsable de restauration"
							/>
						</Champ>
					</div>

					<div className="flex flex-col gap-cladd-3xs">
						<SectionTitle>Votre signature (facultative)</SectionTitle>
						<p className="text-cladd-3xs text-cladd-fg-softer">
							Le tracé ne prouve rien à lui seul — c&rsquo;est la piste d&rsquo;audit qui le
							fait. Il est là parce qu&rsquo;un document signé se lit, là où un document coché se
							survole.
						</p>
						<PaveSignature onChange={setTrace} />
					</div>
				</div>
			</PopupContent>

			<PopupContent>
				<div className="flex flex-col gap-cladd-2xs">
					<div className="flex flex-col gap-cladd-3xs">
						<SectionTitle>Ce que vous signez</SectionTitle>
						<p className="text-cladd-xs leading-relaxed">{MENTION_SIGNATURE}</p>
					</div>

					{/* L'empreinte, montrée et non cachée. C'est ce qui permet de
					    vérifier plus tard qu'on a bien signé CE bilan-là. */}
					<div className="flex flex-col gap-1">
						<SectionTitle>Empreinte de la mesure</SectionTitle>
						<p className="text-cladd-3xs leading-relaxed break-all text-cladd-fg-softer">
							{empreinteLisible(empreinte)}
						</p>
						<p className="text-cladd-3xs text-cladd-fg-softest">
							Calculée sur les chiffres du bilan. Elle figure sur le PDF : deux exemplaires qui
							portent la même empreinte portent la même mesure.
						</p>
					</div>

					{/* La portée réelle, au-dessus du bouton. Pas dans des conditions
					    générales que personne n'ouvre. */}
					<div className="flex items-start gap-cladd-3xs rounded-cladd-lg bg-cladd-surface-cut p-cladd-3xs">
						<ShieldCheckIcon size={16} className="mt-0.5 shrink-0 text-cladd-fg-softer" />
						<p className="text-cladd-3xs leading-relaxed text-cladd-fg-soft">
							{MENTION_PORTEE_SIGNATURE}
						</p>
					</div>

					<label className="flex cursor-pointer items-start gap-cladd-3xs">
						<Checkbox checked={accepte} onChange={setAccepte} />
						<span className="text-cladd-xs leading-snug">
							J&rsquo;ai lu ce que je signe et la portée de cette signature.
						</span>
					</label>

					{erreur ? <MessageErreur>{erreur}</MessageErreur> : null}

					<div className="flex flex-wrap gap-cladd-3xs">
						<Button
							color="brand"
							variant="solid-fill"
							size="lg"
							className="min-w-0 flex-1"
							disabled={!complet}
							loading={enCours}
							readOnly={enCours}
							onClick={() => onSigner({ nom: nom.trim(), fonction: fonction.trim(), trace })}
						>
							<PenLineIcon />
							Signer le bilan
						</Button>
						<Button onClick={onFermer} disabled={enCours}>
							Annuler
						</Button>
					</div>
				</div>
			</PopupContent>
		</Popup>
	);
}
