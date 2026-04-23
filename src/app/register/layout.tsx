import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Daftar Partner - Black Bear',
  description: 'Bergabung sebagai partner Black Bear dan mulai layani pelanggan gestun kartu kredit.',
  robots: { index: false, follow: false },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
