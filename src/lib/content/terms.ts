import { LEGAL_CONFIG } from '$lib/config/legal';

export const termsMarkdown = `# Terms of Service

**Last Updated: ${LEGAL_CONFIG.effectiveDate}**

---

These Terms of Service ("**Terms**") govern your access to and use of ${LEGAL_CONFIG.brandName} (the "**Service**"), operated by ${LEGAL_CONFIG.companyName}, a French simplified joint-stock company (*société par actions simplifiée*) registered in the Paris Trade and Companies Register ("**Mycelium**", "**we**", "**us**", or "**our**").

By creating an account, clicking "I agree", or otherwise accessing the Service, the organisation you represent ("**Customer**", "**you**", or "**your**") agrees to be bound by these Terms. If you are accepting these Terms on behalf of a company, you represent that you have the authority to bind that company. If you do not agree, do not use the Service.

We reserve the right to modify these Terms at any time. We will provide at least **30 days' notice** of material changes via email to the account administrator. Your continued use of the Service after the effective date of any changes constitutes acceptance.

---

## 1. The Service

### 1.1 Description

Mycelium Fleet OS is a cloud-based fleet operating system for small and mid-sized businesses, providing:

- Fleet management: vehicle catalogue, status tracking, CSV import.
- Reservation management: booking workflow, conflict detection, calendar.
- AI agents: Concierge (employee-facing), Manager Assistant (CFO/HR-facing), Fleet Optimiser, Compliance Officer, and related agents, powered by the Anthropic Claude API.
- Financial tracking: cost management, mileage expense claims (indemnités kilométriques), fuel card import.
- Driver management: licence compliance, restrictions, training records.
- Incident and violation management.
- Maintenance scheduling and alerting.
- Integrations: Xero, QuickBooks, Odoo, Smartcar, Google Calendar, Outlook.
- Sustainability reporting: ESRS E1 / CSRD dashboards.
- UK Benefit-in-Kind (BiK) calculation.

### 1.2 Feature Availability

Features available to you depend on the plan your organisation has subscribed to. Mycelium reserves the right to add, modify, or discontinue features with reasonable notice. We will not remove core features of a paid plan without offering a reasonable alternative or a pro-rata refund for the unused period.

### 1.3 Service Level

We target 99.5% monthly uptime for the Service. Scheduled maintenance windows will be communicated at least 48 hours in advance. No formal SLA is offered on the Free or Essential plans; Business and Enterprise customers may request a separate SLA addendum.

---

## 2. Accounts and Organisations

### 2.1 Registration

You must provide accurate, complete, and current registration information. The person completing registration represents and warrants that they have authority to bind the organisation to these Terms.

### 2.2 Account Security

You are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account. You must notify us immediately of any suspected unauthorised access at legal@mycelium.io.

### 2.3 Multi-Tenancy

The Service uses strict multi-tenant data isolation. Each organisation's data is logically separated by a unique \`organizationId\`. You must not attempt to access data of another organisation.

### 2.4 Inviting Members

Account administrators may invite employees to join their organisation on the Service. By inviting a user, you confirm that you have a legitimate basis (e.g. employment relationship) to process that individual's personal data via the Service.

---

## 3. Subscription Plans and Payment

### 3.1 Plans

We currently offer the following plans:

| Plan | Included Conductors | Monthly Price (excl. VAT) |
|---|---|---|
| **Free** | Up to 10 vehicles | £0 / €0 |
| **Essential** | 50 | £420 / €490 |
| **Professional** | 150 | £750 / €890 |
| **Business** | 300 | £1,250 / €1,490 |
| **Enterprise** | Unlimited | Quotation |

Prices are exclusive of applicable taxes (VAT, UK sales tax). Overage is charged at £6–£8 / €5–€8 per additional conductor per month, depending on plan.

### 3.2 Payment Processing — Paddle as Merchant of Record

All payments for paid plans are processed by **Paddle.com Market Ltd** ("**Paddle**"), our Merchant of Record. When you subscribe to a paid plan:

- Your purchase contract for billing and tax purposes is between **you and Paddle**, not directly with Mycelium.
- Paddle handles all payment collection, VAT/GST calculation, invoicing, and tax remittance in your jurisdiction.
- Paddle's terms of service and privacy policy apply to payment processing.
- Mycelium provisions and manages your access to the Service features.

Paddle may use Stripe or other payment networks to process card transactions. Mycelium never stores or has access to your full payment card details.

### 3.3 Billing Cycle

Subscriptions are billed monthly in advance. The billing cycle starts on the date you first subscribe to a paid plan.

### 3.4 Upgrades and Downgrades

You may upgrade your plan at any time; the upgrade is effective immediately and prorated. Downgrades take effect at the start of the next billing cycle.

### 3.5 Cancellation

You may cancel your subscription at any time via the billing portal (Paddle's Customer Portal). Upon cancellation, your subscription continues until the end of the current billing period. We do not offer prorated refunds for partial months, except where required by applicable law.

### 3.6 Free Plan Limitations

The Free plan provides permanent, time-unlimited access to core features (fleet management, reservations, maintenance, notifications) for up to **10 vehicles**. No credit card is required. Mycelium reserves the right to modify Free plan limitations with 60 days' notice.

### 3.7 Failed Payments

If a payment fails, Paddle will retry according to their retry schedule. Access to paid features may be suspended after 10 days of failed payment. We will notify you by email before suspension.

---

## 4. Acceptable Use

You agree not to use the Service to:

- Violate any applicable law or regulation.
- Infringe the intellectual property rights of Mycelium or any third party.
- Transmit malicious code, viruses, or perform denial-of-service attacks.
- Scrape, reverse-engineer, or attempt to extract the Service's source code or underlying models.
- Resell, sublicense, or offer the Service to third parties without our express written consent.
- Process personal data in violation of applicable data protection law.
- Input data that is false, misleading, or fraudulent.

Mycelium reserves the right to suspend or terminate accounts that violate these restrictions, with or without prior notice depending on severity.

---

## 5. AI Features and Acceptable Use of AI Agents

### 5.1 Nature of AI Output

Our AI agents (Concierge, Manager Assistant, Fleet Optimiser, Compliance Officer, and others) are powered by the Anthropic Claude API. AI-generated outputs are provided for informational and operational assistance purposes only. They do not constitute legal, financial, tax, or regulatory advice.

### 5.2 No Training on Customer Data

Prompts sent to our AI agents are processed in real time and are not used to train Anthropic's models or any Mycelium models. This is enforced via our data processing agreement with Anthropic.

### 5.3 Your Responsibility

You are responsible for reviewing AI-generated content before acting on it. Mycelium is not liable for decisions made based solely on AI output, including fleet optimisation recommendations, compliance alerts, or financial projections.

---

## 6. Data Processing and GDPR

### 6.1 Data Processing Agreement

By accepting these Terms, you also agree to our **Data Processing Agreement (DPA)**, which is incorporated herein by reference and available at [mycelium.io/legal/dpa]. The DPA governs Mycelium's processing of personal data on your behalf as a data processor, including details of sub-processors, technical and organisational measures, and international transfer mechanisms.

### 6.2 Your Obligations as Controller

As the data controller for your employees' and drivers' personal data, you are responsible for:

- Having a lawful basis for processing that personal data via the Service.
- Providing appropriate data protection notices to individuals whose data you input.
- Responding to data subject requests (we will assist you as required by the DPA).
- Ensuring that any personal data you input is accurate and not excessive.

### 6.3 UK GDPR

For UK-based Customers, all references to the GDPR in these Terms include the UK GDPR. The applicable supervisory authority is the Information Commissioner's Office (ICO).

---

## 7. Confidentiality

Each party agrees to keep the other's confidential information strictly confidential and not to disclose it to any third party without prior written consent, except: (i) to employees or contractors who need to know it for the purposes of these Terms; (ii) as required by law or regulation; or (iii) with the other party's prior written consent. This obligation survives termination of these Terms for a period of 3 years.

"Confidential information" includes, but is not limited to, any non-public technical, business, financial, or operational information disclosed in connection with the Service.

---

## 8. Intellectual Property

### 8.1 Mycelium's IP

The Service, including its software, algorithms, AI agent architectures, user interface, branding, and documentation, is owned by Mycelium and protected by French, EU, and international intellectual property law. These Terms grant you a limited, non-exclusive, non-transferable, revocable licence to use the Service during your subscription term solely for your internal business operations.

### 8.2 Your Data

You retain full ownership of all data you input into the Service ("**Customer Data**"). You grant Mycelium a limited licence to process Customer Data solely to provide and improve the Service. We do not use Customer Data for any other purpose.

### 8.3 Feedback

If you provide us with feedback or suggestions about the Service, you grant Mycelium a perpetual, royalty-free licence to use that feedback without any obligation of compensation or attribution.

---

## 9. Third-Party Integrations

The Service integrates with third-party platforms including Xero, QuickBooks, Odoo, Smartcar, Google Calendar, and Microsoft Outlook. Your use of these integrations is also subject to the relevant third party's terms. Mycelium is not responsible for the availability, accuracy, or policies of third-party services.

---

## 10. Warranties and Disclaimers

**Mycelium warrants** that the Service will perform materially in accordance with its documentation during your subscription term.

**Except as expressly stated above**, the Service is provided "**as is**" and "**as available**". To the maximum extent permitted by applicable law, Mycelium disclaims all implied warranties, including fitness for a particular purpose, merchantability, and non-infringement. We do not warrant that the Service will be uninterrupted, error-free, or completely secure.

Certain jurisdictions do not permit the exclusion of implied warranties. If you are a consumer (which is unlikely for a B2B fleet management platform), statutory rights under your local law remain unaffected.

---

## 11. Limitation of Liability

To the maximum extent permitted by applicable law:

1. **Indirect losses**: Neither party will be liable for any indirect, incidental, consequential, punitive, or special damages, including loss of profits, goodwill, data, or business opportunity, even if advised of the possibility of such losses.

2. **Aggregate cap**: Mycelium's total aggregate liability to you arising out of or in connection with these Terms, whether in contract, tort (including negligence), or otherwise, shall not exceed the **total fees paid by you to Mycelium (or Paddle on Mycelium's behalf) in the 12 months preceding the claim**.

3. **Uncapped losses**: Nothing in these Terms limits either party's liability for: (i) death or personal injury caused by negligence; (ii) fraud or fraudulent misrepresentation; (iii) any liability that cannot be excluded or limited by applicable law.

---

## 12. Indemnification

You agree to indemnify, defend, and hold harmless Mycelium and its officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses (including reasonable legal fees) arising from: (i) your violation of these Terms; (ii) your violation of applicable law; (iii) your processing of personal data in a manner that violates data protection law; or (iv) content or data you submit that infringes third-party rights.

---

## 13. Term and Termination

### 13.1 Term

These Terms begin on the date you first create an account and continue until terminated.

### 13.2 Termination by You

You may terminate at any time by cancelling your subscription and deleting your account. Termination does not entitle you to a refund except as required by applicable law.

### 13.3 Termination by Mycelium

We may terminate or suspend your account immediately if you: (i) materially breach these Terms and fail to cure within 14 days of notice; (ii) violate the Acceptable Use Policy; (iii) become insolvent or subject to insolvency proceedings; or (iv) pose a security risk to the Service or other customers.

### 13.4 Effect of Termination

Upon termination, your licence to use the Service ceases. You may request an export of your Customer Data within 30 days of termination. After 30 days, Customer Data will be deleted in accordance with our Privacy Policy.

---

## 14. Governing Law and Dispute Resolution

These Terms are governed by the **laws of France**, without regard to its conflict-of-law provisions.

**Dispute resolution**: The parties will first attempt to resolve any dispute in good faith within 30 days of written notice. If unresolved, disputes shall be submitted to the exclusive jurisdiction of the **courts of Paris, France**.

**EU Consumer carve-out**: If you are a consumer habitually resident in the EU, you may also bring proceedings in your country of residence, and the mandatory consumer protection laws of your country apply.

**UK carve-out**: For UK Customers, mandatory provisions of UK law, including the Consumer Rights Act 2015, are not excluded by this clause.

---

## 15. General

**Entire Agreement.** These Terms, together with the Privacy Policy, DPA, and any plan-specific addenda, constitute the entire agreement between you and Mycelium regarding the Service.

**Severability.** If any provision is found invalid or unenforceable, the remaining provisions continue in full effect.

**No Waiver.** Failure to enforce any right does not constitute a waiver of that right.

**Assignment.** You may not assign your rights under these Terms without our prior written consent. Mycelium may assign these Terms in connection with a merger, acquisition, or sale of substantially all of its assets.

**Force Majeure.** Neither party is liable for delays caused by circumstances beyond their reasonable control, including natural disasters, internet outages, or government actions.

**Language.** The English version of these Terms is the governing version. Any translations are provided for convenience only.

**Contact.** For legal notices: `;
