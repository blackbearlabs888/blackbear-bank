import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Home, ArrowLeft, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px] animate-pulse-soft" />
        <div className="absolute bottom-1/4 -right-20 w-[400px] h-[400px] bg-fuchsia-500/5 rounded-full blur-[100px] animate-pulse-soft" style={{ animationDelay: '3s' }} />
      </div>

      <div className="max-w-lg mx-auto text-center space-y-6 animate-fade-in">
        {/* Large 404 */}
        <div className="relative">
          <h1 className="text-8xl sm:text-9xl font-black tracking-tighter bg-gradient-to-br from-primary via-fuchsia-500 to-purple-500 bg-clip-text text-transparent">
            404
          </h1>
          {/* Decorative ring */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-full border-2 border-dashed border-primary/10 animate-[spin_20s_linear_infinite]" />
          </div>
        </div>

        {/* Message */}
        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Halaman Tidak Ditemukan
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base leading-relaxed max-w-md mx-auto">
            Halaman yang Anda cari tidak ditemukan. Mungkin halaman telah dipindahkan atau URL yang Anda masukkan salah.
          </p>
        </div>

        {/* Quick links */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {[
            { label: 'Beranda', href: '/' },
            { label: 'Order', href: '/order' },
            { label: 'Track', href: '/track' },
            { label: 'FAQ', href: '/faq' },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button asChild size="lg" className="gradient-primary text-white rounded-xl h-12 px-6 shadow-lg shadow-primary/20 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300">
            <Link href="/">
              <Home className="w-4 h-4" />
              Kembali ke Beranda
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-xl h-12 px-6 border-border/60 hover:bg-accent hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-300">
            <Link href="/faq">
              <Search className="w-4 h-4" />
              Lihat FAQ
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
