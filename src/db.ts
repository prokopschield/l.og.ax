import fs from 'fs';
import nsblob from 'nsblob';
import { Database, descriptors } from 'nscdn-csvdb';
import { cacheFn, SerialQueue } from 'ps-std';

import { new_db_dir, new_db_name } from './constants';

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

const schema = {
	serial_number: descriptors.JsNumberType,
	short_link: descriptors.JsStringType,
	long_link: {
		deserializer: (value: Buffer) => fetchStr(String(value)),
		serializer: descriptors.JsStringType.serializer,
	},
};

const database = new Database(new_db_dir);
const table_promise = database.getTable(new_db_name, schema);

export const ready = table_promise.then(() => {});

export const query = cacheFn(
	(index: keyof typeof schema) => async (value: string) => {
		const table = await table_promise;
		const results = await table.find({ [index]: value });

		for (const result of results) {
			if (result[index] === value) {
				return result;
			}
		}
	}
);

export const serializer = new SerialQueue(console.error);

export const addRow = (short_link: string, long_link: string) => {
	return serializer.add(async () => {
		const table = await table_promise;
		const [{ serial_number }] = await table.find({}, '| wc -l');

		await table.insert({ serial_number, short_link, long_link });

		return query('short_link')(short_link);
	});
};
