'use client';

import { useRouter } from 'next/navigation';
import React, { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
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
import { ApiError } from '@/lib/api/errors';

import { UserRole } from '@/generated/prisma/enums';
import type { AdminUserDTO } from '@/lib/domains/admin/users';

import * as api from './_data/api';

export function UsersManager({
	users,
	currentUserId,
}: {
	users: AdminUserDTO[];
	currentUserId: string;
}) {
	const router = useRouter();
	const [pending, startTransition] = useTransition();

	const run = (fn: () => Promise<unknown>, ok?: string) =>
		startTransition(async () => {
			try {
				await fn();
				if (ok) toast.success(ok);
				router.refresh();
			} catch (e) {
				toast.error(e instanceof ApiError ? e.message : 'Something went wrong');
			}
		});

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between">
				<div>
					<CardTitle>Users</CardTitle>
					<CardDescription>
						Create accounts and manage roles. New users sign in with the initial
						password you set.
					</CardDescription>
				</div>
				<CreateUserDialog
					pending={pending}
					onCreate={(input) => run(() => api.createUser(input), 'User created')}
				/>
			</CardHeader>
			<CardContent>
				<div className="divide-y rounded-md border">
					{users.map((u) => {
						const isSelf = u.id === currentUserId;
						return (
							<div
								key={u.id}
								className="flex items-center justify-between gap-2 px-3 py-2"
							>
								<div className="flex items-center gap-2">
									<span className="font-medium">{u.username}</span>
									<span className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-600">
										{u.role}
									</span>
									{isSelf && (
										<span className="text-xs text-neutral-400">(you)</span>
									)}
								</div>
								<div className="flex items-center gap-1">
									<Button
										variant="ghost"
										size="sm"
										disabled={pending || isSelf}
										onClick={() =>
											run(
												() =>
													api.setUserRole(
														u.id,
														u.role === UserRole.ADMIN
															? UserRole.USER
															: UserRole.ADMIN,
													),
												'Role updated',
											)
										}
									>
										{u.role === UserRole.ADMIN ? 'Make user' : 'Make admin'}
									</Button>
									<ResetPasswordDialog
										username={u.username}
										pending={pending}
										onReset={(pw) =>
											run(
												() => api.resetUserPassword(u.id, pw),
												'Password reset',
											)
										}
									/>
									<DeleteUserDialog
										username={u.username}
										disabled={pending || isSelf}
										onDelete={() =>
											run(() => api.deleteUser(u.id), 'User deleted')
										}
									/>
								</div>
							</div>
						);
					})}
				</div>
			</CardContent>
		</Card>
	);
}

function CreateUserDialog({
	pending,
	onCreate,
}: {
	pending: boolean;
	onCreate: (input: {
		username: string;
		password: string;
		role: UserRole;
	}) => void;
}) {
	const [open, setOpen] = useState(false);
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [role, setRole] = useState<UserRole>(UserRole.USER);

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger render={<Button />}>Add user</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Create user</DialogTitle>
					<DialogDescription>
						Set a username and an initial password. They can change it after
						signing in.
					</DialogDescription>
				</DialogHeader>
				<div className="flex flex-col gap-3">
					<div className="flex flex-col gap-2">
						<Label htmlFor="new-username">Username</Label>
						<Input
							id="new-username"
							value={username}
							onChange={(e) => setUsername(e.target.value)}
						/>
					</div>
					<div className="flex flex-col gap-2">
						<Label htmlFor="new-password">Initial password</Label>
						<Input
							id="new-password"
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
						/>
					</div>
					<label className="flex items-center gap-2 text-sm">
						<input
							type="checkbox"
							checked={role === UserRole.ADMIN}
							onChange={(e) =>
								setRole(e.target.checked ? UserRole.ADMIN : UserRole.USER)
							}
						/>
						Admin
					</label>
				</div>
				<DialogFooter>
					<Button
						loading={pending}
						disabled={!username.trim() || password.length < 8}
						onClick={() => {
							onCreate({ username: username.trim(), password, role });
							setOpen(false);
							setUsername('');
							setPassword('');
							setRole(UserRole.USER);
						}}
					>
						Create
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function ResetPasswordDialog({
	username,
	pending,
	onReset,
}: {
	username: string;
	pending: boolean;
	onReset: (password: string) => void;
}) {
	const [open, setOpen] = useState(false);
	const [password, setPassword] = useState('');
	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger render={<Button variant="ghost" size="sm" />}>
				Reset password
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Reset password for {username}</DialogTitle>
				</DialogHeader>
				<div className="flex flex-col gap-2">
					<Label htmlFor="reset-password">New password</Label>
					<Input
						id="reset-password"
						type="password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
					/>
				</div>
				<DialogFooter>
					<Button
						loading={pending}
						disabled={password.length < 8}
						onClick={() => {
							onReset(password);
							setOpen(false);
							setPassword('');
						}}
					>
						Reset
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function DeleteUserDialog({
	username,
	disabled,
	onDelete,
}: {
	username: string;
	disabled: boolean;
	onDelete: () => void;
}) {
	const [open, setOpen] = useState(false);
	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger
				render={<Button variant="ghost" size="sm" disabled={disabled} />}
			>
				Delete
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Delete {username}?</DialogTitle>
					<DialogDescription>
						This permanently deletes the account and all of its data. This
						cannot be undone.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button variant="secondary" onClick={() => setOpen(false)}>
						Cancel
					</Button>
					<Button
						variant="destructive"
						onClick={() => {
							onDelete();
							setOpen(false);
						}}
					>
						Delete
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
