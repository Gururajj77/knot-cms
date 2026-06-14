import {
    APP_URL,
    COMPANY_NAME,
    PRICE_PER_PROJECT_MONTHLY_USD,
    SITE_URL,
    SUPPORT_EMAIL,
} from "../../config/site"

/** Keep in sync with knotcms-website/src/pages/terms.astro (includes refund policy). */
export function TermsContent() {
    return (
        <>
            <p>
                These Terms &amp; Conditions (&quot;Terms&quot;) govern your access to and use of{" "}
                {COMPANY_NAME} (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;), including the website
                at <a href={SITE_URL}>{SITE_URL}</a>, the application at{" "}
                <a href={APP_URL}>{APP_URL}</a>, and related services that sync Notion content to Framer
                CMS (collectively, the &quot;Service&quot;). By creating an account or using the Service,
                you agree to these Terms.
            </p>

            <p>
                If you do not agree, do not use the Service. These Terms are subject to the laws of India,
                including the Indian Contract Act, 1872, the Consumer Protection Act, 2019, and applicable
                information technology laws.
            </p>

            <h2>1. Eligibility</h2>
            <p>
                You must be at least 18 years old and capable of entering a binding contract under Indian
                law. If you use the Service on behalf of a company or agency, you represent that you have
                authority to bind that organisation to these Terms.
            </p>

            <h2>2. The Service</h2>
            <p>
                {COMPANY_NAME} provides a software-as-a-service tool that connects Notion databases to
                Framer CMS collections, including optional automated sync and publishing features. The
                Service depends on third-party platforms (Notion, Framer, Google, and billing providers).
                We are not affiliated with or endorsed by Notion Labs or Framer unless expressly stated.
            </p>
            <p>
                We may modify, suspend, or discontinue features with reasonable notice where practicable.
                Beta or experimental features may be offered &quot;as is&quot; without warranties.
            </p>

            <h2>3. Accounts</h2>
            <ul>
                <li>
                    You sign in using Google OAuth. You are responsible for maintaining access to that
                    account.
                </li>
                <li>
                    You must provide accurate information and keep credentials for connected services
                    secure.
                </li>
                <li>
                    You are responsible for all activity under your account, including actions by team
                    members you authorise.
                </li>
                <li>
                    Notify us promptly at <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> if you
                    suspect unauthorised access.
                </li>
            </ul>

            <h2>4. Plans, pricing, and billing</h2>
            <h3>4.1 Free Basic plan</h3>
            <p>
                The Basic plan includes limited features (for example, one project and a limited number of
                manual syncs) at no charge. We may change free-tier limits with notice on the website or in
                the app.
            </p>

            <h3>4.2 Paid Project plan</h3>
            <p>
                Paid subscriptions are billed <strong>per Framer project slot</strong> at{" "}
                <strong>${PRICE_PER_PROJECT_MONTHLY_USD} USD per project per month</strong> (or equivalent
                in your checkout currency), unless otherwise stated at purchase. You may purchase multiple
                project slots (e.g. 1, 10, or more) and adjust quantity through the billing portal.
            </p>
            <p>
                Payments are processed by <strong>Polar</strong>, our Merchant of Record. Polar is
                responsible for checkout, tax calculation where applicable, invoicing, and payment
                collection. By subscribing, you also agree to Polar&apos;s applicable terms and privacy
                policy.
            </p>
            <p>
                SaaS services supplied from India to customers may be subject to GST under the Online
                Information Database Access and Retrieval (OIDAR) framework at the rate applicable from time
                to time (currently 18% IGST for eligible cross-border B2C supplies, where applicable).
                Taxes shown at checkout are determined by Polar based on your location and transaction
                details.
            </p>

            <h3>4.3 Renewals and cancellation</h3>
            <ul>
                <li>
                    Paid subscriptions renew automatically each billing period unless cancelled before
                    renewal.
                </li>
                <li>
                    You may cancel or reduce quantity at any time through the Polar customer portal linked
                    from the app.
                </li>
                <li>
                    Cancellation stops future charges; it does not retroactively refund amounts already paid
                    unless covered by our Refund Policy below.
                </li>
                <li>
                    On cancellation or expiry, paid features (such as auto-sync) may be disabled; your
                    account may revert to Basic limits.
                </li>
            </ul>

            <h2>5. Acceptable use</h2>
            <p>You agree not to:</p>
            <ul>
                <li>
                    Use the Service for unlawful purposes or in violation of third-party terms (Notion,
                    Framer, Google)
                </li>
                <li>Attempt to bypass rate limits, quotas, or access controls</li>
                <li>Reverse engineer, scrape, or overload the Service except as permitted by law</li>
                <li>
                    Upload or sync malicious code, infringing content, or data you do not have rights to
                    use
                </li>
                <li>Resell or sublicense the Service without our written consent</li>
            </ul>
            <p>
                We may suspend or terminate access for violations, abuse, non-payment, or risk to the
                Service or other users.
            </p>

            <h2>6. Your content and integrations</h2>
            <p>
                You retain ownership of content in your Notion workspaces and Framer projects. You grant us
                a limited licence to access, process, and transmit that content solely to provide the
                Service (for example, to read Notion rows and write Framer CMS items).
            </p>
            <p>
                You represent that you have all rights and consents needed to connect Notion and Framer
                accounts and to sync content between them, including any client or end-user data.
            </p>

            <h2>7. Intellectual property</h2>
            <p>
                The Service, including software, branding, documentation, and design, is owned by{" "}
                {COMPANY_NAME} or its licensors. These Terms do not grant you any rights to our trademarks
                or code except the limited right to use the Service as intended.
            </p>

            <h2>8. Disclaimers</h2>
            <p>
                The Service is provided on an <strong>&quot;as is&quot;</strong> and{" "}
                <strong>&quot;as available&quot;</strong> basis to the fullest extent permitted by law. We
                do not warrant uninterrupted, error-free, or fully accurate sync. Notion, Framer, or network
                outages may affect availability.
            </p>
            <p>
                To the extent permitted under the Consumer Protection Act, 2019 and other applicable law,
                disclaimers apply except where liability cannot be excluded for consumer transactions.
            </p>

            <h2>9. Limitation of liability</h2>
            <p>
                To the maximum extent permitted by Indian law, {COMPANY_NAME} and its operators shall not
                be liable for indirect, incidental, special, consequential, or punitive damages, or for loss
                of profits, data, goodwill, or business opportunity arising from use of the Service.
            </p>
            <p>
                Our aggregate liability for any claim relating to the Service shall not exceed the greater of
                (a) the amount you paid us for the Service in the twelve (12) months before the claim, or (b)
                INR 5,000.
            </p>
            <p>
                Nothing in these Terms limits liability that cannot be limited under applicable law,
                including liability for fraud or wilful misconduct.
            </p>

            <h2>10. Indemnity</h2>
            <p>
                You agree to indemnify and hold harmless {COMPANY_NAME} from claims, damages, and expenses
                (including reasonable legal fees) arising from your content, misuse of the Service, or
                breach of these Terms or third-party rights.
            </p>

            <h2 id="refund-policy">11. Refund and cancellation policy</h2>
            <p>
                This section explains when refunds may be issued for paid subscriptions. Please read it
                before purchasing.
            </p>

            <h3>11.1 General principle</h3>
            <p>
                {COMPANY_NAME} sells digital software subscriptions. Except as stated below,{" "}
                <strong>all fees are non-refundable</strong> once a billing period has started, including
                when you cancel mid-cycle or stop using the Service. This approach is common among SaaS
                products and is permitted under Indian law for digital services, subject to your statutory
                rights under the Consumer Protection Act, 2019.
            </p>

            <h3>11.2 Free trial and Basic plan</h3>
            <p>
                The Basic plan is free. No payment is required and no refund applies. We encourage you to
                evaluate the Service on Basic before subscribing to a paid plan.
            </p>

            <h3>11.3 Refund eligibility (paid plans)</h3>
            <p>
                We may approve a <strong>full or partial refund</strong> at our discretion in the following
                cases:
            </p>
            <ul>
                <li>
                    <strong>Duplicate or erroneous charge</strong> — you were billed twice or charged an
                    incorrect amount due to a technical or billing error.
                </li>
                <li>
                    <strong>Service not delivered</strong> — a paid feature was entirely unavailable for a
                    continuous period of 72 hours or more due to a fault on our side (excluding third-party
                    outages of Notion, Framer, Google, or payment networks).
                </li>
                <li>
                    <strong>First-time subscription refund window</strong> — if you contact us within{" "}
                    <strong>7 calendar days</strong> of your <em>first</em> paid subscription purchase and
                    have not successfully completed a production sync on a paid project, we may issue a full
                    refund as a goodwill gesture. This is a discretionary policy, not a statutory right.
                </li>
            </ul>

            <h3>11.4 Non-refundable situations</h3>
            <p>Refunds are generally <strong>not</strong> provided when:</p>
            <ul>
                <li>You change your mind after using paid features or completing syncs</li>
                <li>You failed to cancel before a renewal date</li>
                <li>
                    Issues are caused by incorrect Notion/Framer configuration, revoked API keys, or
                    third-party service limits
                </li>
                <li>You violated these Terms and we terminated your account</li>
                <li>You purchased through a promotion that stated &quot;no refunds&quot;</li>
            </ul>

            <h3>11.5 How to request a refund</h3>
            <ol>
                <li>
                    Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> from the Google account
                    email used for {COMPANY_NAME}.
                </li>
                <li>
                    Include your name, transaction or invoice ID from Polar, purchase date, and reason for
                    the request.
                </li>
                <li>
                    We will acknowledge within <strong>3 business days</strong> and respond with a decision
                    within <strong>7 business days</strong>.
                </li>
            </ol>

            <h3>11.6 Refund processing</h3>
            <ul>
                <li>
                    Approved refunds are processed to the <strong>original payment method</strong> via
                    Polar.
                </li>
                <li>
                    Refunds typically appear within <strong>5–10 business days</strong>, depending on your
                    bank or card issuer.
                </li>
                <li>
                    On refund, paid entitlements end immediately or at the end of the current period, at our
                    discretion.
                </li>
                <li>Partial refunds may be offered as account credit in lieu of cash where appropriate.</li>
            </ul>

            <h3>11.7 Chargebacks</h3>
            <p>
                If you dispute a charge with your bank without contacting us first, we may suspend your
                account pending investigation. Please email us before initiating a chargeback so we can
                resolve the issue directly.
            </p>

            <h2>12. Termination</h2>
            <p>
                You may stop using the Service at any time. We may terminate or suspend access for breach of
                these Terms, non-payment, or legal requirement. Upon termination, your right to use the
                Service ends. Sections that by nature should survive (including payment obligations,
                disclaimers, limitation of liability, and governing law) will survive.
            </p>

            <h2>13. Governing law and disputes</h2>
            <p>
                These Terms are governed by the laws of <strong>India</strong>. Subject to applicable consumer
                protection rules, courts in <strong>Bengaluru, Karnataka</strong> shall have exclusive
                jurisdiction over disputes, unless mandatory law requires otherwise.
            </p>
            <p>
                If you are a consumer under the Consumer Protection Act, 2019, you may also have the right to
                approach the appropriate consumer forum in your district or state.
            </p>

            <h2>14. Changes to these Terms</h2>
            <p>
                We may update these Terms from time to time. We will post the revised version on this page
                and update the &quot;Last updated&quot; date. Material changes to paid features or billing
                will be communicated via the Service or email where reasonable. Continued use after changes
                constitutes acceptance.
            </p>

            <h2>15. Contact</h2>
            <p>
                Questions about these Terms or refunds:{" "}
                <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
            </p>
        </>
    )
}
