'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { Container } from '@/generated/prisma/client';
import { ContainerType } from '@/generated/prisma/enums';
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
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '../../../../../components/ui/form';
import { Input } from '../../../../../components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '../../../../../components/ui/select';
import {
	createContainer,
	deleteContainer,
	editContainer,
} from './_data/actions';
import { createContainerSchema, editContainerSchema } from './_data/schemas';

export function CreateContainerDialog() {
	const [open, setOpen] = useState(false);
	const [isPending, startTransition] = useTransition();

	const form = useForm<z.infer<typeof createContainerSchema>>({
		resolver: zodResolver(createContainerSchema),
		defaultValues: {
			name: '',
		},
	});

	const onSubmit = form.handleSubmit((data) =>
		startTransition(async () => {
			await createContainer(data);
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
				<span className="hidden sm:block">Add Container</span>
			</DialogTrigger>
			<DialogContent>
				<Form {...form}>
					<form onSubmit={onSubmit} className="space-y-8">
						<DialogHeader>
							<DialogTitle>Add Container</DialogTitle>
						</DialogHeader>

						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel>Name</FormLabel>
									<FormControl>
										<Input
											disabled={isPending}
											placeholder="Enter a name for this container"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="type"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel>Type</FormLabel>
									<Select
										onValueChange={field.onChange}
										defaultValue={field.value}
									>
										<FormControl>
											<SelectTrigger>
												<SelectValue placeholder="Select the type of items that will go into this container" />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											{Object.keys(ContainerType).map((type) => (
												<SelectItem value={type} key={type}>
													{type}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<FormMessage />
								</FormItem>
							)}
						/>

						<DialogFooter>
							<Button type="submit" loading={isPending}>
								Add Container
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}

export function EditContainerDialog({
	container,
	disabled,
}: {
	container: Container;
	disabled: boolean;
}) {
	const [open, setOpen] = useState(false);
	const [isPending, startTransition] = useTransition();

	const form = useForm<z.infer<typeof editContainerSchema>>({
		resolver: zodResolver(editContainerSchema),
		defaultValues: {
			name: container.name,
			type: container.type,
		},
	});

	const onSubmit = form.handleSubmit((data) =>
		startTransition(async () => {
			await editContainer(container.id, data);
			setOpen(false);
		}),
	);

	useEffect(() => {
		form.reset({
			name: container.name,
			type: container.type,
		});
	}, [container.name, container.type]);
	return (
		<Dialog
			open={open}
			onOpenChange={(newOpen) => {
				if (!newOpen) {
					form.reset({
						name: container.name,
						type: container.type,
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
							<DialogTitle>Edit Container</DialogTitle>
						</DialogHeader>

						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel>Name</FormLabel>
									<FormControl>
										<Input
											disabled={isPending}
											placeholder="Enter a name for this container"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="type"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel>Type</FormLabel>
									<Select
										onValueChange={field.onChange}
										defaultValue={field.value}
									>
										<FormControl>
											<SelectTrigger>
												<SelectValue placeholder="Select the type of items that will go into this container" />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											{Object.keys(ContainerType).map((type) => (
												<SelectItem value={type} key={type}>
													{type}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<FormMessage />
								</FormItem>
							)}
						/>

						<DialogFooter>
							<Button type="submit" loading={isPending}>
								Edit Container
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}

export function DeleteContainerDialog({
	container,
	disabled,
}: {
	container: Container;
	disabled: boolean;
}) {
	const [open, setOpen] = useState(false);
	const [isPending, startTransition] = useTransition();
	const onSubmit = (e: FormEvent<HTMLFormElement>) =>
		startTransition(async () => {
			e.preventDefault();
			await deleteContainer(container.id);
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
					<DialogTitle>Delete Container</DialogTitle>
					<DialogDescription>
						Are you sure you want to delete {container.name}? This action is
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
