import { PRODUCT_NAME } from "../../components/brand"
import { AuthLayout } from "../../components/layout"
import { GoogleSignInButton } from "./GoogleSignInButton"

export function LoginPage() {
    return (
        <AuthLayout
            title={`Log in to ${PRODUCT_NAME}`}
            subtitle="Sync Notion content to Framer CMS. Set up once, publish automatically."
        >
            <GoogleSignInButton />
        </AuthLayout>
    )
}
