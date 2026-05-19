import './globals.css';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://funding-watch-morocco.vercel.app';
const SITE_NAME = 'Funding Watch Morocco';
const TITLE = 'Funding Watch Morocco — Veille intelligente des financements pour associations';
const DESCRIPTION =
  'Détectez, analysez et recevez les opportunités de financement adaptées à votre association marocaine. Matching IA, alertes ciblées, suivi de candidatures, AI co-writer, document intelligence PDF.';

export const metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: TITLE,
    template: '%s — Funding Watch Morocco',
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    'financement associations Maroc',
    'appels à projets',
    'subventions ONG',
    'veille bailleurs internationaux',
    'matching IA',
    'AAP UE NDICI',
    'AFD Maroc',
    'UNDP Maroc',
    'Funding Watch',
  ],
  authors: [{ name: 'Funding Watch Morocco' }],
  creator: 'Funding Watch Morocco',
  publisher: 'Funding Watch Morocco',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'fr_MA',
    url: APP_URL,
    siteName: SITE_NAME,
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    creator: '@fundingwatchma',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: '/',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr" className={inter.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
