'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { Trip } from '@/generated/prisma/client';
import { format } from 'date-fns';
import { CalendarIcon, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, {
	Fragment,
	PropsWithChildren,
	ReactNode,
	useEffect,
	useState,
	useTransition,
} from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import {
	createTrip,
	deleteTrip,
	editTrip,
} from '../(trip-viewer)/[tripId]/_data/actions';
import { createTripSchema } from '../(trip-viewer)/[tripId]/_data/schemas';
import { Button } from '../../../components/ui/button';
import { Calendar } from '../../../components/ui/calendar';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '../../../components/ui/dialog';
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '../../../components/ui/form';
import { Input } from '../../../components/ui/input';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '../../../components/ui/popover';
import { cn } from '../../../lib/utils';

type BaseCreateEditTripDialogProps =
	| { type: 'create' }
	| { type: 'edit'; trip: Trip };

export function BaseCreateEditTripForm(
	props: BaseCreateEditTripDialogProps & {
		onSubmit?: () => void;
		ContentWrapper?: (props: PropsWithChildren) => ReactNode;
		SubmitWrapper?: (props: PropsWithChildren) => ReactNode;
	},
) {
	const { type } = props;
	const router = useRouter();

	const [isPending, startTransition] = useTransition();

	const ContentWrapper = props.ContentWrapper ?? Fragment;
	const SubmitWrapper = props.SubmitWrapper ?? Fragment;

	const form = useForm<z.infer<typeof createTripSchema>>({
		resolver: zodResolver(createTripSchema),
		defaultValues: {
			name: type === 'edit' ? props.trip.name : undefined,
			date: {
				from: type === 'edit' ? props.trip.start : undefined,
				to: type === 'edit' ? props.trip.end : undefined,
			},
		},
	});
	const [calendarOpen, setCalendarOpen] = useState(false);

	useEffect(
		() => {
			if (type === 'edit')
				form.reset({
					name: props.trip.name,
					date: { from: props.trip.start, to: props.trip.end },
				});
		},
		type === 'edit' ? [props.trip.name, props.trip.start, props.trip.end] : [],
	);

	const onSubmit = form.handleSubmit((data) =>
		startTransition(async () => {
			if (type === 'create') {
				const result = await createTrip(data);
				if (result?.data) {
					router.push(`/dashboard/${result.data.tripId}`);
				} else {
					throw new Error(':(');
				}
			} else {
				await editTrip(props.trip.id, data);
				props.onSubmit ? props.onSubmit() : void 0;
			}
		}),
	);
	return (
		<Form {...form}>
			<form onSubmit={onSubmit}>
				<ContentWrapper>
					<div className="flex flex-col gap-4">
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Name</FormLabel>
									<FormControl>
										<Input
											disabled={isPending}
											placeholder="Give your trip a nice title"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="date"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel>Dates</FormLabel>
									<Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
										<PopoverTrigger render={<FormControl />}>
											<Button
												disabled={isPending}
												variant="outline"
												className={cn('pl-3 text-left font-normal')}
											>
												{field.value?.from ? (
													field.value?.to ? (
														<>
															{format(field.value.from, 'LLL dd, y')} -{' '}
															{format(field.value.to, 'LLL dd, y')}
														</>
													) : (
														format(field.value.from, 'LLL dd, y')
													)
												) : (
													<span>Select the dates of your trip</span>
												)}
												<CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
											</Button>
										</PopoverTrigger>
										<PopoverContent className="w-auto p-0" align="start">
											<Calendar
												mode="range"
												defaultMonth={field.value?.from}
												numberOfMonths={2}
												selected={field.value}
												onSelect={(e) => {
													field.onChange(e);
													if (e?.to && e?.from) setCalendarOpen(false);
												}}
											/>
										</PopoverContent>
									</Popover>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>
				</ContentWrapper>
				<SubmitWrapper>
					<Button type="submit" loading={isPending}>
						Save changes
					</Button>
				</SubmitWrapper>
			</form>
		</Form>
	);
}

export function CreateTripDialog() {
	return (
		<Dialog>
			<DialogTrigger
				render={
					<Button size="icon" className="gap-1 sm:w-auto sm:px-4 sm:py-2" />
				}
			>
				<Plus />
				<span className="hidden sm:block">Create Trip</span>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Create Trip</DialogTitle>
				</DialogHeader>
				<BaseCreateEditTripForm
					SubmitWrapper={({ children }) => (
						<DialogFooter className="mt-8">{children}</DialogFooter>
					)}
					type="create"
				/>
			</DialogContent>
		</Dialog>
	);
}

export function DeleteTripDialog({ trip }: { trip: Trip }) {
	const [open, setOpen] = useState(false);
	const [isPending, startTransition] = useTransition();

	const router = useRouter();

	const onClick = () =>
		startTransition(async () => {
			await deleteTrip(trip.id);
			router.push(`/dashboard`);
		});

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger render={<Button variant="destructive" />}>
				Delete Trip
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Delete trip</DialogTitle>
					<DialogDescription>
						Are you sure you want to delete {trip.name}? This action is
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
					>
						Cancel
					</Button>
					<Button
						type="submit"
						onClick={onClick}
						loading={isPending}
						className="flex gap-1"
					>
						Delete
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
