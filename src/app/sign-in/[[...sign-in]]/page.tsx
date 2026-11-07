import { SignIn } from "@clerk/nextjs";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { SsoCallbackGuard } from "@/components/auth/SsoCallbackGuard";
import { TrialPromoSignUpBanner } from "@/components/billing/TrialPromoSignUpBanner";

export default function SignInPage() {
  return (
    <AuthLayout>
      <div className="flex w-full flex-col items-center gap-4">
        <TrialPromoSignUpBanner />
        <SsoCallbackGuard>
          <SignIn />
        </SsoCallbackGuard>
      </div>
    </AuthLayout>
  );
}
