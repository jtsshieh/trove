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
import { toast } from 'sonner';

import { changeUsername, deleteUser } from './_data/api';
import type { UserDTO } from './_data/fetchers';

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
