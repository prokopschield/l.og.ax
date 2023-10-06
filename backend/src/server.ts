import { listen } from 'nodesite.eu-local';

import { domain, port } from './constants';
import { query, ready } from './db';
import { modifyIndex, noErrorIndex } from './helpers';
import { shorten } from './shortener';

export const init = async () => {
	const { create } = listen({
		name: domain.replace(/\.+/g, ''),
		interface: 'http',
		port,
	});

	await ready;

	const ROOT_URL = new URL(`https://${domain}`);

	create('/', async (request) => {
		try {
			const fixed_url = request.uri
				.replace(/(https?)\:\/+([^\/])/, '$1://$2')
				.slice(1);

			const { pathname } = new URL(request.uri, ROOT_URL);

			if (pathname === '/') {
				return {
					statusCode: 302,
					head: {
						Location: '/homepage/',
					},
				};
			}

			let key = pathname.slice(1).toLowerCase();

			const link = await query('short_link')(key);

			if (link) {
				const { long_link } = link;

				return {
					statusCode: 302,
					head: {
						'Access-Control-Allow-Origin': '*',
						'Access-Control-Allow-Methods': '*',
						'Access-Control-Allow-Headers': '*',
						Location: long_link,
					},
				};
			}

			const url = new URL(fixed_url);

			if (url.host === domain) {
				return url.href;
			}

			return {
				statusCode: 200,
				head: {
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Methods': '*',
					'Access-Control-Allow-Headers': '*',
					'Content-Type': 'text/plain',
				},
				body: await shorten(url.href),
			};
		} catch (error) {
			return {
				statusCode: 400,
				body: String(error),
			};
		}
	});

	create('/homepage', async (request) => {
		const { searchParams } = new URL(request.uri, ROOT_URL);

		const error = searchParams.get('error') || '';

		const html = Buffer.from(error ? modifyIndex(error) : noErrorIndex);

		return {
			statusCode: 200,
			head: {
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': '*',
				'Access-Control-Allow-Headers': '*',
				'Content-Type': 'text/html',
				'Content-Length': String(html.length),
			},
			body: html,
		};
	});

	create('/new.php', async (request) => {
		let url = '';

		try {
			const { searchParams } = new URL(request.uri, ROOT_URL);

			const url_object = new URL(searchParams.get('url') || '');

			url = url_object.href;

			if (url_object.host !== domain) {
				url = await shorten(url);
			}

			return {
				statusCode: 200,
				head: {
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Methods': '*',
					'Access-Control-Allow-Headers': '*',
					'Content-Type': 'text/plain',
				},
				body: url,
			};
		} catch (error) {
			const redirect_url = new URL('/homepage/error', ROOT_URL);

			redirect_url.searchParams.set('error', String(error));
			redirect_url.searchParams.set('url', url);

			return {
				statusCode: 302,
				head: { Location: redirect_url.href },
			};
		}
	});
};
