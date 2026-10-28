/**
 * LES PREUVES, CENTRÉES (maquette V26) : les logiciels d'où arrivent les factures, en bande qui
 * défile, et les sources que chaque calcul cite. Les logos sont ceux du site (`public/connecteurs/`),
 * les mêmes fichiers que la maquette, octet pour octet.
 *
 * La maquette citait « BODACC » ; le site dit le journal officiel des entreprises, le mot de tous les
 * jours (`lexique.test.ts`).
 */
export function BandeDesPreuves() {
	return (
		<section className="preuves" aria-label="Ce sur quoi Letikette s’appuie">
			<div className="enveloppe">
				<p className="legende-preuves">
					Vos factures arrivent seules depuis le logiciel que vous utilisez déjà
				</p>
				<div className="defile">
					<div className="defile-piste">
						<span className="logo">
							<img src="/connecteurs/logo-pennylane.svg" alt="" />
							Pennylane
						</span>{' '}
						<span className="logo">
							<img src="/connecteurs/logo-quickbooks.svg" alt="" />
							QuickBooks
						</span>{' '}
						<span className="logo">
							<img src="/connecteurs/qonto-symbole-128.webp" alt="" />
							Qonto
						</span>{' '}
						<span className="logo">
							<img src="/connecteurs/logo-xero.svg" alt="" />
							Xero
						</span>{' '}
						<span className="logo">
							<img src="/connecteurs/logo-sellsy.svg" alt="" />
							Sellsy
						</span>{' '}
						<span className="logo">
							<img src="/connecteurs/logo-stripe.svg" alt="" />
							Stripe
						</span>{' '}
						<span className="logo">
							<img src="/connecteurs/logo-zoho-books.svg" alt="" />
							Zoho Books
						</span>{' '}
						<span className="logo" aria-hidden="true">
							<img src="/connecteurs/logo-pennylane.svg" alt="" />
							Pennylane
						</span>{' '}
						<span className="logo" aria-hidden="true">
							<img src="/connecteurs/logo-quickbooks.svg" alt="" />
							QuickBooks
						</span>{' '}
						<span className="logo" aria-hidden="true">
							<img src="/connecteurs/qonto-symbole-128.webp" alt="" />
							Qonto
						</span>{' '}
						<span className="logo" aria-hidden="true">
							<img src="/connecteurs/logo-xero.svg" alt="" />
							Xero
						</span>{' '}
						<span className="logo" aria-hidden="true">
							<img src="/connecteurs/logo-sellsy.svg" alt="" />
							Sellsy
						</span>{' '}
						<span className="logo" aria-hidden="true">
							<img src="/connecteurs/logo-stripe.svg" alt="" />
							Stripe
						</span>{' '}
						<span className="logo" aria-hidden="true">
							<img src="/connecteurs/logo-zoho-books.svg" alt="" />
							Zoho Books
						</span>
					</div>
				</div>
				<p className="sources">
					Chaque calcul cite sa source : <b>Code de commerce</b>
					<i>·</i>
					<b>Taux de la Banque centrale européenne</b>
					<i>·</i>
					<b>Journal officiel des entreprises</b>
					<i>·</i>
					<b>Registre du commerce</b>
				</p>
			</div>
		</section>
	);
}
