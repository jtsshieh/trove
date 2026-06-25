import { redirect } from 'next/navigation';

/** The bathroom app opens on its Catalog tab. */
export default function BathroomPage() {
	redirect('/bathroom/catalog');
}
