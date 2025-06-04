import { DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET } from '$env/static/private';
import { DISCORD_API_HOST } from '$lib/const';
import type { RequestHandler } from './$types';

export const GET = (async ({ cookies }) => {
	const refreshToken = cookies.get('refresh_token');
	if (!refreshToken) {
		return new Response(null, {
			status: 302,
			headers: {
				Location: '/auth/login'
			}
		});
	}

	const resp = await fetch(`${DISCORD_API_HOST}/oauth2/token`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			client_id: DISCORD_CLIENT_ID || '',
			client_secret: DISCORD_CLIENT_SECRET || '',
			grant_type: 'refresh_token',
			refresh_token: refreshToken || ''
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

	const token = await resp.json();
	const now = new Date();
	now.setSeconds(now.getSeconds() + token.expires_in);

	cookies.set('access_token', token.access_token, { path: '/' });
	cookies.set('refresh_token', token.refresh_token, { path: '/' });
	cookies.set('expired_at_token', now.toString(), { path: '/' });

	return new Response(null, {
		status: 302,
		headers: {
			Location: '/'
		}
	});
}) satisfies RequestHandler;
