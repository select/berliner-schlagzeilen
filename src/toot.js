#!/usr/bin/env nodejs
const fs = require('fs');
const Masto = require('mastodon');
const moment = require('moment');
const config = require('./config');

const dataDir = process.argv[2] || config.serverDataDir;
const errorLogPath = `${__dirname}/../log/error.log`;
const now = moment(new Date());
const tweetsPath = `${dataDir}/tweets.json`;

// Get an instance of the client.
const M = new Masto({
	access_token: config.twitterCredentials.mastodon_access_token,
	// timeout_ms: 60 * 1000, // optional HTTP request timeout to apply to all requests.
	api_url: 'https://botsin.space/api/v1/', // optional, defaults to https://mastodon.social/api/v1/
});

// Get the tweets.
let tweets;
try {
	tweets = require(tweetsPath);
} catch (error) {
	fs.appendFileSync(errorLogPath, `\n${now.format('YYYY-MM-DD HH:mm')} ${error}`);
	console.warn(`Could not tweet. ${error}`);
	process.exit(1);
}
const tweet = tweets.find(({ sendAfter, tootId, mastodonError }) => {
	// console.log("moment(sendAfter).diff(now, 'days')", moment(sendAfter).diff(now, 'days'));
	return !tootId && !mastodonError && moment(sendAfter).diff(now) < 0 && moment(sendAfter).diff(now, 'days') > -1;
});
console.log("tweet", tweet);

// If there are no new tweets, exit.
if (!tweet) {
	process.exit(0);
}


M.post('media', { file: fs.createReadStream(`${dataDir}/img/${tweet.img}`) }).then(resp => {
	const { id } = resp.data;
	return M.post('statuses', { status: tweet.status, media_ids: [id] });
}).then(resp => {
	const { id } = resp.data;
	tweet.tootId = id;
	fs.writeFileSync(tweetsPath, JSON.stringify(tweets, null, 2));
	console.log(`Send ${id} ${tweet.status}`);
}).catch(error => {
	tweet.mastodonError = `${error}`;
	fs.writeFileSync(tweetsPath, JSON.stringify(tweets, null, 2));
});
