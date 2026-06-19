'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { Essential } from '@/generated/prisma/client';
import { EssentialCategory } from '@/generated/prisma/enums';
import { Plus, Trash } from 'lucide-react';
import React, { FormEvent, useEffect, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '../../../../components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '../../../../components/ui/dialog';
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '../../../../components/ui/form';
import { Input } from '../../../../components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '../../../../components/ui/select';
import {
	createEssential,
	deleteEssential,
	editEssential,
} from './_data/actions';
import { createEssentialSchema, editEssentialSchema } from './_data/schemas';

export function CreateEssentialDialog() {
	const [open, setOpen] = useState(false);
	const [isPending, startTransition] = useTransition();
	const form = useForm<z.infer<typeof createEssentialSchema>>({
		resolver: zodResolver(createEssentialSchema),
	});

	const onSubmit = form.handleSubmit((data) =>
		startTransition(async () => {
			await createEssential(data);
			form.reset();
			setOpen(false);
		}),
	);

	return (
		<Dialog
			open={open}
			onOpenChange={(newOpen) => {
				if (!newOpen) {
					form.reset();
					setOpen(false);
				} else {
					setOpen(true);
				}
			}}
		>
			<DialogTrigger
				render={
					<Button size="icon" className="gap-1 sm:w-auto sm:px-4 sm:py-2" />
				}
			>
				<Plus />
				<span className="hidden sm:block">Add Essential</span>
			</DialogTrigger>
			<DialogContent>
				<Form {...form}>
					<form onSubmit={onSubmit} className="space-y-8">
						<DialogHeader>
							<DialogTitle>Add essential</DialogTitle>
						</DialogHeader>
						<FormField
							control={form.control}
							name="category"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel>Category</FormLabel>
									<Select
										value={field.value}
										onValueChange={field.onChange}
										disabled={isPending}
									>
										<FormControl>
											<SelectTrigger>
												<SelectValue placeholder="Select the type of essential" />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											{Object.keys(EssentialCategory).map((type) => (
												<SelectItem key={type} value={type}>
													{type}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel>Name</FormLabel>
									<Input
										disabled={isPending}
										placeholder="Enter a name for this essential"
										{...field}
									/>
									<FormMessage />
								</FormItem>
							)}
						/>

						<DialogFooter>
							<Button type="submit" loading={isPending}>
								Save changes
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}

export function EditEssentialDialog({ essential }: { essential: Essential }) {
	const [open, setOpen] = useState(false);
	const [isPending, startTransition] = useTransition();
	const form = useForm<z.infer<typeof editEssentialSchema>>({
		resolver: zodResolver(editEssentialSchema),
		defaultValues: {
			name: essential.name,
			category: essential.category,
		},
	});

	const onSubmit = form.handleSubmit((data) =>
		startTransition(async () => {
			await editEssential(essential.id, data);
			setOpen(false);
		}),
	);

	useEffect(() => {
		form.reset({
			name: essential.name,
			category: essential.category,
		});
	}, [essential.name, essential.category]);
	return (
		<Dialog
			open={open}
			onOpenChange={(newOpen) => {
				if (!newOpen) {
					form.reset({
						name: essential.name,
						category: essential.category,
					});
					setOpen(false);
				} else {
					setOpen(true);
				}
			}}
		>
			<DialogTrigger render={<Button variant="secondary" />}>
				Edit
			</DialogTrigger>
			<DialogContent>
				<Form {...form}>
					<form onSubmit={onSubmit} className="space-y-8">
						<DialogHeader>
							<DialogTitle>Edit essential</DialogTitle>
						</DialogHeader>
						<FormField
							control={form.control}
							name="category"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel>Category</FormLabel>
									<Select
										value={field.value}
										onValueChange={field.onChange}
										disabled={isPending}
									>
										<FormControl>
											<SelectTrigger>
												<SelectValue placeholder="Select the type of essential" />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											{Object.keys(EssentialCategory).map((type) => (
												<SelectItem key={type} value={type}>
													{type}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel>Name</FormLabel>
									<Input
										disabled={isPending}
										placeholder="Enter a name for this essential"
										{...field}
									/>
									<FormMessage />
								</FormItem>
							)}
						/>
						<DialogFooter>
							<Button type="submit" loading={isPending}>
								Save changes
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}

export function DeleteEssentialDialog({ essential }: { essential: Essential }) {
	const [open, setOpen] = useState(false);
	const [isPending, startTransition] = useTransition();
	const onSubmit = (e: FormEvent<HTMLFormElement>) =>
		startTransition(async () => {
			e.preventDefault();
			await deleteEssential(essential.id);
			setOpen(false);
		});

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger render={<Button size="icon" variant="destructive" />}>
				<Trash />
			</DialogTrigger>
			<DialogContent render={<form onSubmit={onSubmit} />}>
				<DialogHeader>
					<DialogTitle>Delete essential</DialogTitle>
					<DialogDescription>
						Are you sure you want to delete {essential.name}? This action is
						irreversible.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button
						onClick={(e) => {
							e.preventDefault();
							setOpen(false);
						}}
						variant="secondary"
						disabled={isPending}
					>
						Cancel
					</Button>
					<Button type="submit" loading={isPending}>
						Delete
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
