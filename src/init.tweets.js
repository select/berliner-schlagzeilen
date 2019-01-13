#!/usr/bin/env node
const fs = require('fs');
const moment = require('moment');

const config = require('./config');

const tweets = require(config.tweetsPath);
const tweetsIndex = new Set(tweets.map(({ img }) => img));

let lastDate = '';
const newTweets = fs
	.readdirSync(`${config.serverDataDir}/img`)
	.filter(file => /\d+-\d+-\d+\.\d+.jpg$/.test(file))
	.filter(file => !tweetsIndex.has(file))
	.map(file => {
		const m = moment(file, 'YYYY-MM-DD');
		let issue = 'Morgen-Ausgabe';
		let sendTime = '10:35';
		if (m.format('YYYY-MM-DD') === lastDate) {
			issue = 'Abend-Ausgabe';
			sendTime = '18:35';
		}
		lastDate = m.format('YYYY-MM-DD');
		const mToday = moment(file, 'YYYY-MM-DD').add(100, 'y');
		return (tweet = {
			sendAfter: `${mToday.format('YYYY-MM-DD')} ${sendTime}`,
			status: `${m.format('DD.MM.YYYY')} http://zefys.staatsbibliothek-berlin.de/kalender/auswahl/date/${m.format(
				'YYYY-MM-DD'
			)}/27971740 #1919LIVE`,
			alt_text: `Berliner Volkszeitung ${m.format('DD.MM.YYYY')} ${issue}`,
			img: file,
		});
	});

const allTweets = [...tweets, ...newTweets];
allTweets.sort(function(a, b) {
	return a.sendAfter < b.sendAfter ? -1 : +1;
});

// console.log("allTweets", allTweets);
fs.writeFileSync(config.tweetsPath, JSON.stringify(allTweets, null, 2));
process.stdout.write(`\nwrote file ${config.tweetsPath}\n`);
