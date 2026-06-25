'use client';

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
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { VolumeUnitProvider, VolumeUnitToggle } from '@/components/volume-unit';
import { ApiError } from '@/lib/api/errors';
import type { VolumeUnit } from '@/generated/prisma/enums';
import { toast } from 'sonner';

import { changePassword, changeUsername, deleteUser } from './_data/api';
import type { UserDTO } from './_data/fetchers';

export function PreferencesCard({ volumeUnit }: { volumeUnit: VolumeUnit }) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Preferences</CardTitle>
				<CardDescription>
					Choose how volumes (bottle sizes, TSA liquids limits) are shown across
					your closet and trips.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex items-center justify-between gap-4">
				<Label>Volume unit</Label>
				<VolumeUnitProvider initial={volumeUnit}>
					<VolumeUnitToggle />
				</VolumeUnitProvider>
			</CardContent>
		</Card>
	);
}

export function UsernameCard({ user }: { user: UserDTO }) {
	const [username, setUsername] = useState(user.username);
	const [isPending, startTransition] = useTransition();
	const router = useRouter();
	const onSaveUsernameChange = () =>
		startTransition(async () => {
			const result = await changeUsername(username);
			if (!result.success) {
				toast.error('That username is taken. Choose another one.');
			} else {
				// Username is server-rendered + prop-drilled (nav, account page);
				// refresh so those reflect the change (replaces revalidatePath('/')).
				router.refresh();
				toast.success(
					`Your username has successfully been changed to ${username}`,
				);
			}
		});

	return (
		<Card>
			<CardHeader>
				<CardTitle>Username</CardTitle>
				<CardDescription>
					Choose a unique username that'll serve as your credential for logging
					in.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Input
					disabled={isPending}
					className="max-w-[300px]"
					value={username}
					onChange={(e) => setUsername(e.target.value)}
				/>
			</CardContent>
			<CardFooter className="flex justify-end bg-neutral-100 py-4">
				<Button onClick={onSaveUsernameChange} loading={isPending}>
					Save
				</Button>
			</CardFooter>
		</Card>
	);
}

export function PasswordCard() {
	const [current, setCurrent] = useState('');
	const [next, setNext] = useState('');
	const [confirm, setConfirm] = useState('');
	const [isPending, startTransition] = useTransition();

	const onSave = () =>
		startTransition(async () => {
			if (next.length < 8) {
				toast.error('New password must be at least 8 characters.');
				return;
			}
			if (next !== confirm) {
				toast.error('New passwords do not match.');
				return;
			}
			try {
				await changePassword({ currentPassword: current, newPassword: next });
				toast.success('Your password has been changed.');
				setCurrent('');
				setNext('');
				setConfirm('');
			} catch (e) {
				toast.error(
					e instanceof ApiError ? e.message : 'Could not change password',
				);
			}
		});

	return (
		<Card>
			<CardHeader>
				<CardTitle>Password</CardTitle>
				<CardDescription>Change your account password.</CardDescription>
			</CardHeader>
			<CardContent className="flex max-w-sm flex-col gap-3">
				<div className="flex flex-col gap-1.5">
					<Label htmlFor="current-password">Current password</Label>
					<Input
						id="current-password"
						type="password"
						value={current}
						onChange={(e) => setCurrent(e.target.value)}
						disabled={isPending}
						autoComplete="current-password"
					/>
				</div>
				<div className="flex flex-col gap-1.5">
					<Label htmlFor="new-password">New password</Label>
					<Input
						id="new-password"
						type="password"
						value={next}
						onChange={(e) => setNext(e.target.value)}
						disabled={isPending}
						autoComplete="new-password"
					/>
				</div>
				<div className="flex flex-col gap-1.5">
					<Label htmlFor="confirm-password">Confirm new password</Label>
					<Input
						id="confirm-password"
						type="password"
						value={confirm}
						onChange={(e) => setConfirm(e.target.value)}
						disabled={isPending}
						autoComplete="new-password"
					/>
				</div>
			</CardContent>
			<CardFooter className="flex justify-end bg-neutral-100 py-4">
				<Button
					onClick={onSave}
					loading={isPending}
					disabled={!current || !next}
				>
					Change password
				</Button>
			</CardFooter>
		</Card>
	);
}

export function DeleteAccountCard() {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Delete Account</CardTitle>
				<CardDescription>
					This account and all associated data including clothes, essentials,
					and trips will be permanently deleted. This action is irreversible.
				</CardDescription>
			</CardHeader>
			<CardFooter className="mt-4 justify-end bg-red-100 py-4">
				<DeleteAccountDialog />
			</CardFooter>
		</Card>
	);
}

function DeleteAccountDialog() {
	const [open, setOpen] = useState(false);
	const router = useRouter();

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger render={<Button variant="destructive" />}>
				Delete account
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Delete account</DialogTitle>
					<DialogDescription>
						Are you sure you want to your account? All associated data including
						clothing, essentials, and trips will be permanently deleted. This
						action is irreversible.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button
						onClick={(e) => {
							e.preventDefault();
							setOpen(false);
						}}
						variant="secondary"
					>
						Cancel
					</Button>
					<Button
						type="submit"
						variant="destructive"
						onClick={async () => {
							await deleteUser();
							router.push('/sign-in');
						}}
					>
						Delete
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
