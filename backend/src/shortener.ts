import { cacheFn, Queue } from "ps-std";

import { domain } from "./constants";
import { addRow, query } from "./db";
import { generateKey } from "./keygen";

const queue = new Queue(console.error);

export const shorten = cacheFn(async (url: string) => {
	const link = await query("long_link")(url);

	if (link) {
		return new URL(link.short_link, `https://${domain}`).href;
	}

	await queue.promise;

	const key = await generateKey();

	const shortLink = new URL(key, `https://${domain}`).href;

	addRow(key, url);

	queue.next_async();

	return shortLink;
});
