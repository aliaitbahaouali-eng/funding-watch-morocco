import './globals.css';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata = {
  title: 'Funding Watch Morocco — Plateforme de veille financements pour associations',
  description:
    'Détectez, analysez et recevez les opportunités de financement adaptées à votre association marocaine. Alertes personnalisées, score IA, checklist candidature.',
  keywords: ['financement', 'associations', 'maroc', 'subventions', 'appels à projets'],
  openGraph: {
    title: 'Funding Watch Morocco',
    description: 'Plateforme intelligente de veille des financements pour les associations marocaines.',
    type: 'website',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr" className={inter.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
