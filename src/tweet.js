#!/usr/bin/env node

const fs = require('fs');
const Twit = require('twit'); // https://github.com/ttezel/twit
const moment = require('moment');

const config = require('./config');

// Get an instance of the twitter client
const twitterClient = new Twit(
	Object.assign(config.twitterCredentials, {
		timeout_ms: 60 * 1000, // optional HTTP request timeout to apply to all requests.
	})
);

const tweets = require(config.tweetsPath);
const tweet = tweets.find(({ sendAfter, tweetId }) => {
	return !tweetId && moment(sendAfter).diff(moment()) < 0;
});

if (!tweet) process.exit(1);

var b64content = fs.readFileSync(`${config.dataDir}/img/${tweet.img}`, { encoding: 'base64' });
twitterClient.post('media/upload', { media_data: b64content }, function(err, data1, response) {
	twitterClient.post(
		'media/metadata/create',
		{ media_id: data1.media_id_string, alt_text: { text: tweet.alt_text } },
		function(err, data, response) {
			if (!err) {
				twitterClient.post(
					'statuses/update',
					{ status: tweet.status, media_ids: [data1.media_id_string] },
					function(err, data, response) {
						tweet.tweetId = data.id;
						fs.writeFileSync(config.tweetsPath, JSON.stringify(tweets, null, 2));
						console.log(`Send ${data.id} ${tweet.status}`);
					}
				);
			}
		}
	);
});
