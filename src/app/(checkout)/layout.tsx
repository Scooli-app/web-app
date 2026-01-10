import Image from "next/image";
import Link from "next/link";

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EEF0FF] via-white to-[#F4F5F8]">
      {/* Simple header with logo */}
      <header className="border-b border-[#E4E4E7] bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image
              src="/scooli.svg"
              alt="Scooli"
              width={32}
              height={32}
              className="w-8 h-8"
            />
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main>{children}</main>

      {/* Footer */}
      <footer className="border-t border-[#E4E4E7] bg-white/50 mt-auto">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-[#6C6F80]">
            <p>© {new Date().getFullYear()} Scooli. Todos os direitos reservados.</p>
            <div className="flex items-center gap-6">
              <a
                href="https://scooli.app/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#0B0D17] transition-colors"
              >
                Termos de Serviço
              </a>
              <a
                href="https://scooli.app/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#0B0D17] transition-colors"
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

