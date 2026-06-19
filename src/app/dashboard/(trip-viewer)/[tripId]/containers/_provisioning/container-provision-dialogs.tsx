'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type {
	Container,
	ContainerProvision,
	Trip,
} from '@/generated/prisma/client';
import { ChevronsUpDown, Plus, Trash } from 'lucide-react';
import React, { FormEvent, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '../../../../../../components/ui/button';
import {
	Command,
	CommandEmpty,
	CommandInput,
	CommandItem,
	CommandList,
} from '../../../../../../components/ui/command';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '../../../../../../components/ui/dialog';
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '../../../../../../components/ui/form';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '../../../../../../components/ui/popover';
import { ScrollArea } from '../../../../../../components/ui/scroll-area';
import { cn } from '../../../../../../lib/utils';
import {
	createContainerProvision,
	deleteContainerProvision,
} from './_data/actions';
import { createContainerProvisionSchema } from './_data/schemas';

interface CreateContainerProvisionDialogProps {
	trip: Trip;
	containers: Container[];
}
export function CreateContainerProvisionDialog({
	trip,
	containers,
}: CreateContainerProvisionDialogProps) {
	const [open, setOpen] = useState(false);

	const [comboOpen, setComboOpen] = useState(false);

	const [isPending, startTransition] = useTransition();

	const form = useForm<z.infer<typeof createContainerProvisionSchema>>({
		resolver: zodResolver(createContainerProvisionSchema),
	});
	const onSubmit = form.handleSubmit((data) =>
		startTransition(async () => {
			await createContainerProvision(trip.id, data);
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
					<Button size="icon" className="gap-1 md:w-auto md:px-4 md:py-2" />
				}
			>
				<Plus />
				<span className="hidden md:block">Add Container</span>
			</DialogTrigger>
			<DialogContent>
				<Form {...form}>
					<form onSubmit={onSubmit} className="space-y-8">
						<DialogHeader>
							<DialogTitle>Add Container Provision</DialogTitle>
						</DialogHeader>
						<FormField
							control={form.control}
							name="containerId"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel>Container</FormLabel>
									<Popover open={comboOpen} onOpenChange={setComboOpen}>
										<PopoverTrigger render={<FormControl />}>
											<Button
												disabled={isPending}
												variant="outline"
												role="combobox"
												className={cn(
													'flex justify-between',
													!field.value && 'text-neutral-600',
												)}
											>
												{field.value
													? containers.find((a) => a.id === field.value)?.name
													: "Select the container you'd like to add"}
												<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
											</Button>
										</PopoverTrigger>
										<PopoverContent
											className="w-[--radix-popover-trigger-width] p-0"
											align="start"
										>
											<Command>
												<CommandInput placeholder="Search your containers..." />
												<ScrollArea>
													<CommandList>
														<CommandEmpty>No containers found.</CommandEmpty>
														{containers.map((container) => (
															<CommandItem
																value={container.name}
																key={container.id}
																onSelect={() => {
																	form.setValue('containerId', container.id);
																	setComboOpen(false);
																}}
															>
																{container.name}
															</CommandItem>
														))}
													</CommandList>
												</ScrollArea>
											</Command>
										</PopoverContent>
									</Popover>
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

export function DeleteContainerProvisionDialog({
	containerProvision,
}: {
	containerProvision: ContainerProvision & {
		container: Container;
	};
}) {
	const [open, setOpen] = useState(false);
	const [isPending, startTransition] = useTransition();
	const onSubmit = (e: FormEvent<HTMLFormElement>) =>
		startTransition(async () => {
			e.preventDefault();
			await deleteContainerProvision(containerProvision.id);
			setOpen(false);
		});

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger render={<Button size="icon" variant="destructive" />}>
				<Trash />
			</DialogTrigger>
			<DialogContent render={<form onSubmit={onSubmit} />}>
				<DialogHeader>
					<DialogTitle>Delete Luggage Provision</DialogTitle>
					<DialogDescription>
						Are you sure you want to remove {containerProvision.container.name}{' '}
						from this trip? This container will NOT be deleted, only it's
						provision to this trip.
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
