import { AuthLayout } from "@/components/auth/AuthLayout";
import { LocaleAwareSignUp } from "@/components/auth/LocaleAwareSignUp";
import { SsoCallbackGuard } from "@/components/auth/SsoCallbackGuard";
import { TrialPromoCodeFieldInClerk } from "@/components/billing/TrialPromoCodeField";
import { TrialPromoSignUpBanner } from "@/components/billing/TrialPromoSignUpBanner";

export default function SignUpPage() {
  return (
    <AuthLayout>
      <div className="flex w-full flex-col items-center gap-4">
        <TrialPromoSignUpBanner />
        <SsoCallbackGuard>
          <LocaleAwareSignUp />
        </SsoCallbackGuard>
        <TrialPromoCodeFieldInClerk />
      </div>
    </AuthLayout>
  );
}
