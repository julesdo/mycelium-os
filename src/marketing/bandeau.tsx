/**
 * La bande photographique, pleine largeur, entre le parcours et la preuve.
 *
 * POURQUOI ELLE EXISTE, ET CE QU'ELLE CORRIGE. Comparée aux pages qui tiennent
 * vraiment — celle d'Adyen, celles des studios éditoriaux — cette page-ci
 * n'avait qu'un seul VOLUME et qu'une seule LARGEUR. Tout y tenait dans la même
 * colonne bornée, entre dix-sept et quarante pixels de corps, sur le même blanc,
 * du haut jusqu'en bas. Une page sans écart d'échelle se lit comme un formulaire
 * administratif : correctement, et sans y croire.
 *
 * Ce qui distingue les pages qui tiennent n'est ni la police ni la palette,
 * c'est l'AMPLITUDE : une photographie qui va d'un bord à l'autre, puis un aplat
 * sombre, puis du texte serré. Le rythme fait la conviction autant que le
 * contenu.
 *
 * ELLE TOMBE À LA CHARNIÈRE, et pas ailleurs. Avant elle, la page explique
 * comment le logiciel travaille. Après elle, elle explique pourquoi le résultat
 * tient devant un contrôle. C'est le moment où le lecteur change de question, et
 * une respiration pleine largeur est exactement ce qui marque ce changement.
 *
 * ELLE PORTE UNE PHRASE, ET UNE SEULE. C'est la thèse entière du produit :
 * chaque euro servi dans ces bacs est une ligne dans une facture. Une bande
 * photographique sans texte serait de la décoration, et cette page n'en veut
 * pas. Avec cette phrase, elle argumente.
 *
 * LE VOILE N'EST PAS UN EFFET. Sans lui, du texte clair posé sur une
 * photographie devient illisible dès que le cadrage change. Le dégradé part du
 * bas, là où le texte est posé, et laisse le haut de l'image intact.
 */
export function Bandeau() {
	return (
		<section className="relative w-full border-y border-trait-encre bg-encre-nuit">
			{/*
			  `aspect-video` en dessous de `md` : sur un téléphone, une bande de
			  cinq cents pixels de haut occupe tout l'écran et coupe la lecture au
			  lieu de la rythmer.
			*/}
			<div className="relative aspect-video max-h-125 w-full overflow-hidden md:aspect-auto md:h-125">
				<img
					src="/photos/service.jpg"
					alt="Bacs gastronormes en ligne de self, sur une table de service"
					loading="lazy"
					className="absolute inset-0 size-full object-cover"
				/>
				<div className="absolute inset-0 bg-gradient-to-t from-encre-nuit via-encre-nuit/55 to-transparent" />
			</div>

			<div className="absolute inset-x-0 bottom-0">
				<div className="mx-auto w-full max-w-7xl px-cladd-2xs pb-cladd-xs">
					<p className="max-w-3xl font-serif text-titre-section leading-tight font-semibold text-plume-inversee">
						Chaque euro servi dans ces bacs est une ligne dans une facture.
					</p>
				</div>
			</div>
		</section>
	);
}
