import { cn } from '@/lib/utils';

export function EmptyList({
	main,
	sub,
	className,
}: {
	main: string;
	sub: string;
	className?: string;
}) {
	return (
		<div className={cn('flex flex-1 flex-col', className)}>
			<div className="flex flex-1 items-center justify-center rounded-xl border border-dashed">
				<div className="flex flex-col items-center gap-1 p-4 text-center">
					<h3 className="text-2xl font-bold">{main}</h3>
					<p className="text-sm text-neutral-500">{sub}</p>
				</div>
			</div>
		</div>
	);
}
