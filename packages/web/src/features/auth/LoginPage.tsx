import { AuthLayout } from "../../components/layout"
import { GoogleSignInButton } from "./GoogleSignInButton"

export function LoginPage() {
    return (
        <AuthLayout
            title="Sign in"
            subtitle="Sync content from Notion, Airtable, Google Sheets, and more to Framer CMS — automatically."
        >
            <GoogleSignInButton />
        </AuthLayout>
    )
}
