'use client';

import {
	WebAuthnError,
	browserSupportsWebAuthn,
	browserSupportsWebAuthnAutofill,
	startAuthentication,
} from '@simplewebauthn/browser';
import { PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/types';
import { AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState, useTransition } from 'react';
import { z } from 'zod';

import { Alert, AlertDescription } from '../../../components/ui/alert';
import { Button } from '../../../components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '../../../components/ui/card';
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
	useAppForm,
} from '../../../components/ui/form';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import {
	getAuthOptions,
	getPasskeyOptions,
	signInWithPassword,
	verifyAuthentication,
} from '../_data/api';

const formSchema = z.object({
	username: z.string(),
});

export default function SigninPage() {
	const form = useAppForm({
		schema: formSchema,
		defaultValues: { username: '' },
	});
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [error, setError] = useState('');
	const [type, setType] = useState('');

	useEffect(() => {
		const checkAuth = async () => {
			if (
				browserSupportsWebAuthn() &&
				(await browserSupportsWebAuthnAutofill())
			) {
				const options = await getPasskeyOptions();
				await doPasskeyAuth(options, true);
			}
		};
		checkAuth();
	}, []);

	const onSubmit = form.handleSubmit((data) =>
		startTransition(async () => {
			const result = await getAuthOptions(data.username);

			if (result.type === 'failure')
				setError(
					"There is no associated account with this username. Sign up if you don't have an account yet.",
				);

			if (result.type === 'password') setType('password');

			if (result.type === 'passkey') {
				setType('passkey');
				await doPasskeyAuth(result.options);
			}
		}),
	);

	const doPasskeyAuth = async (
		options: PublicKeyCredentialRequestOptionsJSON,
		isAutofill: boolean = false,
	) => {
		let authenticationResponse;

		try {
			authenticationResponse = await startAuthentication(options, isAutofill);
		} catch (error) {
			if (error instanceof WebAuthnError) {
				if (error.code === 'ERROR_CEREMONY_ABORTED') return;
				if (error.code == 'ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY') {
					return setError(
						'The passkey prompt either timed out or was canceled.',
					);
				}
			}
			console.log(error);

			return setError("Your passkey couldn't be verified.");
		}

		const verificationResponse = await verifyAuthentication(
			authenticationResponse,
		);
		if (verificationResponse.type === 'success') {
			router.push('/dashboard');
		} else {
			if (verificationResponse.code === 'INVALID_PASSKEY') {
				setError("Your passkey couldn't be verified.");
			} else if (verificationResponse.code === 'TIME_OUT') {
				setError('This session has timed out.');
			} else {
				setError('An unknown error occurred.');
			}
		}
	};

	return (
		<div className="flex h-svh w-screen items-center justify-center">
			<div className="absolute top-0 flex w-full justify-end p-8">
				<Button variant="secondary">
					<Link href="/sign-up">Sign up</Link>
				</Button>
			</div>
			{type === 'password' ? (
				<PasswordForm username={form.getValues().username} />
			) : type === 'passkey' ? (
				<PasskeyForm
					username={form.getValues().username}
					error={error}
					doPasskeyAuth={doPasskeyAuth}
					changeToPassword={() => setType('password')}
				/>
			) : (
				<Card className="mx-4 w-full max-w-md">
					<CardHeader>
						<CardTitle>Sign in</CardTitle>
						<CardDescription>Enter your username to continue.</CardDescription>
					</CardHeader>
					<Form {...form}>
						<form onSubmit={onSubmit}>
							<CardContent className="flex flex-col gap-4">
								{error !== '' && (
									<Alert variant="destructive">
										<AlertCircle className="h-4 w-4" />
										<AlertDescription>{error}</AlertDescription>
									</Alert>
								)}
								<FormField
									control={form.control}
									name="username"
									render={({ field }) => (
										<FormItem className="w-full">
											<FormLabel>Username</FormLabel>
											<FormControl>
												<Input
													disabled={isPending}
													autoComplete="username webauthn"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</CardContent>
							<CardFooter>
								<Button className="w-full" type="submit" loading={isPending}>
									Continue
								</Button>
							</CardFooter>
						</form>
					</Form>
				</Card>
			)}
		</div>
	);
}

function PasskeyForm({
	username,
	error,
	doPasskeyAuth,
	changeToPassword,
}: {
	username: string;
	error: string;
	doPasskeyAuth: (
		options: PublicKeyCredentialRequestOptionsJSON,
	) => Promise<void>;
	changeToPassword: () => void;
}) {
	const [isPending, startTransition] = useTransition();

	const tryAgain = () =>
		startTransition(async () => {
			const options = await getPasskeyOptions();
			await doPasskeyAuth(options);
		});
	return (
		<Card className="mx-4 w-full max-w-md">
			<CardHeader>
				<CardTitle>Sign in</CardTitle>
				<CardDescription>Authenticating with passkey...</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				{error !== '' && (
					<Alert variant="destructive">
						<AlertCircle className="h-4 w-4" />
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				)}
				<Label>Username</Label>
				<p>{username}</p>
				<div className="flex flex-row justify-between">
					<Button variant="link" onClick={changeToPassword}>
						Try another way
					</Button>
					{error !== '' && (
						<Button loading={isPending} onClick={tryAgain}>
							Try again
						</Button>
					)}
				</div>
			</CardContent>
		</Card>
	);
}

const passwordSchema = z.object({
	password: z.string(),
});

function PasswordForm({ username }: { username: string }) {
	const form = useAppForm({
		schema: passwordSchema,
		defaultValues: {
			password: '',
		},
	});
	const [isPending, startTransition] = useTransition();
	const [error, setError] = useState(false);
	const router = useRouter();

	const onSubmit = form.handleSubmit((data) =>
		startTransition(async () => {
			const result = await signInWithPassword(username, data.password);
			if (result.success) {
				router.push('/dashboard');
			} else {
				setError(true);
			}
		}),
	);

	return (
		<Card className="mx-4 w-full max-w-md">
			<CardHeader>
				<CardTitle>Sign in</CardTitle>
				<CardDescription>Enter your password.</CardDescription>
			</CardHeader>
			<Form {...form}>
				<form onSubmit={onSubmit}>
					<CardContent className="flex flex-col gap-4">
						{error && (
							<Alert variant="destructive">
								<AlertCircle className="h-4 w-4" />
								<AlertDescription>
									This password is incorrect. Please try again.
								</AlertDescription>
							</Alert>
						)}
						<FormLabel>Username</FormLabel>
						<p>{username}</p>

						<FormField
							control={form.control}
							name="password"
							render={({ field }) => (
								<FormItem className="w-full">
									<FormLabel>Password</FormLabel>
									<FormControl>
										<Input
											disabled={isPending}
											type="password"
											autoComplete="current-password"
											{...field}
											autoFocus
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</CardContent>
					<CardFooter>
						<Button className="w-full" type="submit" loading={isPending}>
							Continue
						</Button>
					</CardFooter>
				</form>
			</Form>
		</Card>
	);
}
