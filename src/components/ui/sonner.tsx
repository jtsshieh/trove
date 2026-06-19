'use client';

import { Toaster as Sonner, type ToasterProps } from 'sonner';
import * as React from 'react';

function Toaster({ ...props }: ToasterProps) {
	return (
		<Sonner
			className="toaster group"
			style={
				{
					'--normal-bg': 'var(--popover)',
					'--normal-text': 'var(--popover-foreground)',
					'--normal-border': 'var(--border)',
				} as React.CSSProperties
			}
			{...props}
		/>
	);
}

export { Toaster };
