'use client';

import { AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useState, useTransition } from 'react';
import { z } from 'zod';

import { Alert, AlertDescription } from '../../../components/ui/alert';
import { Button } from '../../../components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '../../../components/ui/card';
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
	useAppForm,
} from '../../../components/ui/form';
import { Input } from '../../../components/ui/input';
import { signUp } from '../_data/api';

const formSchema = z.object({
	username: z.string(),
	password: z.string(),
});

export default function SignupPage() {
	const form = useAppForm({
		schema: formSchema,
		defaultValues: { username: '', password: '' },
	});
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [error, setError] = useState(false);

	const onSubmit = form.handleSubmit((data) =>
		startTransition(async () => {
			const result = await signUp(data.username, data.password);

			if (result.success) {
				router.push('/dashboard');
			} else {
				setError(true);
			}
		}),
	);

	return (
		<div className="flex h-svh w-screen items-center justify-center">
			<div className="absolute top-0 flex w-full justify-end p-8">
				<Button variant="secondary">
					<Link href="/sign-in">Sign in</Link>
				</Button>
			</div>
			<Card className="mx-4 w-full max-w-md">
				<CardHeader>
					<CardTitle>Sign up</CardTitle>
					<CardDescription>
						Create a username and password to sign up.
					</CardDescription>
				</CardHeader>
				<Form {...form}>
					<form onSubmit={onSubmit}>
						<CardContent className="flex flex-col gap-4">
							{error && (
								<Alert variant="destructive">
									<AlertCircle className="h-4 w-4" />
									<AlertDescription>
										This username is taken. Please choose another.
									</AlertDescription>
								</Alert>
							)}

							<FormField
								control={form.control}
								name="username"
								render={({ field }) => (
									<FormItem className="w-full">
										<FormLabel>Username</FormLabel>
										<FormControl>
											<Input disabled={isPending} {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="password"
								render={({ field }) => (
									<FormItem className="w-full">
										<FormLabel>Password</FormLabel>
										<FormControl>
											<Input disabled={isPending} type="password" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</CardContent>
						<CardFooter>
							<Button className="w-full" type="submit" loading={isPending}>
								Sign up
							</Button>
						</CardFooter>
					</form>
				</Form>
			</Card>
		</div>
	);
}
