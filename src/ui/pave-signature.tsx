import { useRef, useState, useCallback } from 'react';
import { SurfaceCut, Button } from '@cladd-ui/react';
import { EraserIcon } from 'lucide-react';

/**
 * Le pavé où l'on signe au doigt.
 *
 * CE QU'IL PROUVE : rien, tout seul. Un tracé se recopie, et personne ne compare
 * une signature manuscrite à un spécimen. Ce qui prouve, c'est la piste d'audit
 * — compte authentifié, heure serveur, empreinte de la mesure — et elle est
 * enregistrée que le pavé soit rempli ou non.
 *
 * ALORS POURQUOI IL EXISTE. Parce que c'est ce que le lecteur d'un PDF
 * reconnaît comme une signature, et que c'est ce qui lui fait lire la mention
 * qui l'accompagne. Un bilan qui porte « signé électroniquement par… » en
 * petites capitales se survole ; un bilan qui porte un tracé se regarde. La
 * valeur du pavé est entièrement dans l'attention qu'il capte, et c'est une
 * raison suffisante.
 *
 * TACTILE D'ABORD. Les événements Pointer couvrent le doigt, le stylet et la
 * souris avec le même code — inutile de doubler la gestion tactile, et c'est
 * la seule API qui capte le pointeur hors du cadre pour qu'un trait ne se
 * coupe pas quand le doigt déborde.
 */

/** La densité de rendu : un tracé à 1× est visiblement crénelé sur une tablette. */
const DENSITE = 2;

export function PaveSignature({
	onChange,
	hauteur = 160
}: {
	/** Le tracé en PNG (data URL), ou `null` quand le pavé est vide. */
	onChange: (trace: string | null) => void;
	hauteur?: number;
}) {
	const toile = useRef<HTMLCanvasElement>(null);
	const dessine = useRef(false);
	const [vide, setVide] = useState(true);

	/** Prépare la toile à sa taille réelle. Appelée à chaque montage du canvas. */
	const preparer = useCallback(
		(element: HTMLCanvasElement | null) => {
			toile.current = element;
			if (!element) return;
			const largeur = element.clientWidth || 480;
			element.width = largeur * DENSITE;
			element.height = hauteur * DENSITE;
			const ctx = element.getContext('2d');
			if (!ctx) return;
			ctx.scale(DENSITE, DENSITE);
			ctx.lineWidth = 2;
			ctx.lineCap = 'round';
			ctx.lineJoin = 'round';
			// L'encre de la marque, en dur : une toile ne lit pas les variables CSS,
			// et un tracé gris se perd à l'impression.
			ctx.strokeStyle = '#1d3fa0';
		},
		[hauteur]
	);

	const position = (e: React.PointerEvent<HTMLCanvasElement>) => {
		const cadre = e.currentTarget.getBoundingClientRect();
		return { x: e.clientX - cadre.left, y: e.clientY - cadre.top };
	};

	const commencer = (e: React.PointerEvent<HTMLCanvasElement>) => {
		const ctx = toile.current?.getContext('2d');
		if (!ctx) return;
		// La capture suit le pointeur hors du cadre : sans elle, un trait se coupe
		// net dès que le doigt déborde, et le gérant croit que ça a bugué.
		e.currentTarget.setPointerCapture(e.pointerId);
		dessine.current = true;
		const { x, y } = position(e);
		ctx.beginPath();
		ctx.moveTo(x, y);
	};

	const tracer = (e: React.PointerEvent<HTMLCanvasElement>) => {
		if (!dessine.current) return;
		const ctx = toile.current?.getContext('2d');
		if (!ctx) return;
		const { x, y } = position(e);
		ctx.lineTo(x, y);
		ctx.stroke();
		if (vide) setVide(false);
	};

	const finir = () => {
		if (!dessine.current) return;
		dessine.current = false;
		const element = toile.current;
		if (!element) return;
		onChange(vide ? null : element.toDataURL('image/png'));
	};

	const effacer = () => {
		const element = toile.current;
		const ctx = element?.getContext('2d');
		if (!element || !ctx) return;
		ctx.clearRect(0, 0, element.width, element.height);
		setVide(true);
		onChange(null);
	};

	return (
		<div className="flex flex-col gap-cladd-3xs">
			<SurfaceCut outline className="rounded-cladd-lg" contentClassName="relative p-0">
				<canvas
					ref={preparer}
					style={{ height: hauteur }}
					className="w-full touch-none rounded-cladd-lg"
					onPointerDown={commencer}
					onPointerMove={tracer}
					onPointerUp={finir}
					onPointerCancel={finir}
					aria-label="Zone de signature manuscrite"
				/>
				{vide ? (
					<span className="pointer-events-none absolute inset-0 flex items-center justify-center text-cladd-2xs text-cladd-fg-softest">
						Signez ici avec votre doigt
					</span>
				) : null}
			</SurfaceCut>

			<Button size="sm" className="self-start" disabled={vide} onClick={effacer}>
				<EraserIcon />
				Effacer
			</Button>
		</div>
	);
}
