#!/usr/bin/env node
const fs = require('fs');
const Crawler = require('crawler');

const config = require('./config');

const data = require(config.date2mIdPath);

const urls = data.reduce(
	(acc, { date, ids }) => [
		...acc,
		...ids.map((id, index) => ({
			uri: `http://ztcs.staatsbibliothek-berlin.de/zefys_contentServer.php?action=metsImage&format=png&metsFile=${id}&divID=phys_1&width=1200&metsFileGroup=PRESENTATION`,
			filename: `${date}.${index}.png`,
		})),
	],
	[]
);

console.log('urls', urls);

var crawler = new Crawler({
	encoding: null,
	jQuery: false, // set false to suppress warning message.
	callback: function(err, res, done) {
		if (err) {
			console.error(err.stack);
		} else {
			fs.createWriteStream(`${config.dataDir}/img/raw/${res.options.filename}`).write(res.body);
		}
		done();
	},
});


// Queue a list of URLs
crawler.queue(urls);


crawler.on('drain', () => {
	console.log('Done!');
});
