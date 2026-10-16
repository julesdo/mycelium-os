import { useState, type ReactNode } from 'react';
import { Input, Textarea } from '@cladd-ui/react';
import { InboxIcon, MessageSquareIcon } from 'lucide-react';
import {
	BoutonPrincipal,
	BoutonSecondaire,
	BoutonTexte,
	CarteLien,
	ListeDeCartes,
	PageEcran,
	type Lecture
} from '../../ui';
import { BlocDeFiche, ChampsDeFiche, FicheEnDeuxColonnes } from '../../ui/admin';
import { VignetteIcone } from '../../ui/familles';
import {
	CeQuePlumeACompris,
	ComposeurDuSupport,
	MessageVuParLEquipe,
	type ModeDuComposeur,
	type VoixDuFil
} from '../../ui/support-equipe';

/**
 * LA BOÎTE DU SUPPORT (16/10/2026, spec du service client § 6) : la file, une
 * conversation à quatre voix avec le contexte du compte à côté, et les réponses
 * enregistrées. Tout arrive en propriétés : la salle les rend sans serveur.
 */

export interface LigneDeFileAffichee {
	readonly id: string;
	readonly etablissement: string;
	/** « Demande d’acte · Je veux changer l’adresse… » */
	readonly ligne: string;
	/** « attend depuis 2 h », « en retard de 20 min », « répondu hier ». */
	readonly date: string;
	readonly attention: boolean;
}

export function EcranFileSupport({
	lecture,
	titre,
	vide,
	absence
}: {
	readonly lecture: Lecture<readonly LigneDeFileAffichee[]>;
	readonly titre: string;
	readonly vide: string;
	/** Au fondateur : « Équipe absente jusqu’au… », que le délai annoncé aux clients suit. */
	readonly absence?: {
		/** « jeudi 23 octobre », ou `null` quand l'équipe est là. */
		readonly jusquAu: string | null;
		readonly onAnnoncer: () => void;
		readonly onLever: () => void;
	};
}) {
	const entete = { genre: 'onglet', titre } as const;
	if (lecture.etat !== 'pret') return <PageEcran entete={entete} etat={lecture.etat} />;
	return (
		<PageEcran entete={entete}>
			<div className="flex flex-col gap-cladd-2xs">
				{lecture.valeur.length === 0 ? (
					<p className="py-cladd-xs text-center text-cladd-2xs text-cladd-fg-soft">{vide}</p>
				) : (
					<ListeDeCartes>
						{lecture.valeur.map((l) => (
							<CarteLien
								key={l.id}
								vers="/admin/support/$id"
								parametres={{ id: l.id }}
								titre={l.etablissement}
								ligne={l.ligne}
								date={l.date}
								attention={l.attention}
								retour
								icone={<VignetteIcone icone={l.attention ? <InboxIcon aria-hidden /> : <MessageSquareIcon aria-hidden />} />}
							/>
						))}
					</ListeDeCartes>
				)}
				{absence === undefined ? null : absence.jusquAu === null ? (
					<p className="text-center">
						<BoutonTexte onClick={absence.onAnnoncer}>Annoncer une semaine d’absence</BoutonTexte>
					</p>
				) : (
					<p className="text-center text-cladd-2xs text-cladd-fg-soft">
						Équipe annoncée absente jusqu’au {absence.jusquAu}.{' '}
						<BoutonTexte onClick={absence.onLever}>Lever</BoutonTexte>
					</p>
				)}
			</div>
		</PageEcran>
	);
}

export interface ElementVuParLEquipe {
	readonly id: string;
	readonly voix: VoixDuFil;
	readonly nom: string;
	readonly texte: string;
	readonly heure: string;
	readonly parEmail: boolean;
	readonly sources: readonly string[];
	readonly retirePar?: string;
	readonly onRetirer?: () => void;
}

export interface ConversationVueParLEquipe {
	readonly etablissement: string;
	readonly titre: string;
	/** « Chez l’équipe · attend depuis 2 h », « En attente du gérant », « Terminée ». */
	readonly etat: string;
	readonly etiquettes: readonly string[];
	readonly ceQuePlumeACompris?: {
		readonly pourquoi: string;
		readonly question: string;
		readonly reponse?: string;
		readonly depuis?: string;
	};
	readonly elements: readonly ElementVuParLEquipe[];
	readonly contexte: readonly { readonly libelle: string; readonly valeur: string }[] | null;
	readonly precedentes: readonly { readonly id: string; readonly titre: string; readonly ligne: string }[];
	readonly gestes: {
		readonly assignee: string | null;
		readonly onMePrendre?: () => void;
		readonly prioritaire: boolean;
		readonly onPrioritaire: () => void;
		readonly terminee: boolean;
		readonly onTerminer: () => void;
		readonly onRouvrir: () => void;
		/** Le coupe-circuit, sur demande écrite d'un administrateur vérifié. */
		readonly onSuspendre?: () => void;
	};
	readonly composeur: {
		readonly mode: ModeDuComposeur;
		readonly onMode: (mode: ModeDuComposeur) => void;
		readonly valeur: string;
		readonly onChange: (valeur: string) => void;
		readonly onEnvoyer: (options: { terminer: boolean; confirme: boolean }) => void;
		readonly reponses: readonly { readonly id: string; readonly titre: string }[];
		readonly onInserer: (id: string) => void;
		readonly enCours: boolean;
		readonly avertissement?: string;
		readonly brouillon?: { readonly onDemander: () => void; readonly enCours: boolean };
		readonly prenomManquant?: ReactNode;
	};
}

export function EcranConversationSupport({
	lecture
}: {
	readonly lecture: Lecture<ConversationVueParLEquipe>;
}) {
	const [segment, setSegment] = useState<'historique' | 'details'>('historique');
	const entete = {
		genre: 'poussee',
		retour: { vers: '/admin/support', libelle: 'Support' },
		titre: lecture.etat === 'pret' ? lecture.valeur.etablissement : 'Conversation'
	} as const;
	if (lecture.etat !== 'pret') return <PageEcran entete={entete} etat={lecture.etat} />;
	const c = lecture.valeur;
	const { gestes, composeur } = c;

	return (
		<PageEcran entete={entete} largeur="large">
			<div className="pb-56 lg:pb-0">
				<FicheEnDeuxColonnes
					segment={segment}
					onSegment={setSegment}
					identite={
						<section className="flex flex-col gap-1">
							<h2 className="text-cladd-md leading-snug font-semibold text-balance">{c.titre}</h2>
							<p className="text-cladd-2xs text-cladd-fg-soft">
								{[c.etat, ...c.etiquettes].join(' · ')}
							</p>
						</section>
					}
					gestes={
						<div className="flex flex-wrap gap-2">
							{gestes.onMePrendre === undefined ? null : (
								<BoutonSecondaire onClick={gestes.onMePrendre}>Je m’en occupe</BoutonSecondaire>
							)}
							<BoutonSecondaire onClick={gestes.onPrioritaire}>
								{gestes.prioritaire ? 'Plus prioritaire' : 'Prioritaire'}
							</BoutonSecondaire>
							{gestes.terminee ? (
								<BoutonSecondaire onClick={gestes.onRouvrir}>Rouvrir</BoutonSecondaire>
							) : (
								<BoutonSecondaire onClick={gestes.onTerminer}>Terminer</BoutonSecondaire>
							)}
						</div>
					}
					details={
						<>
							{c.contexte === null ? (
								<BlocDeFiche titre="Le compte">
									<p className="px-1 text-cladd-2xs leading-relaxed text-cladd-fg-soft">
										Expéditeur non prouvé : le contexte du compte ne se montre pas.
									</p>
								</BlocDeFiche>
							) : (
								<BlocDeFiche titre="Le compte">
									<ChampsDeFiche champs={c.contexte} />
								</BlocDeFiche>
							)}
							{gestes.assignee === null ? null : (
								<BlocDeFiche titre="Qui s’en occupe">
									<ChampsDeFiche champs={[{ libelle: 'Attribuée à', valeur: gestes.assignee }]} />
								</BlocDeFiche>
							)}
							{gestes.onSuspendre === undefined ? null : (
								<BlocDeFiche titre="Relances automatiques">
									<p className="px-1 text-cladd-2xs leading-relaxed text-cladd-fg-soft">
										Seulement sur la demande écrite d’un administrateur, dans ce fil. Les relances
										programmées sont retenues ; lui seul les rallume.
									</p>
									<div className="px-1 pt-1">
										<BoutonSecondaire onClick={gestes.onSuspendre}>
											Suspendre les relances automatiques
										</BoutonSecondaire>
									</div>
								</BlocDeFiche>
							)}
							{c.precedentes.length === 0 ? null : (
								<BlocDeFiche titre="Conversations précédentes">
									<ListeDeCartes>
										{c.precedentes.map((p) => (
											<CarteLien
												key={p.id}
												vers="/admin/support/$id"
												parametres={{ id: p.id }}
												titre={p.titre}
												ligne={p.ligne}
												icone={<VignetteIcone icone={<MessageSquareIcon aria-hidden />} />}
											/>
										))}
									</ListeDeCartes>
								</BlocDeFiche>
							)}
						</>
					}
					historique={
						<div className="flex flex-col gap-4">
							{c.ceQuePlumeACompris === undefined ? null : (
								<CeQuePlumeACompris
									pourquoi={c.ceQuePlumeACompris.pourquoi}
									question={c.ceQuePlumeACompris.question}
									{...(c.ceQuePlumeACompris.reponse === undefined
										? {}
										: { reponse: c.ceQuePlumeACompris.reponse })}
									{...(c.ceQuePlumeACompris.depuis === undefined
										? {}
										: { depuis: c.ceQuePlumeACompris.depuis })}
								/>
							)}
							{c.elements.map((e) => (
								<MessageVuParLEquipe
									key={e.id}
									voix={e.voix}
									nom={e.nom}
									texte={e.texte}
									heure={e.heure}
									parEmail={e.parEmail}
									sources={e.sources}
									{...(e.retirePar === undefined ? {} : { retirePar: e.retirePar })}
									{...(e.onRetirer === undefined ? {} : { onRetirer: e.onRetirer })}
								/>
							))}
							<ComposeurDuSupport
								mode={composeur.mode}
								onMode={composeur.onMode}
								valeur={composeur.valeur}
								onChange={composeur.onChange}
								onEnvoyer={composeur.onEnvoyer}
								reponses={composeur.reponses}
								onInserer={composeur.onInserer}
								enCours={composeur.enCours}
								{...(composeur.avertissement === undefined ? {} : { avertissement: composeur.avertissement })}
								{...(composeur.brouillon === undefined ? {} : { brouillon: composeur.brouillon })}
								{...(composeur.prenomManquant === undefined ? {} : { prenomManquant: composeur.prenomManquant })}
							/>
						</div>
					}
				/>
			</div>
		</PageEcran>
	);
}

/** Le prénom que verront les clients, posé avant la première réponse. */
export function PoserSonPrenom({ onPoser }: { readonly onPoser: (prenom: string) => void }) {
	const [prenom, setPrenom] = useState('');
	return (
		<div className="flex flex-wrap items-center gap-2">
			<p className="text-cladd-2xs text-cladd-fg-soft">Le prénom que verront les clients :</p>
			<Input size="md" value={prenom} onChange={(v) => setPrenom(v)} placeholder="Camille" className="w-40" />
			<BoutonTexte disabled={prenom.trim() === ''} onClick={() => onPoser(prenom)}>
				Poser
			</BoutonTexte>
		</div>
	);
}

export interface ReponseEnregistreeAffichee {
	readonly id: string;
	readonly titre: string;
	readonly texte: string;
}

export function EcranReponsesEnregistrees({
	lecture,
	onEnregistrer,
	onSupprimer
}: {
	readonly lecture: Lecture<readonly ReponseEnregistreeAffichee[]>;
	readonly onEnregistrer?: (reponse: { id?: string; titre: string; texte: string }) => Promise<unknown>;
	readonly onSupprimer?: (id: string) => void;
}) {
	const [edition, setEdition] = useState<{ id?: string; titre: string; texte: string } | null>(null);
	const entete = { genre: 'onglet', titre: 'Réponses enregistrées' } as const;
	if (lecture.etat !== 'pret') return <PageEcran entete={entete} etat={lecture.etat} />;
	return (
		<PageEcran entete={entete}>
			<div className="flex flex-col gap-cladd-2xs">
				{edition === null ? (
					onEnregistrer === undefined ? null : (
						<BoutonPrincipal onClick={() => setEdition({ titre: '', texte: '' })}>
							Nouvelle réponse
						</BoutonPrincipal>
					)
				) : (
					<section className="verre-carte flex flex-col gap-2 rounded-cladd-xl px-3.5 py-3">
						<Input
							size="md"
							value={edition.titre}
							onChange={(v) => setEdition({ ...edition, titre: v })}
							placeholder="Titre (« Rebrancher Pennylane »)"
						/>
						<Textarea
							size="md"
							value={edition.texte}
							onChange={(v) => setEdition({ ...edition, texte: v })}
							placeholder="Le texte, avec {prenom} et {etablissement} si besoin"
						/>
						<div className="flex justify-end gap-2">
							<BoutonSecondaire onClick={() => setEdition(null)}>Annuler</BoutonSecondaire>
							<BoutonPrincipal
								disabled={edition.titre.trim() === '' || edition.texte.trim() === ''}
								onClick={() => void onEnregistrer?.(edition).then(() => setEdition(null))}
							>
								Enregistrer
							</BoutonPrincipal>
						</div>
					</section>
				)}
				{lecture.valeur.length === 0 ? (
					<p className="py-cladd-xs text-center text-cladd-2xs text-cladd-fg-soft">
						Aucune réponse enregistrée : la première se crée ici.
					</p>
				) : (
					lecture.valeur.map((r) => (
						<BlocDeFiche
							key={r.id}
							titre={r.titre}
							droite={
								onEnregistrer === undefined ? undefined : (
									<span className="flex gap-1">
										<BoutonTexte onClick={() => setEdition({ id: r.id, titre: r.titre, texte: r.texte })}>
											Modifier
										</BoutonTexte>
										{onSupprimer === undefined ? null : (
											<BoutonTexte onClick={() => onSupprimer(r.id)}>Supprimer</BoutonTexte>
										)}
									</span>
								)
							}
						>
							<p className="px-1 text-cladd-2xs leading-relaxed whitespace-pre-wrap text-cladd-fg">{r.texte}</p>
						</BlocDeFiche>
					))
				)}
			</div>
		</PageEcran>
	);
}
