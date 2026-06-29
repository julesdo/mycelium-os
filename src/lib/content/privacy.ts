import { LEGAL_CONFIG } from '$lib/config/legal';

export const privacyMarkdown = `# Privacy Policy

**Last Updated: ${LEGAL_CONFIG.effectiveDate}**

---

${LEGAL_CONFIG.companyName} ("**Mycelium**", "**we**", "**us**", or "**our**") operates ${LEGAL_CONFIG.brandName} (the "**Service**"), a cloud-based fleet operating system for businesses. This Privacy Policy explains how we collect, use, disclose, and safeguard personal data in connection with the Service, in compliance with the EU General Data Protection Regulation ("**GDPR**"), the UK General Data Protection Regulation ("**UK GDPR**"), and the French Data Protection Act (*Loi Informatique et Libertés*).

**Please read this policy carefully.** By using the Service, you confirm that you have read and understood this Privacy Policy.

---

## 1. Who We Are and Our Roles

**Mycelium as Controller.** We are the data controller for personal data we collect directly from you as an individual user — including account registration data, billing contact information, and service usage data.

**Mycelium as Processor.** When your organisation (the "**Customer**") uses our Service to manage its fleet and workforce, your organisation is the data controller for personal data relating to its employees, drivers, and vehicles. In that capacity, Mycelium acts as a data processor on behalf of your organisation. Our processing as a processor is governed by a Data Processing Agreement ("**DPA**"), incorporated by reference into our Terms of Service.

If you are an employee or driver whose data appears in Mycelium because your employer uses our Service, please contact your employer for information about how they manage your personal data.

---

## 2. Personal Data We Collect

### 2.1 Account and Organisation Data (Controller)

When an administrator registers an organisation on our Service, we collect:

- **Identity data**: name, professional email address, job title.
- **Organisation data**: company name, SIREN/company registration number, sector, size, country, currency, time zone.
- **Authentication data**: hashed password or OAuth provider token (Google, Microsoft). We never store passwords in plaintext.
- **Billing contact data**: name, email, and payment method details — processed exclusively by Paddle (our Merchant of Record) and not stored by Mycelium.
- **Communication data**: messages sent to our support team.

### 2.2 Fleet and Driver Data (Processor)

When Customers use the Service to manage their fleets, we process on their behalf:

- **Vehicle data**: registration plate, make, model, energy type, category, status, site/location.
- **Driver data**: name, email, driving licence details (category, expiry date), restrictions.
- **Reservation data**: booking dates and times, purpose, vehicle assignments.
- **Financial data**: cost records, mileage expense claims, fuel card imports, invoice files.
- **Maintenance data**: scheduled and completed maintenance records, garage contact information.
- **Incident data**: photographs, descriptions, and documents relating to vehicle incidents.
- **Telematics data** (if the Customer has connected a vehicle via Smartcar): odometer readings, state of charge, GPS location — collected directly from the vehicle with the driver's authorisation.
- **Compliance data**: traffic violation records, licence expiry alerts.

### 2.3 Usage and Technical Data (Controller)

Regardless of plan, we automatically collect:

- **Log data**: IP address, browser type, pages visited, timestamps, referrer URL.
- **Device data**: operating system, screen resolution, language preference.
- **Analytics data**: feature usage events, session duration — collected via PostHog (EU instance) with \`identified_only\` profiling, meaning anonymous visitors are not profiled.
- **Error data**: crash reports and stack traces collected via Sentry.

---

## 3. How We Use Personal Data

| Purpose | Legal Basis (GDPR Art. 6) |
|---|---|
| Providing and maintaining the Service, including account management and feature delivery | Performance of contract (Art. 6(1)(b)) |
| Processing subscription payments via Paddle | Performance of contract (Art. 6(1)(b)) |
| Sending transactional emails (booking confirmations, maintenance alerts, licence expiry reminders) | Performance of contract (Art. 6(1)(b)) |
| Improving the Service through aggregated, anonymised analytics | Legitimate interests (Art. 6(1)(f)) — improving product quality |
| Monitoring Service security, detecting fraud and abuse | Legitimate interests (Art. 6(1)(f)) — protecting our platform and users |
| Complying with legal obligations (tax, accounting, regulatory requests) | Legal obligation (Art. 6(1)(c)) |
| Sending product updates and feature announcements to existing customers | Legitimate interests (Art. 6(1)(f)) — you may opt out at any time |
| Processing personal data on behalf of Customers (fleet/driver data) | Processing necessary for the performance of a contract with the Customer (Art. 6(1)(b)), or as directed by the Customer-controller |

We do **not** use personal data to train AI models. Prompts sent to our AI agents are processed in real time by Anthropic's Claude API under a data processing agreement that prohibits training on customer data.

---

## 4. Third-Party Processors and Sub-Processors

We engage the following trusted third-party processors. All are bound by data processing agreements:

| Processor | Role | Location | Transfer Mechanism |
|---|---|---|---|
| **Convex Inc.** | Database, real-time backend, file storage | United States | SCCs (AWS eu-west-1) |
| **Cloudflare Inc.** | Edge hosting, CDN, Workers runtime | Global (EU PoPs prioritised) | SCCs / Adequacy |
| **Resend Inc.** | Transactional email delivery | United States | SCCs |
| **Paddle.com Market Ltd** | Payment processing, Merchant of Record, tax compliance | United Kingdom | UK GDPR adequacy |
| **Anthropic PBC** | AI language model inference (Claude API) | United States | SCCs — no training on customer data |
| **PostHog Inc.** | Product analytics | European Union (eu.posthog.com) | EU — no transfer |
| **Sentry Inc.** | Error monitoring and crash reporting | United States | SCCs |
| **Smartcar Inc.** | Vehicle telematics (optional, per-vehicle OAuth) | United States | SCCs — only if Customer activates |

When we engage new sub-processors who may process personal data, we will update this list and, where required by your DPA, provide advance notice.

---

## 5. International Data Transfers

Our primary infrastructure is operated in the EU (Ireland) via Convex on AWS eu-west-1 and Cloudflare EU points of presence. Some of our third-party processors are based in the United States. In those cases, transfers are protected by:

- **Standard Contractual Clauses (SCCs)** approved by the European Commission (2021/914), applicable to both EU GDPR and UK GDPR (via the International Data Transfer Agreement, "IDTA").
- Technical safeguards including encryption in transit (TLS 1.3) and at rest (AES-256).

You may request a copy of the applicable transfer mechanism by contacting us at the address below.

---

## 6. Data Retention

| Category | Retention Period |
|---|---|
| Active account data | Duration of the subscription + 12 months after cancellation |
| Financial records (invoices, cost data) | 7 years (French commercial law requirement) |
| Vehicle and driver data | Duration of subscription; deleted upon Customer account deletion request |
| Log and analytics data | 90 days (logs); 24 months (aggregated analytics) |
| Support communications | 3 years from last interaction |
| Telematics snapshots | 30 days rolling window |

Upon account deletion, personal data is permanently erased within 30 days, except where retention is required by applicable law.

---

## 7. Cookies

We use the following types of cookies:

**Strictly necessary (no consent required):**
- Authentication session cookies (Better Auth) — expire when you close your browser or after 30 days if "remember me" is selected.

**Analytics (consent required on marketing pages):**
- PostHog analytics cookies — used to understand feature adoption and improve the product. These cookies are only set after you have given consent via our cookie banner.

We do not use advertising, retargeting, or third-party social media cookies.

You can withdraw your consent to analytics cookies at any time by clicking "Cookie settings" in the footer of our marketing pages. This will not affect the lawfulness of processing before withdrawal.

---

## 8. Your Rights

Under the GDPR (and UK GDPR), you have the following rights in respect of your personal data:

- **Access** (Art. 15): request a copy of the personal data we hold about you.
- **Rectification** (Art. 16): ask us to correct inaccurate or incomplete data.
- **Erasure** (Art. 17): ask us to delete your data where there is no lawful basis to retain it.
- **Restriction** (Art. 18): ask us to suspend processing while a dispute is resolved.
- **Portability** (Art. 20): receive your data in a structured, machine-readable format.
- **Objection** (Art. 21): object to processing based on legitimate interests.
- **Withdraw consent**: where processing is based on consent, withdraw it at any time without affecting prior processing.

**Organisational data:** If you are an employee of a Customer organisation, most requests regarding your fleet/driver data should be directed to your employer (the data controller). We will assist Customers in fulfilling their data subject obligations.

To exercise any rights as an account holder, please contact us at **privacy@mycelium.io**. We will respond within 30 days (or 1 month under UK GDPR). You also have the right to lodge a complaint with your national supervisory authority:

- **UK users**: Information Commissioner's Office (ICO) — [ico.org.uk](https://ico.org.uk)
- **French users**: Commission Nationale de l'Informatique et des Libertés (CNIL) — [cnil.fr](https://cnil.fr)
- **Other EU users**: your national data protection authority.

---

## 9. Security

We implement appropriate technical and organisational security measures, including:

- TLS 1.3 encryption for all data in transit.
- AES-256 encryption for data at rest.
- Role-based access control with multi-tenant data isolation (each organisation's data is logically separated by \`organizationId\`).
- Webhook signatures (HMAC SHA-256) for all outbound integrations.
- API key hashing (bcrypt) and rate limiting (100 req/min per key).

We will notify you and, where required, the relevant supervisory authority of any personal data breach in accordance with GDPR Art. 33–34.

---

## 10. Children

The Service is intended exclusively for business use by adults. We do not knowingly collect personal data from individuals under 18 years of age. If you believe we have inadvertently collected such data, please contact us immediately.

---

## 11. Changes to This Policy

We may update this Privacy Policy from time to time. We will post the revised version on this page with an updated "Last Updated" date. For material changes, we will notify account administrators by email at least 30 days before the changes take effect. Your continued use of the Service after the effective date constitutes acceptance of the updated policy.

---

## 12. Contact

**Data Controller:** ${LEGAL_CONFIG.companyName}, ${LEGAL_CONFIG.address}

**Privacy enquiries and data subject requests:** privacy@mycelium.io

**Legal notices:** `;
