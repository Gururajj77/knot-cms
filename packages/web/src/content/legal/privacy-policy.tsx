import {
    APP_URL,
    COMPANY_NAME,
    SITE_URL,
    SUPPORT_EMAIL,
} from "../../config/site"

/** Keep in sync with knotcms-website/src/pages/privacy-policy.astro */
export function PrivacyPolicyContent() {
    return (
        <>
            <p>
                This Privacy Policy describes how {COMPANY_NAME} (&quot;we&quot;, &quot;us&quot;,
                &quot;our&quot;), operated from India, collects, uses, stores, and shares personal
                data when you visit <a href={SITE_URL}>{SITE_URL}</a>, use{" "}
                <a href={APP_URL}>{APP_URL}</a>, or otherwise interact with our Notion-to-Framer CMS
                sync service (the &quot;Service&quot;).
            </p>

            <p>
                We process personal data in accordance with the Digital Personal Data Protection Act,
                2023 (&quot;DPDP Act&quot;), the Information Technology Act, 2000, and applicable
                rules thereunder, including the Information Technology (Reasonable Security Practices
                and Procedures and Sensitive Personal Data or Information) Rules, 2011, where
                applicable.
            </p>

            <h2>1. Data fiduciary and contact</h2>
            <p>
                For the purposes of the DPDP Act, {COMPANY_NAME} acts as the{" "}
                <strong>Data Fiduciary</strong> for personal data collected through the Service. For
                privacy-related requests or grievances, contact us at{" "}
                <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
            </p>

            <h2>2. Personal data we collect</h2>
            <p>Depending on how you use the Service, we may collect the following categories of data:</p>

            <h3>Account and identity data</h3>
            <ul>
                <li>Email address and name from Google Sign-In</li>
                <li>Google account identifier used to authenticate your session</li>
                <li>Subscription status, plan type, and billing-related identifiers</li>
            </ul>

            <h3>Service and configuration data</h3>
            <ul>
                <li>Notion workspace connection tokens (stored encrypted) and selected database metadata</li>
                <li>Field mappings between Notion properties and Framer CMS fields</li>
                <li>
                    Framer project identifiers, collection names, and Server API credentials (stored
                    encrypted)
                </li>
                <li>Sync logs, project status, error messages, and usage counters (e.g. sync quota)</li>
            </ul>

            <h3>Technical and usage data</h3>
            <ul>
                <li>IP address, browser type, device information, and approximate location derived from IP</li>
                <li>Session cookies and authentication tokens</li>
                <li>
                    Server logs, timestamps, and diagnostic information needed to operate and secure the
                    Service
                </li>
            </ul>

            <h3>Payment data</h3>
            <p>
                Paid subscriptions are processed by our Merchant of Record (<strong>Polar</strong> or{" "}
                <strong>Dodo Payments</strong>). We do not store full payment card numbers. The processor
                may collect billing name, email, payment method details, transaction history, and tax
                information as needed to process payments and issue invoices.
            </p>

            <h2>3. How we use your data</h2>
            <p>We use personal data to:</p>
            <ul>
                <li>Provide, operate, and maintain the Service, including Notion-to-Framer sync</li>
                <li>Authenticate you and manage your account and entitlements</li>
                <li>Process subscriptions, invoices, and billing enquiries</li>
                <li>Send service-related communications (e.g. sync failures, account notices)</li>
                <li>Monitor usage, prevent abuse, enforce rate limits, and improve reliability</li>
                <li>Comply with legal obligations and respond to lawful requests</li>
            </ul>
            <p>
                We do not sell your personal data. We do not use your Notion content or Framer CMS data
                for advertising or unrelated profiling.
            </p>

            <h2>4. Legal basis and consent</h2>
            <p>
                Under the DPDP Act, we process personal data based on your consent (for example, when
                you sign in with Google or connect Notion), performance of a contract (providing the
                Service you subscribed to), and our legitimate interests in securing and improving the
                Service, balanced against your rights.
            </p>
            <p>
                You may withdraw consent for optional processing where applicable by contacting us.
                Withdrawal may limit certain features (for example, disconnecting Notion will stop
                automated sync).
            </p>

            <h2>5. Third-party services and processors</h2>
            <p>We use trusted third parties to operate the Service, including:</p>
            <ul>
                <li>
                    <strong>Google</strong> — user authentication (Google OAuth)
                </li>
                <li>
                    <strong>Notion</strong> — source content and webhook notifications
                </li>
                <li>
                    <strong>Framer</strong> — destination CMS via the Framer Server API
                </li>
                <li>
                    <strong>Polar / Dodo Payments</strong> — subscription billing and customer portal
                </li>
                <li>
                    <strong>Cloudflare</strong> — hosting, edge compute, and database infrastructure
                </li>
            </ul>
            <p>
                These providers act as data processors or independent controllers for their respective
                services. Their handling of data is governed by their own privacy policies. Where
                required, we enter into appropriate data processing arrangements with processors
                handling personal data on our behalf.
            </p>

            <h2>6. Cross-border transfers</h2>
            <p>
                Your data may be processed on servers located outside India (for example, on
                Cloudflare&apos;s global network or on infrastructure used by Notion, Framer, Google, or our
                billing processor). Where personal data is transferred outside India, we take steps
                reasonably required under applicable law, including ensuring that recipients offer
                adequate protection or that permitted transfer mechanisms are in place.
            </p>

            <h2>7. Data retention</h2>
            <p>
                We retain personal data only for as long as necessary to provide the Service, meet legal
                and accounting obligations, resolve disputes, and enforce our agreements. When you delete
                a project or close your account, we delete or anonymise associated data within a
                reasonable period, except where retention is required by law (for example, tax or billing
                records).
            </p>

            <h2>8. Security</h2>
            <p>
                We implement reasonable technical and organisational safeguards, including encryption of
                sensitive credentials at rest, signed session cookies, access controls, and secure
                transport (HTTPS). No method of transmission or storage is completely secure; we cannot
                guarantee absolute security.
            </p>

            <h2>9. Your rights under Indian law</h2>
            <p>Subject to applicable law, including the DPDP Act, you may have the right to:</p>
            <ul>
                <li>Access personal data we hold about you</li>
                <li>Request correction of inaccurate or incomplete data</li>
                <li>Request erasure of personal data, subject to legal exceptions</li>
                <li>Withdraw consent for processing that relies on consent</li>
                <li>
                    Nominate another individual to exercise your rights in the event of death or
                    incapacity
                </li>
                <li>
                    Lodge a grievance with us, and where applicable, with the Data Protection Board of
                    India
                </li>
            </ul>
            <p>
                To exercise these rights, email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
                We may need to verify your identity before responding.
            </p>

            <h2>10. Children&apos;s data</h2>
            <p>
                The Service is intended for users aged 18 and above. We do not knowingly collect personal
                data from children. If you believe a child has provided us personal data, contact us and
                we will take steps to delete it.
            </p>

            <h2>11. Cookies</h2>
            <p>
                We use essential cookies and similar technologies to keep you signed in and operate the
                Service. We do not use non-essential advertising cookies on the marketing site. You can
                control cookies through your browser settings; disabling essential cookies may prevent
                you from using the app.
            </p>

            <h2>12. Changes to this policy</h2>
            <p>
                We may update this Privacy Policy from time to time. The &quot;Last updated&quot; date at
                the top will reflect the latest version. Material changes will be communicated via the
                Service or by email where appropriate. Continued use after changes constitutes acceptance
                of the updated policy.
            </p>

            <h2>13. Grievance officer</h2>
            <p>
                In accordance with applicable Indian law, you may contact our grievance officer for privacy
                concerns:
            </p>
            <ul>
                <li>
                    Email: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
                </li>
                <li>
                    Response time: we aim to acknowledge grievances within 7 business days and resolve
                    them within 30 days, or as required by law.
                </li>
            </ul>
        </>
    )
}
