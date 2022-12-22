import { cacheFn, Queue } from 'ps-std';

import { chars, domain, KEY_LENGTH } from './constants';
import { addRow, query } from './db';

const queue = new Queue(console.error);

export const shorten = cacheFn(async (url: string) => {
	const link = await query('long_link')(url);

	if (link) {
		return new URL(link.short_link, `https://${domain}`).href;
	}

	await queue.promise;

	const key = [...Array(KEY_LENGTH).keys()]
		.map(() => chars[Math.floor(Math.random() * 1024) % chars.length])
		.join('');

	const shortLink = new URL(key, `https://${domain}`).href;

	addRow(key, url);

	queue.next_async();

	return shortLink;
});
