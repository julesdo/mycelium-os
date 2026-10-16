import { useState } from 'react';
import { Input, Select } from '@cladd-ui/react';
import { ShieldCheckIcon, ShieldOffIcon } from 'lucide-react';
import {
	Avatar,
	BoutonPrincipal,
	BoutonTexte,
	EnTeteDeGroupe,
	FeuillePleinEcran,
	ListeDeCartes,
	MessageErreur,
	PageEcran,
	type Lecture
} from '../../ui';
import { DESCRIPTIONS_DES_ROLES, ROLES_EQUIPE, type RoleEquipe } from '../../lib/admin/acces';
import { dateCourteDeParis } from '../../lib/admin/dates';
import { messageDeRefus } from './formulaire-prospect';

/**
 * L'ÉQUIPE DE LETIKETTE (16/10/2026, sur Lyssna et Profound) : une ligne
 * d'invitation (l'adresse, le rôle, « Inviter »), puis les membres avec leur rôle,
 * changeable dans un menu qui décrit chaque rôle, et les invitations en attente,
 * retirables. Chaque membre dit si sa double authentification est active.
 *
 * ⚠️ LE DERNIER FONDATEUR NE SE RETIRE PAS ET NE CHANGE PAS DE RÔLE : le serveur le
 * refuse (`toucheAuDernierFondateur`), et l'écran en donne la raison.
 */

export interface MembreDeLEquipe {
	readonly email: string;
	readonly nom?: string;
	readonly role: RoleEquipe;
	readonly invitePar: string;
	readonly inviteLe: number;
	readonly rejointLe?: number;
	readonly doubleAuth: boolean;
	readonly moi: boolean;
}

/** Du plus large au plus restreint, l'ordre dans lequel on choisit. */
const ROLES_PROPOSES = [...ROLES_EQUIPE].reverse() as RoleEquipe[];

function ChoixDuRole({
	role,
	onChoisir,
	lectureSeule = false
}: {
	readonly role: RoleEquipe;
	readonly onChoisir: (role: RoleEquipe) => void;
	readonly lectureSeule?: boolean;
}) {
	return (
		<Select
			size="md"
			rounded
			title="Rôle"
			options={ROLES_PROPOSES}
			value={role}
			readOnly={lectureSeule}
			keyboardHints={false}
			popoverClassName="w-72"
			renderOption={({ value }) => DESCRIPTIONS_DES_ROLES[value].libelle}
			renderOptionInfo={({ value }) => DESCRIPTIONS_DES_ROLES[value].description}
			onChange={(r) => onChoisir(r as RoleEquipe)}
		>
			{DESCRIPTIONS_DES_ROLES[role].libelle}
		</Select>
	);
}

export function EcranEquipe({
	lecture,
	onInviter,
	onChangerRole,
	onRetirer
}: {
	readonly lecture: Lecture<readonly MembreDeLEquipe[]>;
	readonly onInviter: (email: string, role: RoleEquipe) => Promise<void>;
	readonly onChangerRole: (email: string, role: RoleEquipe) => Promise<void>;
	readonly onRetirer: (email: string) => Promise<void>;
}) {
	const [email, setEmail] = useState('');
	const [role, setRole] = useState<RoleEquipe>('SUPPORT');
	const [erreur, setErreur] = useState<string | null>(null);
	const [enCours, setEnCours] = useState(false);
	const [aRetirer, setARetirer] = useState<MembreDeLEquipe | null>(null);

	const entete = { genre: 'onglet' as const, titre: 'Équipe' };
	if (lecture.etat !== 'pret') return <PageEcran entete={entete} etat={lecture.etat} />;

	async function tenter(geste: () => Promise<void>) {
		setErreur(null);
		setEnCours(true);
		try {
			await geste();
			return true;
		} catch (e) {
			setErreur(messageDeRefus(e));
			return false;
		} finally {
			setEnCours(false);
		}
	}

	const membres = lecture.valeur.filter((m) => m.rejointLe !== undefined);
	const enAttente = lecture.valeur.filter((m) => m.rejointLe === undefined);
	const adresseValide = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

	const ligne = (m: MembreDeLEquipe, attente: boolean) => (
		<div
			key={m.email}
			// Au téléphone, les gestes passent sous l'identité : rien ne se tronque.
			className="verre-carte flex min-h-17 flex-col gap-2 rounded-cladd-xl px-3.5 py-2.5 sm:flex-row sm:items-center sm:gap-2.5 sm:py-2"
		>
			<span className="flex min-w-0 flex-1 items-center gap-2.5">
				<Avatar nom={m.nom ?? m.email} surCarte />
				<span className="flex min-w-0 flex-1 flex-col gap-0.5">
					<span className="truncate text-cladd-xs font-semibold">
						{m.nom ?? m.email}
						{m.moi ? <span className="font-normal text-cladd-fg-soft"> (vous)</span> : null}
					</span>
					<span className="flex min-w-0 items-center gap-1.5 text-cladd-2xs text-cladd-fg-soft">
						{attente ? (
							<span className="truncate">
								Invité le {dateCourteDeParis(m.inviteLe)} · {m.email}
							</span>
						) : (
							<>
								{m.doubleAuth ? (
									<ShieldCheckIcon aria-hidden className="size-3.5 shrink-0" />
								) : (
									<ShieldOffIcon aria-hidden className="size-3.5 shrink-0" />
								)}
								<span className="truncate">
									{m.doubleAuth
										? 'Double authentification active'
										: 'Double authentification à activer'}
								</span>
							</>
						)}
					</span>
				</span>
			</span>
			<span className="flex shrink-0 items-center justify-end gap-1">
				<ChoixDuRole
					role={m.role}
					lectureSeule={enCours}
					onChoisir={(r) => {
						if (r !== m.role) void tenter(() => onChangerRole(m.email, r));
					}}
				/>
				{m.moi ? null : (
					<BoutonTexte onClick={() => setARetirer(m)} aria-label={`Retirer ${m.email}`}>
						Retirer
					</BoutonTexte>
				)}
			</span>
		</div>
	);

	return (
		<PageEcran entete={entete}>
			<div className="flex flex-col gap-cladd-sm">
				<section className="flex flex-col gap-cladd-3xs">
					<EnTeteDeGroupe libelle="Inviter" />
					<div className="verre-carte flex flex-col gap-cladd-2xs rounded-cladd-xl p-cladd-2xs lg:flex-row lg:items-center">
						<Input
							size="lg"
							type="email"
							value={email}
							onChange={setEmail}
							placeholder="adresse@exemple.fr"
							className="min-w-0 flex-1"
							inputComponentProps={{ 'aria-label': 'L’adresse à inviter', autoComplete: 'off' }}
						/>
						<div className="flex items-center gap-2">
							<ChoixDuRole role={role} onChoisir={setRole} />
							<BoutonPrincipal
								className="flex-1 lg:flex-none"
								disabled={!adresseValide || enCours}
								onClick={() =>
									void tenter(() => onInviter(email.trim(), role)).then((ok) => {
										if (ok) setEmail('');
									})
								}
							>
								Inviter
							</BoutonPrincipal>
						</div>
					</div>
					<p className="px-1 text-cladd-3xs text-cladd-fg-soft">
						L’invité reçoit un e-mail. Il entre avec un compte Letikette à cette adresse, vérifiée,
						et la double authentification active.
					</p>
				</section>

				{erreur === null ? null : <MessageErreur>{erreur}</MessageErreur>}

				<section className="flex flex-col gap-cladd-3xs">
					<EnTeteDeGroupe libelle="Membres" nombre={membres.length} />
					<ListeDeCartes>{membres.map((m) => ligne(m, false))}</ListeDeCartes>
				</section>

				{enAttente.length === 0 ? null : (
					<section className="flex flex-col gap-cladd-3xs">
						<EnTeteDeGroupe libelle="Invitations en attente" nombre={enAttente.length} />
						<ListeDeCartes>{enAttente.map((m) => ligne(m, true))}</ListeDeCartes>
					</section>
				)}
			</div>

			<FeuillePleinEcran
				ouverte={aRetirer !== null}
				onFermer={() => setARetirer(null)}
				titre={aRetirer?.rejointLe === undefined ? 'Retirer l’invitation' : 'Retirer de l’équipe'}
				{...(aRetirer === null ? {} : { sousTitre: aRetirer.email })}
				pied={
					<BoutonPrincipal
						pleineLargeur
						disabled={enCours}
						onClick={() => {
							const cible = aRetirer;
							if (cible === null) return;
							void tenter(() => onRetirer(cible.email)).then(() => setARetirer(null));
						}}
					>
						Retirer
					</BoutonPrincipal>
				}
			>
				<p className="text-cladd-xs">
					Son accès à l’admin se ferme tout de suite. Ce qu’il a fait reste au journal.
				</p>
			</FeuillePleinEcran>
		</PageEcran>
	);
}
