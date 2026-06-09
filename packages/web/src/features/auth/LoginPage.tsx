import { AuthLayout } from "../../components/layout"
import { GoogleSignInButton } from "./GoogleSignInButton"

export function LoginPage() {
    return (
        <AuthLayout
            title="Log in to PublishFlow"
            subtitle="Sync Notion content to Framer CMS. Set up once, publish automatically."
        >
            <GoogleSignInButton />
        </AuthLayout>
    )
}
