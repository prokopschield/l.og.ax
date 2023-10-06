import fs from "fs";
import { sanitize } from "isomorphic-dompurify";

export const modifyIndex = (error: string) => {
	const index = fs.readFileSync(__dirname + "/../src/index.html", "utf-8");

	return index.replace(
		"{{ ERROR }}",
		error ? `<blockquote>${sanitize(error)}</blockquote>` : ""
	);
};

export const noErrorIndex = modifyIndex("");
