import { useState } from 'react';
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useAction, useMutation, Authenticated, Unauthenticated, AuthLoading } from 'convex/react';
import { api } from '../lib/convex/_generated/api';
import { BoutonPrincipal, type EtablissementPropose, type EtatRecherche } from '../ui';
import { EcranBienvenue } from '../screens/inscription/entreprise';
import { qualiteCommercantDeLaForme } from '../lib/verticales/recouvrement/pays/france/commercialite';

export const Route = createFileRoute('/bienvenue')({ component: PageBienvenue });

/**
 * La garde, avant le formulaire.
 *
 * Cet écran a un jour affiché ses champs à quelqu'un qui n'avait pas de
 * session : la création d'entreprise se faisait renvoyer `Unauthenticated`,
 * et le seul retour était un message rouge, après la saisie. Un formulaire qui
 * ne peut pas partir ne doit pas s'ouvrir.
 *
 * Même mécanique que `/app` : les composants de `convex/react` plutôt qu'une
 * redirection dans `beforeLoad`, parce que l'état d'authentification n'est
 * connu qu'une fois le jeton vérifié.
 */
function PageBienvenue() {
	return (
		<>
			<AuthLoading>
				<div className="flex h-dvh items-center justify-center">
					<p className="text-cladd-xs text-cladd-fg-soft">Ouverture de votre espace…</p>
				</div>
			</AuthLoading>

			<Unauthenticated>
				<div className="flex h-dvh flex-col items-center justify-center gap-cladd-2xs p-cladd-xs text-center">
					<h1 className="text-cladd-md font-semibold">Connectez-vous d&rsquo;abord.</h1>
					<p className="max-w-sm text-cladd-xs text-cladd-fg-soft">
						Votre entreprise se crée depuis votre compte. Une fois connecté, vous reviendrez ici.
					</p>
					<BoutonPrincipal as={Link} to="/connexion">
						Se connecter
					</BoutonPrincipal>
				</div>
			</Unauthenticated>

			<Authenticated>
				<Bienvenue />
			</Authenticated>
		</>
	);
}

/**
 * La création de l'entreprise, et le câblage de la recherche au registre.
 *
 * CE QUI A ÉTÉ RETIRÉ ET N'EST PAS REVENU. Cet écran demandait un type
 * d'établissement — restaurant inter-entreprises, EHPAD, crèche — et un nombre
 * de couverts par jour, puis les JETAIT : ni l'un ni l'autre n'était envoyé à
 * la mutation. Un champ qu'on remplit pour rien est pire qu'un champ absent, il
 * apprend au lecteur que ses réponses ne servent à rien. Même sort pour
 * « Factures émises par an » : à cet instant précis, il n'y a encore AUCUNE
 * facture, et le produit les compte une fois importées.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QUI RAMÈNE LE NUMÉRO ICI : LE REGISTRE, PAS LA SAISIE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le SIRET avait quitté cet écran parce qu'il s'y tapait TROIS fois, dans deux
 * champs différents, pour n'être lu qu'une seule — sur `profilsCreancier.siren`,
 * que le décompte et le verrou de l'accueil lisent. Celui d'ici écrivait
 * `organizations.siret`, qu'aucune règle du domaine ne consulte.
 *
 * Il ne se tape plus nulle part. Le gérant écrit le nom de son entreprise, le
 * registre public la propose, il la touche, et le numéro, la forme juridique et
 * l'adresse partent avec elle — vers la table qui les lit, dans la MÊME
 * mutation que la création de l'établissement.
 *
 * ⚠️ L'ÉTAT DE LA RECHERCHE VIT ICI, PAS DANS L'ÉCRAN, et c'est ce qui permet à
 * la salle d'exposition de montrer les cinq phases sans rien cliquer.
 *
 * ⚠️ UNE PANNE N'EST PAS UNE ABSENCE. `AUCUN` et `ECHEC` sont deux états
 * distincts jusque dans ce `catch` : rendre une liste vide sur une panne ferait
 * croire que le registre ne connaît pas l'entreprise, ce qui est une réponse, et
 * c'en est une fausse.
 */
function Bienvenue() {
	const navigate = useNavigate();
	const creer = useMutation(api.organizations.createOrganization);
	const chercher = useAction(api.recouvrement.monEtablissement.chercherAuRegistreALInscription);

	const [nom, setNom] = useState('');
	const [recherche, setRecherche] = useState<EtatRecherche>({ phase: 'REPOS' });
	const [retenu, setRetenu] = useState<EtablissementPropose | null>(null);
	const [enCours, setEnCours] = useState(false);
	const [erreur, setErreur] = useState<string | null>(null);

	async function lancerLaRecherche() {
		const cherche = nom.trim();
		if (cherche === '') return;
		setRecherche({ phase: 'EN_COURS' });
		try {
			const { candidats } = await chercher({ nom: cherche });
			setRecherche(candidats.length === 0 ? { phase: 'AUCUN' } : { phase: 'TROUVE', candidats });
		} catch (e) {
			setRecherche({
				phase: 'ECHEC',
				message:
					e instanceof Error && e.message
						? e.message
						: 'Le registre n’a pas répondu. Réessayez dans un instant.'
			});
		}
	}

	async function soumettre() {
		const saisi = nom.trim();
		if (saisi === '' && retenu === null) return;
		setErreur(null);
		setEnCours(true);
		try {
			await creer({
				name: (retenu?.denomination ?? saisi).trim(),
				// L'identité ne part que si le gérant a touché un candidat. Sans elle,
				// l'établissement se crée comme avant, avec son seul nom.
				...(retenu === null
					? {}
					: {
							creancier: {
								denomination: retenu.denomination,
								siren: retenu.siren,
								...(retenu.formeJuridique === undefined
									? {}
									: { formeJuridique: retenu.formeJuridique }),
								...(retenu.adresse === undefined ? {} : { adresse: retenu.adresse }),
								estCommercant: qualiteCommercantDeLaForme(retenu.formeJuridique).etat
							}
						})
			});
			await navigate({ to: '/app' });
		} catch (e) {
			// ⚠️ LE REFUS DU SERVEUR, MOT POUR MOT. La clé de contrôle du numéro se
			// vérifie à l'écriture, et son message NOMME le numéro reçu : le
			// remplacer par une phrase générique laisserait le gérant devant une
			// erreur qu'il ne peut pas corriger.
			setErreur(
				e instanceof Error && e.message
					? e.message
					: "Votre entreprise n'a pas pu être créée. Réessayez ; si le problème persiste, écrivez-nous."
			);
		} finally {
			setEnCours(false);
		}
	}

	return (
		<EcranBienvenue
			nom={nom}
			onNom={(valeur) => {
				setNom(valeur);
				// Changer le nom périme la recherche : garder des candidats trouvés sur
				// l'ancien ferait toucher une entreprise qui n'est plus celle du champ.
				setRecherche({ phase: 'REPOS' });
			}}
			recherche={recherche}
			retenu={retenu}
			onChercher={() => void lancerLaRecherche()}
			onRetenir={(candidat) => {
				setRetenu(candidat);
				setNom(candidat.denomination);
				setRecherche({ phase: 'REPOS' });
			}}
			onChanger={() => setRetenu(null)}
			enCours={enCours}
			erreur={erreur}
			onCreer={() => void soumettre()}
		/>
	);
}
