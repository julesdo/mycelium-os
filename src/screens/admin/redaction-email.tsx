import { ExternalLinkIcon, MailIcon } from 'lucide-react';
import { BoutonSecondaire, EnTeteDeGroupe, LigneCopiable } from '../../ui';
import {
	adresseMailto,
	LIBELLES_DES_ETAPES,
	LIBELLES_DES_MODELES,
	type EtapeDEcriture,
	type Modele
} from '../../lib/crm/modeles';
import type { BaseDeLEmail } from '../../lib/crm/consentement';

/**
 * L'E-MAIL PRÊT À ÉCRIRE, DANS LA FEUILLE « E-MAIL » D'UN PROSPECT (18/10/2026).
 *
 * Le modèle de l'étape (premier e-mail, J+4, J+10), rempli pour l'entreprise, se lit
 * en entier ; « Écrire » ouvre la messagerie de l'équipier avec l'objet et le corps,
 * et l'envoi se note ensuite par le bouton du pied. Le CRM n'envoie rien lui-même.
 * Sans adresse, la feuille mène au site de l'entreprise, où elle se trouve.
 */

/** La recherche du site de l'entreprise : l'adresse est dans ses mentions ou son contact. */
export function rechercheDuSite(entreprise: string, ville: string | undefined): string {
	return `https://www.google.com/search?q=${encodeURIComponent([entreprise, ville].filter(Boolean).join(' '))}`;
}

export function RedactionDEmail({
	etape,
	modele,
	objet,
	corps,
	base,
	email,
	entreprise,
	ville
}: {
	readonly etape: EtapeDEcriture;
	readonly modele: Modele;
	readonly objet: string;
	readonly corps: string;
	/** Sur quoi l'e-mail s'appuie : au premier contact, c'est lui qui informe la personne. */
	readonly base?: BaseDeLEmail;
	readonly email?: string;
	readonly entreprise: string;
	readonly ville?: string;
}) {
	if (etape === 'FINI') {
		return (
			<div className="flex flex-col gap-cladd-2xs">
				<p className="px-1 text-cladd-2xs text-cladd-fg-soft">
					Trois e-mails sont déjà notés : la routine s’arrête là. Notez sa réponse s’il en donne
					une, ou classez le prospect.
				</p>
				{email === undefined ? null : (
					<BoutonSecondaire as="a" href={`mailto:${email}`} pleineLargeur>
						<MailIcon aria-hidden />
						Écrire à {email}
					</BoutonSecondaire>
				)}
			</div>
		);
	}
	return (
		<div className="flex flex-col gap-cladd-2xs">
			<EnTeteDeGroupe libelle={`${LIBELLES_DES_ETAPES[etape]} · ${LIBELLES_DES_MODELES[modele]}`} />
			<div className="verre-carte flex flex-col gap-cladd-3xs rounded-cladd-xl px-3.5 py-3">
				<p className="text-cladd-2xs font-semibold">{objet}</p>
				<p className="text-cladd-2xs leading-relaxed wrap-anywhere whitespace-pre-line text-cladd-fg-soft">
					{corps}
				</p>
			</div>
			{corps.includes('[') ? (
				<p className="px-1 text-cladd-3xs text-cladd-fg-soft">
					Remplacez ce qui est entre crochets avant d’envoyer : une phrase écrite pour la personne,
					et où vous avez trouvé son adresse.
				</p>
			) : null}
			{base === 'PREMIER_CONTACT' ? (
				<p className="px-1 text-cladd-3xs text-cladd-fg-soft">
					Cet e-mail est le premier contact : son pied informe la personne (d’où vient son adresse,
					ses droits, le lien pour ne plus rien recevoir). Gardez-le tel quel.
				</p>
			) : null}
			{email === undefined ? (
				<>
					<p className="px-1 text-cladd-2xs text-cladd-fg-soft">
						Pas d’adresse sur la fiche : elle se lit sur le site de l’entreprise, sa page de contact
						ou ses mentions légales.
					</p>
					<BoutonSecondaire
						as="a"
						href={rechercheDuSite(entreprise, ville)}
						target="_blank"
						rel="noreferrer"
						pleineLargeur
					>
						<ExternalLinkIcon aria-hidden />
						Chercher son site
					</BoutonSecondaire>
				</>
			) : (
				<BoutonSecondaire as="a" href={adresseMailto(email, { objet, corps })} pleineLargeur>
					<MailIcon aria-hidden />
					Écrire à {email}
				</BoutonSecondaire>
			)}
			<div className="verre-carte flex flex-col rounded-cladd-xl [&>*+*]:border-t [&>*+*]:border-cladd-outline">
				<LigneCopiable
					etiquette="Pour un formulaire de contact"
					affichage="Copier le message"
					valeur={`${objet}\n\n${corps}`}
				/>
			</div>
		</div>
	);
}
