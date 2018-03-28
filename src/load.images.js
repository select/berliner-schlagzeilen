#!/usr/bin/env node
const fs = require('fs');
const Crawler = require('crawler');

const config = require('./config');

const data = require(config.date2mIdPath);

const urls = data.reduce(
	(acc, { date, ids }) => [
		...acc,
		...ids.filter((id, index) => !fs.existsSync(`${config.dataDir}/raw/${date}.${index}.png`)).map((id, index) => ({
			uri: `http://content.staatsbibliothek-berlin.de/zefys/${id}/full/1200,/0/default.jpg`,
			filename: `${date}.${index}.png`,
		})),
	],
	[]
);

// 27971740
// http://content.staatsbibliothek-berlin.de/zefys/SNP27971740-19180328-0-1-0-0/full/1200,/0/default.jpg

console.log('num urls', urls.length);

const crawler = new Crawler({
	encoding: null,
	jQuery: false, // set false to suppress warning message.
	maxConnections: 2,
	callback: (err, res, done) => {
		if (err) {
			console.error(err.stack);
		} else {
			fs.createWriteStream(`${config.dataDir}/raw/${res.options.filename}`).write(res.body);
		}
		done();
	},
});

// Queue a list of URLs
crawler.queue(urls);

crawler.on('drain', () => {
	console.log('Done!');
});
