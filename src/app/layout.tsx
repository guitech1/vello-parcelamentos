import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Vello Parcelamentos',
  description: 'Gestão de links de parcelamento para lojistas, com autenticação e dados isolados por conta.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
