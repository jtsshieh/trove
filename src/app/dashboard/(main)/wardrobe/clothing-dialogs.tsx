'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { Brand, Clothing, ClothingType } from '@/generated/prisma/client';
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
import { generateClothingName } from '../../../../lib/generate-clothing-name';
import { createClothing, deleteClothing, editClothing } from './_data/actions';
import { createClothingSchema, editClothingSchema } from './_data/schemas';
import { colors } from './constants';

interface CreateClothingDialogProps {
	brands: Brand[];
	types: ClothingType[];
}

export function CreateClothingDialog({
	brands,
	types,
}: CreateClothingDialogProps) {
	const [open, setOpen] = useState(false);
	const [isPending, startTransition] = useTransition();
	const form = useForm<z.infer<typeof createClothingSchema>>({
		resolver: zodResolver(createClothingSchema),
	});

	const onSubmit = form.handleSubmit((data) =>
		startTransition(async () => {
			await createClothing(data);
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
				<span className="hidden sm:block">Add Clothing</span>
			</DialogTrigger>
			<DialogContent className="max-h-[90vh] overflow-y-scroll">
				<Form {...form}>
					<form onSubmit={onSubmit} className="space-y-8">
						<DialogHeader>
							<DialogTitle>Create clothing</DialogTitle>
						</DialogHeader>
						<FormField
							control={form.control}
							name="type"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel>Type</FormLabel>
									<Select
										value={field.value}
										onValueChange={field.onChange}
										disabled={isPending}
									>
										<FormControl>
											<SelectTrigger>
												<SelectValue placeholder="Select the type of clothing" />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											{types.map((type) => (
												<SelectItem key={type.name} value={type.name}>
													{type.name}
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
							name="brand"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel>Brand</FormLabel>
									<Select
										value={field.value}
										onValueChange={field.onChange}
										disabled={isPending}
									>
										<FormControl>
											<SelectTrigger>
												<SelectValue placeholder="Select the brand of clothing" />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											{brands.map((brand) => (
												<SelectItem key={brand.name} value={brand.name}>
													{brand.name}
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
							name="brandLine"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel>Brand Line</FormLabel>
									<Input
										disabled={isPending}
										placeholder="Enter an optional line of clothing for this brand"
										{...field}
									/>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="color"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel>Color</FormLabel>
									<Select
										value={field.value}
										onValueChange={field.onChange}
										disabled={isPending}
									>
										<FormControl>
											<SelectTrigger>
												<SelectValue placeholder="Select the color of clothing" />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											{colors.map((color) => (
												<SelectItem key={color} value={color}>
													{color}
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
							name="modifier"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel>Modifier</FormLabel>
									<Input
										disabled={isPending}
										placeholder="Enter an optional modifier for this item of clothing"
										{...field}
									/>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="number"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel>Modifier</FormLabel>
									<Input
										type="number"
										disabled={isPending}
										placeholder="Enter an optional number for this item of clothing"
										{...field}
										onChange={(event) => field.onChange(+event.target.value)}
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

export function EditClothingDialog({
	clothing,
	brands,
	types,
}: {
	clothing: Clothing;
	brands: Brand[];
	types: ClothingType[];
}) {
	const [open, setOpen] = useState(false);
	const [isPending, startTransition] = useTransition();
	const form = useForm<z.infer<typeof editClothingSchema>>({
		resolver: zodResolver(editClothingSchema),
		defaultValues: {
			brandLine: clothing.brandLine ?? undefined,
			color: clothing.color,
			number: clothing.number ?? undefined,
			modifier: clothing.modifier ?? undefined,

			type: clothing.typeName,
			brand: clothing.brandName,
		},
	});

	const onSubmit = form.handleSubmit((data) =>
		startTransition(async () => {
			await editClothing(clothing.id, data);
			setOpen(false);
		}),
	);

	useEffect(() => {
		form.reset({
			brandLine: clothing.brandLine ?? undefined,
			color: clothing.color,
			number: clothing.number ?? undefined,
			modifier: clothing.modifier ?? undefined,

			type: clothing.typeName,
			brand: clothing.brandName,
		});
	}, [clothing]);
	return (
		<Dialog
			open={open}
			onOpenChange={(newOpen) => {
				if (!newOpen) {
					form.reset({
						brandLine: clothing.brandLine ?? undefined,
						color: clothing.color,
						number: clothing.number ?? undefined,
						modifier: clothing.modifier ?? undefined,

						type: clothing.typeName,
						brand: clothing.brandName,
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
			<DialogContent className="max-h-[90vh] overflow-y-scroll">
				<Form {...form}>
					<form onSubmit={onSubmit} className="space-y-8">
						<DialogHeader>
							<DialogTitle>Edit clothing</DialogTitle>
						</DialogHeader>
						<FormField
							control={form.control}
							name="type"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel>Type</FormLabel>
									<Select
										value={field.value}
										onValueChange={field.onChange}
										disabled={isPending}
									>
										<FormControl>
											<SelectTrigger>
												<SelectValue placeholder="Select the type of clothing" />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											{types.map((type) => (
												<SelectItem key={type.name} value={type.name}>
													{type.name}
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
							name="brand"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel>Brand</FormLabel>
									<Select
										value={field.value}
										onValueChange={field.onChange}
										disabled={isPending}
									>
										<FormControl>
											<SelectTrigger>
												<SelectValue placeholder="Select the brand of clothing" />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											{brands.map((brand) => (
												<SelectItem key={brand.name} value={brand.name}>
													{brand.name}
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
							name="brandLine"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel>Brand Line</FormLabel>
									<Input
										disabled={isPending}
										placeholder="Enter an optional line of clothing for this brand"
										{...field}
									/>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="color"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel>Color</FormLabel>
									<Select
										value={field.value}
										onValueChange={field.onChange}
										disabled={isPending}
									>
										<FormControl>
											<SelectTrigger>
												<SelectValue placeholder="Select the color of clothing" />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											{colors.map((color) => (
												<SelectItem key={color} value={color}>
													{color}
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
							name="modifier"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel>Modifier</FormLabel>
									<Input
										disabled={isPending}
										placeholder="Enter an optional modifier for this item of clothing"
										{...field}
									/>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="number"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel>Modifier</FormLabel>
									<Input
										type="number"
										disabled={isPending}
										placeholder="Enter an optional number for this item of clothing"
										{...field}
										onChange={(event) => field.onChange(+event.target.value)}
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
export function DeleteClothingDialog({ clothing }: { clothing: Clothing }) {
	const [open, setOpen] = useState(false);
	const [isPending, startTransition] = useTransition();
	const onSubmit = (e: FormEvent<HTMLFormElement>) =>
		startTransition(async () => {
			e.preventDefault();
			await deleteClothing(clothing.id);
			setOpen(false);
		});

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger render={<Button size="icon" variant="destructive" />}>
				<Trash />
			</DialogTrigger>
			<DialogContent render={<form onSubmit={onSubmit} />}>
				<DialogHeader>
					<DialogTitle>Delete clothing</DialogTitle>
					<DialogDescription>
						Are you sure you want to delete {generateClothingName(clothing)}?
						This action is irreversible.
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
