#!/usr/bin/env node

const Crawler = require('crawler');
const jsdom = require('jsdom');
const moment = require('moment');
const fs = require('fs');
// const path = require('path');

const config = require('./config');

const range = (start, end) =>
	Array(end - start + 1)
		.fill()
		.map((_, idx) => start + idx);

const allIds = [];
let count = 0;
const crawler = new Crawler({
	// rateLimit: 200,
	userAgent:
		'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/57.0.2987.111 Safari/537.36 Vivaldi/1.8.770.50',
	jQuery: jsdom,
	maxConnections: 3,
	// This will be called for each crawled page
	callback: (error, res, done) => {
		if (error) {
			process.stderr.write(error);
		} else {
			const posts = Array.from(res.$('.tx-zefyskalender-pi2 a[href^="index"]'));
			const ids = posts.map(el => {
				const match = /content.staatsbibliothek-berlin.de%2Fzefys%2F([\w-]+)\.xml/.exec(el.href);
				return match[1]
			}).filter((item, pos, self) => self.indexOf(item) === pos);
			allIds.push({
				date: res.options.date,
				ids,
			});
			process.stdout.write(`Page ${count++} - found ${ids.length} items \r`);
			if(!ids.length) {
				console.warn('failed: ', res.request.uri.href);
			}
		}
		done();
	},
});

const oneHundredYearsAgo = moment().subtract(100, 'years').subtract(1, 'days');
// const urls = range(0, 500).map(() => {
const urls = range(0, 700).map(() => {
	const date = oneHundredYearsAgo.add(1, 'days').format('YYYY-MM-DD');
	return {
		uri: `http://zefys.staatsbibliothek-berlin.de/kalender/auswahl/date/${date}/27971740/?no_cache=1`,
		date,
	};
});

console.log(`Crawling ${urls.length} URLs`);

// Queue a list of URLs
crawler.queue(urls);


crawler.on('drain', () => {
	fs.writeFileSync(config.date2mIdPath, JSON.stringify(allIds, null, 2));
	process.stdout.write(`\nwrote file ${config.date2mIdPath}\n`);
});
