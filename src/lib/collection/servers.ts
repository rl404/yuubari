import { writable } from 'svelte/store';
import { loadGuilds, type CatalogEntry, type CatalogGuild, type GuildState } from '../catalog.ts';

export type ServerCollectionState = {
	guilds: CatalogGuild[];
	states: Record<string, GuildState>;
	entries: CatalogEntry[];
	failed: GuildState[];
	completed: number;
	loading: boolean;
	retrying: boolean;
	reloadingId: string;
	retryTotal: number;
};

/** Owns server requests, refreshes, cooldowns, and cancellation. No DOM access. */
export function createServerCollection(guilds: CatalogGuild[], request: typeof fetch = fetch) {
	const eligible = guilds.filter((guild) => guild.features.includes('DISCOVERABLE'));
	const controller = new AbortController();
	let states: Record<string, GuildState> = {};
	let loading = true;
	let retrying = false;
	let reloadingId = '';
	let retryTotal = 0;
	let waitingUntil = 0;
	let timer: ReturnType<typeof setInterval> | undefined;

	function retrySeconds() {
		const failed = Object.values(states).filter((state) => state.status === 'error');
		const nextRetryAt = Math.max(waitingUntil, 0, ...failed.map((state) => state.retryAt || 0));
		return Math.max(0, Math.ceil((nextRetryAt - Date.now()) / 1000));
	}
	const cooldown = writable(0);
	const updateCooldown = () => cooldown.set(retrySeconds());

	function snapshot(): ServerCollectionState {
		const values = Object.values(states);
		const failed = values.filter((state) => state.status === 'error');
		return {
			guilds: eligible,
			states,
			entries: values
				.flatMap((state) => state.entries)
				.sort((a, b) => a.name.localeCompare(b.name)),
			failed,
			completed: values.filter((state) => state.status === 'loaded' || state.status === 'error')
				.length,
			loading,
			retrying,
			reloadingId,
			retryTotal
		};
	}
	const store = writable(snapshot());
	const publish = () => {
		store.set(snapshot());
		updateCooldown();
	};

	async function load(targets: CatalogGuild[], refresh = false) {
		loading = true;
		publish();
		try {
			await loadGuilds(
				targets,
				(state) => {
					// A refresh never blanks the previous collection, even if the request fails.
					if (state.retryAt) waitingUntil = Math.max(waitingUntil, state.retryAt);
					if (refresh && state.status === 'loading') {
						updateCooldown();
						return;
					}
					const previous = states[state.guildId];
					if (refresh && state.status === 'error' && previous?.entries.length) {
						state = {
							...state,
							entries: previous.entries,
							error: `${state.error} Showing the previous collection.`
						};
					}
					states = { ...states, [state.guildId]: state };
					publish();
				},
				{ signal: controller.signal, fetch: request, refresh }
			);
		} finally {
			if (!controller.signal.aborted) {
				loading = false;
				waitingUntil = 0;
				publish();
			}
		}
	}

	async function start() {
		if (timer || controller.signal.aborted) return;
		timer = setInterval(updateCooldown, 1000);
		await load(eligible);
	}

	async function retryFailed() {
		const state = snapshot();
		if (loading || retrySeconds() > 0 || !state.failed.length) return;
		const ids = new Set(state.failed.map((server) => server.guildId));
		retryTotal = ids.size;
		retrying = true;
		try {
			await load(
				eligible.filter((guild) => ids.has(guild.id)),
				true
			);
		} finally {
			retrying = false;
			publish();
		}
	}

	async function reload(guild: CatalogGuild) {
		if (loading || retrySeconds() > 0) return;
		reloadingId = guild.id;
		try {
			await load([guild], true);
		} finally {
			reloadingId = '';
			publish();
		}
	}

	function destroy() {
		controller.abort();
		clearInterval(timer);
	}
	return {
		subscribe: store.subscribe,
		cooldown: { subscribe: cooldown.subscribe },
		start,
		retryFailed,
		reload,
		destroy
	};
}
