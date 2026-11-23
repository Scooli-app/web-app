import { SignIn } from "@clerk/nextjs";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { SsoCallbackGuard } from "@/components/auth/SsoCallbackGuard";
import { TrialPromoCodeFieldInClerk } from "@/components/billing/TrialPromoCodeField";
import { TrialPromoSignUpBanner } from "@/components/billing/TrialPromoSignUpBanner";

export default function SignInPage() {
  return (
    <AuthLayout>
      <div className="flex w-full flex-col items-center gap-4">
        <TrialPromoSignUpBanner />
        <SsoCallbackGuard>
          <SignIn />
        </SsoCallbackGuard>
        <TrialPromoCodeFieldInClerk />
      </div>
    </AuthLayout>
  );
}
