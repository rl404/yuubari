import { env } from '$env/dynamic/private';
import { DISCORD_API_HOST } from '$lib/const';
import type { RequestHandler } from './$types';

export const GET = (async ({ url, cookies }) => {
	const resp = await fetch(`${DISCORD_API_HOST}/oauth2/token`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			client_id: env.DISCORD_CLIENT_ID || '',
			client_secret: env.DISCORD_CLIENT_SECRET || '',
			grant_type: 'authorization_code',
			code: url.searchParams.get('code') || '',
			redirect_uri: env.REDIRECT_URI || ''
		})
	});

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
