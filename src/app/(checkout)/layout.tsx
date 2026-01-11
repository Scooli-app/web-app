import Image from "next/image";
import Link from "next/link";

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-accent via-background to-muted dark:from-background dark:via-background dark:to-muted/30">
      {/* Simple header with logo */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image
              src="/scooli.svg"
              alt="Scooli"
              width={150}
              height={120}
              className="h-8"
            />
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main>{children}</main>

      {/* Footer */}
      <footer className="border-t border-border bg-background/50 mt-auto">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} Scooli. Todos os direitos reservados.</p>
            <div className="flex items-center gap-6">
              <a
                href="https://scooli.app/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                Termos de Serviço
              </a>
              <a
                href="https://scooli.app/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                Política de Privacidade
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
