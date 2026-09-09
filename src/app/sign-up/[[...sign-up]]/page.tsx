import { AuthLayout } from "@/components/auth/AuthLayout";
import { LocaleAwareSignUp } from "@/components/auth/LocaleAwareSignUp";

export default function SignUpPage() {
  return (
    <AuthLayout>
      <LocaleAwareSignUp />
    </AuthLayout>
  );
}
