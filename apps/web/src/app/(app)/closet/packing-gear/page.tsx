import { redirect } from 'next/navigation';

export default async function PackingGear() {
	redirect('/closet/packing-gear/luggage');
	return null;
}
