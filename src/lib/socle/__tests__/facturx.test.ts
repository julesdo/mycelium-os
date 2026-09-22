import { describe, expect, it } from 'vitest';
import { lireFacturXDuXml } from '../documents/facturx';

/**
 * CE QUE LE LECTEUR DOIT TIRER D'UN FACTUR-X, ET CE QU'IL DOIT REFUSER DE
 * DEVINER.
 *
 * ⚠️ LES PRÉFIXES NE SONT PAS NORMATIFS. `rsm`, `ram` et `udt` sont d'usage :
 * un producteur conforme peut écrire `a:`, `b:`, `c:`. Un lecteur qui les tient
 * pour acquis marche sur les exemples officiels et casse sur un vrai fichier —
 * c'est le piège que le troisième cas tient fermé.
 */

/** Un MINIMUM réduit à ce que le lecteur doit en tirer. */
const MINIMUM = `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice
	xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
	xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
	xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
	<rsm:ExchangedDocumentContext>
		<ram:GuidelineSpecifiedDocumentContextParameter>
			<ram:ID>urn:factur-x.eu:1p0:minimum</ram:ID>
		</ram:GuidelineSpecifiedDocumentContextParameter>
	</rsm:ExchangedDocumentContext>
	<rsm:ExchangedDocument>
		<ram:ID>FA-2026-0042</ram:ID>
		<ram:TypeCode>380</ram:TypeCode>
		<ram:IssueDateTime><udt:DateTimeString format="102">20260715</udt:DateTimeString></ram:IssueDateTime>
	</rsm:ExchangedDocument>
	<rsm:SupplyChainTradeTransaction>
		<ram:ApplicableHeaderTradeAgreement>
			<ram:SellerTradeParty>
				<ram:Name>Fournitures Durand &amp; Fils</ram:Name>
				<ram:SpecifiedLegalOrganization><ram:ID schemeID="0002">732829320</ram:ID></ram:SpecifiedLegalOrganization>
			</ram:SellerTradeParty>
			<ram:BuyerTradeParty>
				<ram:Name>Imprimerie &lt;Martin&gt;</ram:Name>
				<ram:SpecifiedLegalOrganization><ram:ID schemeID="0002">77788899100018</ram:ID></ram:SpecifiedLegalOrganization>
			</ram:BuyerTradeParty>
		</ram:ApplicableHeaderTradeAgreement>
		<ram:ApplicableHeaderTradeDelivery/>
		<ram:ApplicableHeaderTradeSettlement>
			<ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>
			<ram:SpecifiedTradeSettlementHeaderMonetarySummation>
				<ram:GrandTotalAmount>1200.00</ram:GrandTotalAmount>
				<ram:DuePayableAmount>900.00</ram:DuePayableAmount>
				<ram:TotalPrepaidAmount>300.00</ram:TotalPrepaidAmount>
			</ram:SpecifiedTradeSettlementHeaderMonetarySummation>
		</ram:ApplicableHeaderTradeSettlement>
	</rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;

/**
 * Le même, avec l'échéance, des préfixes non conventionnels, un commentaire et
 * du CDATA.
 *
 * ⚠️ LES DÉCLARATIONS SE RENOMMENT AVANT LES USAGES, sans quoi le document
 * déclare `rsm` et emploie `a` : il serait alors invalide, et le faire passer
 * prouverait seulement que le lecteur devine. C'est exactement la faute que ce
 * cas est censé attraper, retournée contre son propre fixture.
 */
const PREFIXES_EXOTIQUES = MINIMUM.replace(/xmlns:rsm=/g, 'xmlns:a=')
	.replace(/xmlns:ram=/g, 'xmlns:b=')
	.replace(/xmlns:udt=/g, 'xmlns:c=')
	.replace(/rsm:/g, 'a:')
	.replace(/ram:/g, 'b:')
	.replace(/udt:/g, 'c:')
	.replace(
		'<b:InvoiceCurrencyCode>EUR</b:InvoiceCurrencyCode>',
		`<!-- devise --><b:InvoiceCurrencyCode><![CDATA[EUR]]></b:InvoiceCurrencyCode>
		<b:SpecifiedTradePaymentTerms><b:DueDateDateTime><c:DateTimeString format="102">20260814</c:DateTimeString></b:DueDateDateTime></b:SpecifiedTradePaymentTerms>`
	);

describe('lireFacturXDuXml', () => {
	it('lit un profil MINIMUM, entités comprises', () => {
		const lu = lireFacturXDuXml(MINIMUM);
		expect(lu).not.toBeNull();
		expect(lu?.profil).toBe('urn:factur-x.eu:1p0:minimum');
		expect(lu?.numero).toBe('FA-2026-0042');
		expect(lu?.typeCode).toBe('380');
		expect(lu?.dateEmission).toBe('20260715');
		expect(lu?.formatDateEmission).toBe('102');
		expect(lu?.devise).toBe('EUR');
		expect(lu?.totalTTC).toBe('1200.00');
		expect(lu?.netAPayer).toBe('900.00');
		expect(lu?.acompte).toBe('300.00');
		expect(lu?.vendeurNom).toBe('Fournitures Durand & Fils');
		expect(lu?.vendeurIdLegal).toBe('732829320');
		expect(lu?.acheteurNom).toBe('Imprimerie <Martin>');
		expect(lu?.acheteurIdLegal).toBe('77788899100018');
	});

	it('n’a pas d’échéance en MINIMUM, et le dit par l’absence', () => {
		expect(lireFacturXDuXml(MINIMUM)?.dateEcheance).toBeUndefined();
	});

	it('résout les préfixes par URI, pas par convention, et traverse commentaires et CDATA', () => {
		const lu = lireFacturXDuXml(PREFIXES_EXOTIQUES);
		expect(lu?.numero).toBe('FA-2026-0042');
		expect(lu?.devise).toBe('EUR');
		expect(lu?.dateEcheance).toBe('20260814');
		expect(lu?.formatDateEcheance).toBe('102');
	});

	it('lit l’échéance sous SpecifiedTradePaymentTerms, et rien d’autre', () => {
		// Le chemin faux qui circule sur le web : SpecifiedTradeSettlementPaymentMeans.
		const faux = MINIMUM.replace(
			'<ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>',
			`<ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>
			<ram:SpecifiedTradeSettlementPaymentMeans><ram:DueDateDateTime><udt:DateTimeString format="102">20260814</udt:DateTimeString></ram:DueDateDateTime></ram:SpecifiedTradeSettlementPaymentMeans>`
		);
		expect(lireFacturXDuXml(faux)?.dateEcheance).toBeUndefined();
	});

	it('ne confond pas deux éléments de même nom portés par des chemins différents', () => {
		// `ram:ID` apparaît sur une dizaine d'éléments et `ram:Name` sur les parties
		// comme sur les produits : c'est le CHEMIN qui identifie, pas le nom.
		expect(lireFacturXDuXml(MINIMUM)?.vendeurIdLegal).not.toBe('FA-2026-0042');
		expect(lireFacturXDuXml(MINIMUM)?.numero).toBe('FA-2026-0042');
	});

	it('écarte un document qui n’est pas un CII (ZUGFeRD 1.0)', () => {
		const zugferd1 = `<rsm:CrossIndustryDocument xmlns:rsm="urn:ferd:CrossIndustryDocument:invoice:1p0"><a/></rsm:CrossIndustryDocument>`;
		expect(lireFacturXDuXml(zugferd1)).toBeNull();
	});

	it('écarte un XML tronqué plutôt que d’en tirer des miettes', () => {
		expect(lireFacturXDuXml(MINIMUM.slice(0, 400))).toBeNull();
	});
});
