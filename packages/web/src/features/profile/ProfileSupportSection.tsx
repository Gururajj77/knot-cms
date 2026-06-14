import { Card, CardHeader, ButtonLink } from "../../components/ui"
import { LegalFooter } from "../../components/legal/LegalFooter"
import { SUPPORT_EMAIL } from "../../config/site"

const SUPPORT_TOPICS = [
    {
        title: "Setup & sync",
        description: "Framer API keys, Notion connections, field mapping, or sync errors.",
    },
    {
        title: "Billing & plans",
        description: "Subscriptions, invoices, project limits, or checkout questions.",
    },
    {
        title: "Privacy & legal",
        description: "Data requests, account deletion, or questions about our policies.",
    },
] as const

export function ProfileSupportSection() {
    return (
        <section className="pf-profile-section" id="support">
            <h2 className="pf-profile-section-title">Support</h2>
            <Card className="pf-profile-support-card">
                <CardHeader
                    title="Contact us"
                    description="We typically reply within 1–2 business days. Include the Google account you use to sign in and your Framer project URL if the issue is about a specific connection."
                />

                <div className="pf-profile-support-email">
                    <p className="pf-profile-support-label">Support email</p>
                    <a className="pf-profile-support-email-link" href={`mailto:${SUPPORT_EMAIL}`}>
                        {SUPPORT_EMAIL}
                    </a>
                    <ButtonLink href={`mailto:${SUPPORT_EMAIL}`} variant="primary">
                        Send an email
                    </ButtonLink>
                </div>

                <div className="pf-profile-support-topics">
                    <h3 className="pf-profile-support-topics-title">What can we help with?</h3>
                    <ul className="pf-profile-support-topic-list">
                        {SUPPORT_TOPICS.map(topic => (
                            <li key={topic.title}>
                                <strong>{topic.title}</strong>
                                <p>{topic.description}</p>
                            </li>
                        ))}
                    </ul>
                </div>

                <LegalFooter className="pf-profile-support-legal" />
            </Card>
        </section>
    )
}
