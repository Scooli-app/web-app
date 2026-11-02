import { AuthLayout } from "@/components/auth/AuthLayout";
import { LocaleAwareSignUp } from "@/components/auth/LocaleAwareSignUp";
import { SsoCallbackGuard } from "@/components/auth/SsoCallbackGuard";

export default function SignUpPage() {
  return (
    <AuthLayout>
      <SsoCallbackGuard>
        <LocaleAwareSignUp />
      </SsoCallbackGuard>
    </AuthLayout>
  );
}
