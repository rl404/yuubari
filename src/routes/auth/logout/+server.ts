import type { RequestHandler } from './$types';
import { DISCORD_API_HOST } from '$lib/const';
import { DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET } from '$env/static/private';

export const GET = (async ({ cookies }) => {
	const token = cookies.get('refresh_token');
	if (!token) {
		return new Response(null, {
			status: 302,
			headers: {
				Location: '/'
			}
		});
	}

	const resp = await fetch(`${DISCORD_API_HOST}/oauth2/token/revoke`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			client_id: DISCORD_CLIENT_ID || '',
			client_secret: DISCORD_CLIENT_SECRET || '',
			token: token || ''
		})
	});

	if (!resp.ok) {
		if (resp.status === 401) {
			return new Response(null, {
				status: 302,
				headers: {
					Location: '/auth/login'
				}
			});
		}
		return new Response(null, { status: 500 });
	}

	cookies.getAll().map((c) => cookies.delete(c.name, { path: '/' }));

	return new Response(null, {
		status: 302,
		headers: {
			Location: '/'
		}
	});
}) satisfies RequestHandler;
