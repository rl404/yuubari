/* eslint-disable @typescript-eslint/no-explicit-any */
export const getDiscordImage = (hash: string): string => {
	if (hash === '') return '';
	if (hash.length > 2 && hash.slice(0, 2) === 'a_') return hash + '.gif';
	return hash + '.png';
};

export const getDiscordTitle = (str: string): string => {
	if (str.length <= 2) return str;
	const split = str.split(' ');
	if (split.length >= 2) return split[0][0].toUpperCase() + split[1][0].toUpperCase();
	return str.slice(0, 2).toUpperCase();
};

export const clickOutside = (node: any, callback: () => void) => {
	const handleClick = (event: any) => {
		if (node && !node.contains(event.target) && !event.defaultPrevented) {
			callback();
		}
	};
	document.addEventListener('click', handleClick, true);
	return {
		destroy() {
			document.removeEventListener('click', handleClick, true);
		}
	};
};
