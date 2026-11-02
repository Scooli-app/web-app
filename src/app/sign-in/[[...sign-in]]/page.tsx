import { SignIn } from "@clerk/nextjs";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { SsoCallbackGuard } from "@/components/auth/SsoCallbackGuard";

export default function SignInPage() {
  return (
    <AuthLayout>
      <SsoCallbackGuard>
        <SignIn />
      </SsoCallbackGuard>
    </AuthLayout>
  );
}
