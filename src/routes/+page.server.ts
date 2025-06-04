import { DISCORD_API_HOST } from '$lib/const';
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export type HomeResponse = {
	user?: User;
	guilds?: Guild[];
};

export type User = {
	id: string;
	username: string;
	avatar?: string;
};

export type Guild = {
	id: string;
	name: string;
	icon?: string;
	features: string[];
};

export const load = (async ({ cookies }) => {
	const token = cookies.get('access_token');
	if (!token) return;

	const expiredAt = cookies.get('expired_at_token');
	if (!expiredAt) return;

	const now = new Date();
	const expiredAtDate = new Date(expiredAt);
	if (expiredAtDate < now) return redirect(302, '/auth/refresh');

	const resps = await Promise.all([
		fetch(`${DISCORD_API_HOST}/users/@me`, {
			headers: { Authorization: `Bearer ${token}` }
		}),
		fetch(`${DISCORD_API_HOST}/users/@me/guilds`, {
			headers: { Authorization: `Bearer ${token}` }
		})
	]);

	for (const resp of resps) {
		if (!resp.ok) {
			if (resp.status === 401) return redirect(302, '/auth/login');
			return error(500, { message: 'Internal Error' });
		}
	}

	const userData = await resps[0].json();
	const guildsData = await resps[1].json();

	return {
		user: userData,
		guilds: guildsData
	};
}) satisfies PageServerLoad;
