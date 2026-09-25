import { createFileRoute, redirect } from '@tanstack/react-router';

/** L'ANCIENNE ADRESSE D'UN CLIENT, qui mène à sa page sous `/app/clients`. */
export const Route = createFileRoute('/app/debiteurs/$id')({
	beforeLoad: ({ params }) => {
		throw redirect({ to: '/app/clients/$id', params: { id: params.id }, replace: true });
	}
});
