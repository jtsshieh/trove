'use client';

import { MoreHorizontal, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
	const [resetTarget, setResetTarget] = useState<AdminUserDTO | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<AdminUserDTO | null>(null);

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
		<>
			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<div>
						<CardTitle>Users</CardTitle>
						<CardDescription>
							Create accounts and manage roles. New users sign in with the
							initial password you set.
						</CardDescription>
					</div>
					<CreateUserDialog
						pending={pending}
						onCreate={(input) =>
							run(() => api.createUser(input), 'User created')
						}
					/>
				</CardHeader>
				<CardContent className="flex flex-col gap-1">
					{users.map((u) => {
						const isSelf = u.id === currentUserId;
						const isAdminRole = u.role === UserRole.ADMIN;
						return (
							<div
								key={u.id}
								className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-neutral-50"
							>
								<div className="flex items-center gap-3">
									<Avatar className="size-8">
										<AvatarFallback className="text-xs">
											{u.username.slice(0, 2).toUpperCase()}
										</AvatarFallback>
									</Avatar>
									<div className="flex items-center gap-2">
										<span className="font-medium">{u.username}</span>
										{isSelf && (
											<span className="text-xs text-neutral-400">you</span>
										)}
									</div>
								</div>
								<div className="flex items-center gap-2">
									<span
										className={
											isAdminRole
												? 'bg-brand-subtle text-brand rounded-full px-2 py-0.5 text-xs font-medium'
												: 'rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600'
										}
									>
										{isAdminRole ? 'Admin' : 'User'}
									</span>
									<DropdownMenu>
										<DropdownMenuTrigger
											render={
												<Button
													variant="ghost"
													size="icon-sm"
													aria-label="Actions"
												/>
											}
										>
											<MoreHorizontal />
										</DropdownMenuTrigger>
										<DropdownMenuContent align="end">
											<DropdownMenuItem
												disabled={pending || isSelf}
												onClick={() =>
													run(
														() =>
															api.setUserRole(
																u.id,
																isAdminRole ? UserRole.USER : UserRole.ADMIN,
															),
														'Role updated',
													)
												}
											>
												{isAdminRole ? 'Make user' : 'Make admin'}
											</DropdownMenuItem>
											<DropdownMenuItem onClick={() => setResetTarget(u)}>
												Reset password
											</DropdownMenuItem>
											<DropdownMenuSeparator />
											<DropdownMenuItem
												variant="destructive"
												disabled={isSelf}
												onClick={() => setDeleteTarget(u)}
											>
												Delete
											</DropdownMenuItem>
										</DropdownMenuContent>
									</DropdownMenu>
								</div>
							</div>
						);
					})}
				</CardContent>
			</Card>

			<ResetPasswordDialog
				target={resetTarget}
				pending={pending}
				onOpenChange={(open) => !open && setResetTarget(null)}
				onReset={(pw) => {
					if (resetTarget)
						run(
							() => api.resetUserPassword(resetTarget.id, pw),
							'Password reset',
						);
					setResetTarget(null);
				}}
			/>
			<DeleteUserDialog
				target={deleteTarget}
				onOpenChange={(open) => !open && setDeleteTarget(null)}
				onDelete={() => {
					if (deleteTarget)
						run(() => api.deleteUser(deleteTarget.id), 'User deleted');
					setDeleteTarget(null);
				}}
			/>
		</>
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
			<DialogTrigger render={<Button />}>
				<UserPlus />
				Add user
			</DialogTrigger>
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
	target,
	pending,
	onReset,
	onOpenChange,
}: {
	target: AdminUserDTO | null;
	pending: boolean;
	onReset: (password: string) => void;
	onOpenChange: (open: boolean) => void;
}) {
	const [password, setPassword] = useState('');
	return (
		<Dialog
			open={!!target}
			onOpenChange={(open) => {
				onOpenChange(open);
				if (!open) setPassword('');
			}}
		>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Reset password for {target?.username}</DialogTitle>
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
						onClick={() => onReset(password)}
					>
						Reset
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function DeleteUserDialog({
	target,
	onDelete,
	onOpenChange,
}: {
	target: AdminUserDTO | null;
	onDelete: () => void;
	onOpenChange: (open: boolean) => void;
}) {
	return (
		<Dialog open={!!target} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Delete {target?.username}?</DialogTitle>
					<DialogDescription>
						This permanently deletes the account and all of its data. This cannot
						be undone.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button variant="secondary" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button variant="destructive" onClick={onDelete}>
						Delete
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
