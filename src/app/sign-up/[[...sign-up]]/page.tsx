import { SignUp } from "@clerk/nextjs";
import { AuthLayout } from "@/components/auth/AuthLayout";

export default function SignUpPage() {
  return (
    <AuthLayout>
      <SignUp />
    </AuthLayout>
  );
}

