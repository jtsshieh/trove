'use client';

import { useRouter } from 'next/navigation';
import React, { useState, useTransition } from 'react';
import { toast } from 'sonner';

import {
	ClothingTypePicker,
	type PickerType,
} from '@/components/clothing-type-picker';
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

import { createClothingTypes, submitSetup } from './_data/api';

export function SetupWizard({ catalog }: { catalog: PickerType[] }) {
	const router = useRouter();
	const [step, setStep] = useState<1 | 2>(1);

	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const [pending, startTransition] = useTransition();

	const [keep, setKeep] = useState<PickerType[]>(catalog);
	const [exclude, setExclude] = useState<PickerType[]>([]);

	const createAdmin = () =>
		startTransition(async () => {
			setError('');
			if (password.length < 8) {
				setError('Password must be at least 8 characters.');
				return;
			}
			try {
				await submitSetup(username.trim(), password);
				setStep(2);
			} catch (e) {
				setError(e instanceof ApiError ? e.message : 'Setup failed.');
			}
		});

	const finish = () =>
		startTransition(async () => {
			try {
				if (keep.length > 0) await createClothingTypes(keep);
				toast.success('Setup complete — welcome to Closet Manager!');
				router.push('/');
			} catch (e) {
				toast.error(e instanceof ApiError ? e.message : 'Something went wrong');
			}
		});

	const moveOut = (name: string) => {
		setKeep((k) => k.filter((t) => t.name !== name));
		const item = keep.find((t) => t.name === name);
		if (item) setExclude((x) => [...x, item]);
	};
	const moveIn = (name: string) => {
		setExclude((x) => x.filter((t) => t.name !== name));
		const item = exclude.find((t) => t.name === name);
		if (item) setKeep((k) => [...k, item]);
	};
	const add = (type: PickerType) => {
		if ([...keep, ...exclude].some((t) => t.name === type.name)) {
			toast.error(`"${type.name}" already exists`);
			return;
		}
		setKeep((k) => [...k, type]);
	};

	return (
		<div className="flex min-h-svh w-screen items-center justify-center p-4">
			{step === 1 ? (
				<Card className="w-full max-w-md">
					<CardHeader>
						<CardTitle>Welcome to Closet Manager</CardTitle>
						<CardDescription>
							Create the admin account for this server.
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
						</div>
					</CardContent>
					<CardFooter className="justify-end">
						<Button
							onClick={createAdmin}
							loading={pending}
							disabled={!username.trim() || !password}
						>
							Continue
						</Button>
					</CardFooter>
				</Card>
			) : (
				<Card className="w-full max-w-3xl">
					<CardHeader>
						<CardTitle>Set up your clothing types</CardTitle>
						<CardDescription>
							Choose which clothing types to start with. You can change these
							later in Admin → Clothing Types.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<ClothingTypePicker
							keep={keep}
							exclude={exclude}
							onMoveToExclude={moveOut}
							onMoveToKeep={moveIn}
							onAdd={add}
							busy={pending}
						/>
					</CardContent>
					<CardFooter className="justify-end">
						<Button onClick={finish} loading={pending}>
							Finish setup
						</Button>
					</CardFooter>
				</Card>
			)}
		</div>
	);
}
