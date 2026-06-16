import { Card, CardHeader, ButtonLink } from "../../components/ui"
import { LegalFooter } from "../../components/legal/LegalFooter"
import {
    DOCS_URL,
    FEATUREBASE_FEEDBACK_URL,
    FEATUREBASE_ROADMAP_URL,
    SUPPORT_EMAIL,
} from "../../config/site"

const SUPPORT_CHANNELS = [
    {
        id: "feedback",
        label: "Feedback",
        title: "Share ideas & report bugs",
        description:
            "Post on our public board, vote on requests, and follow threads. Best for product feedback and reproducible sync issues.",
        href: FEATUREBASE_FEEDBACK_URL,
        cta: "Open feedback board",
    },
    {
        id: "roadmap",
        label: "Roadmap",
        title: "See what we are building",
        description:
            "Planned, in progress, and shipped work — including Google Sheets and other connectors.",
        href: FEATUREBASE_ROADMAP_URL,
        cta: "View roadmap",
    },
    {
        id: "email",
        label: "Email",
        title: "Direct support",
        description:
            "Billing disputes, privacy requests, or urgent account issues. We typically reply within 1–2 business days.",
        href: `mailto:${SUPPORT_EMAIL}`,
        cta: "Send an email",
        email: SUPPORT_EMAIL,
    },
] as const

const SUPPORT_TOPICS = [
    {
        title: "Setup & sync",
        description: "Framer API keys, source connections, field mapping, or sync errors.",
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
                    description="Use Featurebase for feedback and the roadmap. Email us for billing, privacy, or urgent account issues. Include the Google account you use to sign in and your Framer project URL when relevant."
                />

                <div className="pf-profile-support-channels">
                    {SUPPORT_CHANNELS.map(channel => (
                        <div key={channel.id} className="pf-profile-support-channel">
                            <p className="pf-profile-support-label">{channel.label}</p>
                            <h3 className="pf-profile-support-channel-title">{channel.title}</h3>
                            <p className="pf-profile-support-channel-desc">{channel.description}</p>
                            {"email" in channel && channel.email ? (
                                <a
                                    className="pf-profile-support-email-link"
                                    href={channel.href}
                                >
                                    {channel.email}
                                </a>
                            ) : null}
                            <ButtonLink
                                href={channel.href}
                                variant={channel.id === "email" ? "primary" : "secondary"}
                            >
                                {channel.cta}
                            </ButtonLink>
                        </div>
                    ))}
                </div>

                <div className="pf-profile-support-docs">
                    <ButtonLink href={DOCS_URL} variant="ghost">
                        Browse docs
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
