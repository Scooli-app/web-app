import { Loader2 } from "lucide-react";

export default function CheckoutLoading() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center">
      <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
      <p className="text-muted-foreground">A carregar checkout...</p>
    </div>
  );
}

