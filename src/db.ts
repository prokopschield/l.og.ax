import fs from 'fs';
import nsblob from 'nsblob';
import { cacheFn, SerialQueue } from 'ps-std';

import { dbfile } from './constants';

const db = Array<string[]>();

export const fetchStr = (hash: string) => {
	if (hash.length === 64) {
		return nsblob.fetch(hash).then(String);
	} else if (hash.length === 43 || hash.length === 44) {
		return nsblob
			.fetch(Buffer.from(hash, 'base64').toString('hex'))
			.then(String);
	} else {
		return Promise.resolve(hash);
	}
};

export const storeStr = async (str: string) => {
	const hash = str.match(/^[a-f0-9]{64}$/) ? str : await nsblob.store(str);

	return Buffer.from(hash, 'hex').toString('base64').slice(0, -1);
};

export const ready = (async () => {
	const dbblob = await fs.promises.readFile(dbfile, 'utf-8').catch((e) => '');

	await Promise.all(
		dbblob
			.split(/\n+/g)
			.filter((a) => a)
			.map(async (line) => {
				db.push(
					await Promise.all(
						line
							.split(/\,/g)
							.map((value) =>
								value.length <= 40 ? value : fetchStr(value)
							)
					)
				);
			})
	);
})();

export const query = cacheFn((index: number) =>
	cacheFn((value: string) => {
		for (const line of db) {
			if (line[index] === value) {
				return [...line];
			}
		}
	})
);

const dbWriter = fs.createWriteStream(dbfile, {
	flags: 'a',
});

export const serializer = new SerialQueue(console.error);

export const addRow = (...row: string[]) => {
	const values_p = Promise.all(
		row.map((line) =>
			line.match(/^[a-z0-9]{0,40}$/gi) ? line : storeStr(line)
		)
	);

	return serializer.add(async () => {
		await ready;
		const id = String(db.length + 1);
		const values = await values_p;

		dbWriter.write([id, ...values].join(',') + '\n');
		db.push([id, ...row]);

		return query(0)(id);
	});
};
