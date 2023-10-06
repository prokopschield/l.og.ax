import { KEY_LENGTH, chars } from "./constants";
import { query } from "./db";

export async function generateKey() {
	do {
		const key = [...Array(KEY_LENGTH).keys()]
			.map(() => chars[Math.floor(Math.random() * 1024) % chars.length])
			.join("");

		if (await query("short_link")(key)) {
			continue;
		} else {
			return key;
		}
	} while (true);
}
