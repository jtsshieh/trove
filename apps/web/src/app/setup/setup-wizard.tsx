'use client';

import { ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/lib/api/errors';
import { accentStyle, LAUNCHER_APPS } from '@/lib/apps';

import { submitSetup } from './_data/api';

// The non-admin apps to highlight on the welcome screen.
const HIGHLIGHTS = LAUNCHER_APPS.filter((a) => !a.adminOnly);

export function SetupWizard() {
	const router = useRouter();
	const [step, setStep] = useState<'welcome' | 'account'>('welcome');

	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const [pending, startTransition] = useTransition();

	const createAdmin = () =>
		startTransition(async () => {
			setError('');
			if (password.length < 8) {
				setError('Password must be at least 8 characters.');
				return;
			}
			try {
				await submitSetup(username.trim(), password);
				router.push('/');
			} catch (e) {
				setError(e instanceof ApiError ? e.message : 'Setup failed.');
			}
		});

	return (
		<div className="flex min-h-svh w-screen items-center justify-center p-4">
			{step === 'welcome' ? (
				<Card className="w-full max-w-lg">
					<CardHeader className="items-center text-center">
						<CardTitle className="text-2xl">Welcome to Trove</CardTitle>
						<CardDescription>
							Your personal home for everything you own and everywhere you take
							it.
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col gap-3">
						{HIGHLIGHTS.map((app) => (
							<div
								key={app.id}
								className="flex items-center gap-3 rounded-xl border p-3"
							>
								<div
									className="flex size-10 shrink-0 items-center justify-center rounded-lg"
									style={{
										...accentStyle(app.accent),
										backgroundColor: 'var(--brand-subtle)',
										color: 'var(--brand)',
									}}
								>
									<app.icon className="size-5" />
								</div>
								<div className="min-w-0">
									<p className="font-medium">{app.name}</p>
									<p className="text-muted-foreground text-sm">
										{app.description}
									</p>
								</div>
							</div>
						))}
					</CardContent>
					<CardFooter className="flex-col gap-3">
						<Button className="w-full" onClick={() => setStep('account')}>
							Get started
							<ArrowRight />
						</Button>
						<p className="text-muted-foreground text-center text-xs">
							Let&apos;s create the admin account for this server.
						</p>
					</CardFooter>
				</Card>
			) : (
				<Card className="w-full max-w-md">
					<CardHeader>
						<CardTitle>Create the admin account</CardTitle>
						<CardDescription>
							This is the owner account for the server. You can add more users
							later in Admin.
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col gap-4">
						{error && (
							<p className="text-sm text-red-600" role="alert">
								{error}
							</p>
						)}
						<div className="flex flex-col gap-2">
							<Label htmlFor="username">Username</Label>
							<Input
								id="username"
								value={username}
								onChange={(e) => setUsername(e.target.value)}
								autoComplete="username"
							/>
						</div>
						<div className="flex flex-col gap-2">
							<Label htmlFor="password">Password</Label>
							<Input
								id="password"
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								autoComplete="new-password"
							/>
							<p className="text-muted-foreground text-xs">
								At least 8 characters.
							</p>
						</div>
					</CardContent>
					<CardFooter className="justify-between">
						<Button
							variant="ghost"
							onClick={() => setStep('welcome')}
							disabled={pending}
						>
							Back
						</Button>
						<Button
							onClick={createAdmin}
							loading={pending}
							disabled={!username.trim() || !password}
						>
							Create account
						</Button>
					</CardFooter>
				</Card>
			)}
		</div>
	);
}
