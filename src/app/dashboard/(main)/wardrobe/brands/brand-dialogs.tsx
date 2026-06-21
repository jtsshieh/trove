'use client';

import type { Brand } from '@/generated/prisma/client';
import { Plus, Trash } from 'lucide-react';
import React, { FormEvent, useEffect, useState } from 'react';

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
	useAppForm,
} from '../../../../../components/ui/form';
import { Input } from '../../../../../components/ui/input';
import {
	useCreateBrand,
	useDeleteBrand,
	useEditBrand,
} from './_data/mutations';
import { createBrandSchema, editBrandSchema } from './_data/schemas';

export function CreateBrandDialog() {
	const [open, setOpen] = useState(false);
	const createBrand = useCreateBrand();
	const isPending = createBrand.isPending;
	const form = useAppForm({
		schema: createBrandSchema,
		defaultValues: { name: '' },
	});

	const onSubmit = form.handleSubmit(async (data) => {
		try {
			await createBrand.mutateAsync(data);
			form.reset();
			setOpen(false);
		} catch {
			// onError toast already shown; keep the dialog open for a retry.
		}
	});

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger render={<Button size="icon" />}>
				<Plus />
			</DialogTrigger>
			<DialogContent>
				<Form {...form}>
					<form onSubmit={onSubmit} className="space-y-8">
						<DialogHeader>
							<DialogTitle>Create brand</DialogTitle>
						</DialogHeader>
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel>Name</FormLabel>
									<Input
										disabled={isPending}
										placeholder="Enter a name for this brand"
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

export function EditBrandDialog({ brand }: { brand: Brand }) {
	const [open, setOpen] = useState(false);
	const editBrand = useEditBrand();
	const isPending = editBrand.isPending;
	const form = useAppForm({
		schema: editBrandSchema,
		defaultValues: {
			name: brand.name,
		},
	});

	const onSubmit = form.handleSubmit(async (data) => {
		try {
			await editBrand.mutateAsync({ name: brand.name, input: data });
			setOpen(false);
		} catch {
			// onError toast already shown; keep the dialog open for a retry.
		}
	});

	useEffect(() => {
		form.reset({
			name: brand.name,
		});
	}, [brand.name]);

	return (
		<Dialog
			open={open}
			onOpenChange={(newOpen) => {
				if (!newOpen) {
					form.reset({
						name: brand.name,
					});
					setOpen(false);
				} else {
					setOpen(true);
				}
			}}
		>
			<DialogTrigger render={<Button />}>Edit</DialogTrigger>
			<DialogContent>
				<Form {...form}>
					<form onSubmit={onSubmit} className="space-y-8">
						<DialogHeader>
							<DialogTitle>Edit brand</DialogTitle>
						</DialogHeader>
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel>Name</FormLabel>
									<Input
										disabled={isPending}
										placeholder="Enter a name for this brand"
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

export function DeleteBrandDialog({ brand }: { brand: Brand }) {
	const [open, setOpen] = useState(false);
	const deleteBrand = useDeleteBrand();
	const isPending = deleteBrand.isPending;
	const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		try {
			await deleteBrand.mutateAsync(brand.name);
			setOpen(false);
		} catch {
			// onError toast already shown; keep the dialog open for a retry.
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger render={<Button size="icon" variant="destructive" />}>
				<Trash />
			</DialogTrigger>
			<DialogContent render={<form onSubmit={onSubmit} />}>
				<DialogHeader>
					<DialogTitle>Delete brand</DialogTitle>
					<DialogDescription>
						Are you sure you want to delete {brand.name}? This action is
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
