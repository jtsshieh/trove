import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ReactNode } from 'react';

import { Toaster } from '@/components/ui/sonner';

import { Providers } from './providers';

import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
	title: 'Packing List Helper',
	description: 'Plan, provision, and pack for your trips.',
};

export default function RootLayout({
	children,
}: Readonly<{
	children: ReactNode;
}>) {
	return (
		<html lang="en" className={`${inter.variable} scroll-smooth`}>
			<body className="font-sans antialiased">
				<Providers>{children}</Providers>
				<Toaster />
			</body>
		</html>
	);
}
