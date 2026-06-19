'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { Luggage } from '@/generated/prisma/client';
import { Pencil, Plus, Trash } from 'lucide-react';
import React, { FormEvent, useEffect, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '../../../../../components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '../../../../../components/ui/dialog';
import {
	Form,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '../../../../../components/ui/form';
import { Input } from '../../../../../components/ui/input';
import { createLuggage, deleteLuggage, editLuggage } from './_data/actions';
import { createLuggageSchema, editLuggageSchema } from './_data/schemas';

export function CreateLuggageDialog() {
	const [open, setOpen] = useState(false);
	const [isPending, startTransition] = useTransition();

	const form = useForm<z.infer<typeof createLuggageSchema>>({
		resolver: zodResolver(createLuggageSchema),
	});

	const onSubmit = form.handleSubmit((data) =>
		startTransition(async () => {
			await createLuggage(data);
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
				<span className="hidden sm:block">Add Luggage</span>
			</DialogTrigger>
			<DialogContent>
				<Form {...form}>
					<form onSubmit={onSubmit} className="space-y-8">
						<DialogHeader>
							<DialogTitle>Add Luggage</DialogTitle>
						</DialogHeader>

						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel>Name</FormLabel>
									<Input
										disabled={isPending}
										placeholder="Enter a name for this piece of luggage"
										{...field}
									/>
									<FormMessage />
								</FormItem>
							)}
						/>

						<DialogFooter>
							<Button type="submit" loading={isPending}>
								Add Luggage
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}

export function EditLuggageDialog({
	luggage,
	disabled,
}: {
	luggage: Luggage;
	disabled: boolean;
}) {
	const [open, setOpen] = useState(false);
	const [isPending, startTransition] = useTransition();

	const form = useForm<z.infer<typeof editLuggageSchema>>({
		resolver: zodResolver(editLuggageSchema),
		defaultValues: {
			name: luggage.name,
		},
	});

	const onSubmit = form.handleSubmit((data) =>
		startTransition(async () => {
			await editLuggage(luggage.id, data);
			setOpen(false);
		}),
	);

	useEffect(() => {
		form.reset({
			name: luggage.name,
		});
	}, [luggage.name]);
	return (
		<Dialog
			open={open}
			onOpenChange={(newOpen) => {
				if (!newOpen) {
					form.reset({
						name: luggage.name,
					});
					setOpen(false);
				} else {
					setOpen(true);
				}
			}}
		>
			<DialogTrigger
				render={<Button size="icon" variant="secondary" disabled={disabled} />}
			>
				<Pencil />
			</DialogTrigger>
			<DialogContent>
				<Form {...form}>
					<form onSubmit={onSubmit} className="space-y-8">
						<DialogHeader>
							<DialogTitle>Edit Luggage</DialogTitle>
						</DialogHeader>

						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel>Name</FormLabel>
									<Input
										disabled={isPending}
										placeholder="Enter a name for this piece of luggage"
										{...field}
									/>
									<FormMessage />
								</FormItem>
							)}
						/>

						<DialogFooter>
							<Button type="submit" loading={isPending}>
								Edit Luggage
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}

export function DeleteLuggageDialog({
	luggage,
	disabled,
}: {
	luggage: Luggage;
	disabled: boolean;
}) {
	const [open, setOpen] = useState(false);
	const [isPending, startTransition] = useTransition();
	const onSubmit = (e: FormEvent<HTMLFormElement>) =>
		startTransition(async () => {
			e.preventDefault();
			await deleteLuggage(luggage.id);
			setOpen(false);
		});

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger
				render={
					<Button size="icon" variant="destructive" disabled={disabled} />
				}
			>
				<Trash />
			</DialogTrigger>
			<DialogContent render={<form onSubmit={onSubmit} />}>
				<DialogHeader>
					<DialogTitle>Delete Luggage</DialogTitle>
					<DialogDescription>
						Are you sure you want to delete {luggage.name}? This action is
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
