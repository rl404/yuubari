/** Convert an HTTP Retry-After delay or date to milliseconds. */
export function retryAfterMs(value: string | null, now = Date.now()): number {
	if (!value?.trim()) return 0;
	const seconds = Number(value);
	if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
	const date = Date.parse(value);
	return Number.isFinite(date) ? Math.max(0, date - now) : 0;
}

/** Wait for a retry without leaving a timer behind when the page closes. */
export function waitForRetry(delay: number, signal?: AbortSignal): Promise<boolean> {
	if (signal?.aborted) return Promise.resolve(false);
	return new Promise((resolve) => {
		const timer = setTimeout(() => finish(true), delay);
		const abort = () => finish(false);
		function finish(ready: boolean) {
			clearTimeout(timer);
			signal?.removeEventListener('abort', abort);
			resolve(ready);
		}
		signal?.addEventListener('abort', abort, { once: true });
	});
}
