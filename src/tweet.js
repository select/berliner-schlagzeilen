#!/usr/bin/env node

const fs = require('fs');
const Twit = require('twit'); // https://github.com/ttezel/twit
const moment = require('moment');

const config = require('./config');

const errorLogPath = `${__dirname}/../log/error.log`;
const now = moment(new Date());

const dataDir = process.argv[2] || config.dataDir;
const tweetsPath = `${dataDir}/tweets.json`;
console.log("tweetsPath", tweetsPath);

// Log the error to file, console and tweets.json.
function onError(error) {
	tweet.error = `${error}`;
	fs.writeFileSync(tweetsPath, JSON.stringify(tweets, null, 2));
	console.warn(`Could not tweet. ${error}`);
	fs.appendFileSync(errorLogPath, `\n${now.format('YYYY-MM-DD HH:mm')} ${error}`);
}


// Twit library does not implement promises reject for failed tweets but
// resolves them and puts the error in the data object.
function catchError(callback) {
	return (response) => {
		if (response.data.errors) return onError(response.data.errors[0].message)
		else return callback(response.data)
	}
}


// Get an instance of the twitter client.
const twitterClient = new Twit(
	Object.assign(config.twitterCredentials, {
		timeout_ms: 60 * 1000, // optional HTTP request timeout to apply to all requests.
	})
);


// Get the tweets.
let tweets;
try {
	tweets = require(tweetsPath);
} catch (error) {
	fs.appendFileSync(errorLogPath, `\n${now.format('YYYY-MM-DD HH:mm')} ${error}`);
	console.warn(`Could not tweet. ${error}`);
	process.exit(1);
}
const tweet = tweets.find(({ sendAfter, tweetId, error }) => {
	return !tweetId && !error && moment(sendAfter).diff(now) < 0;
});

// If there are no new tweets, exit.
if (!tweet) {
	process.exit(0);
}

// If tweet has image, upload image first, then tweet
if (tweet.img) {
	let media_id;
	let b64content;
	try {
		b64content = fs.readFileSync(`${dataDir}/img/${tweet.img}`, { encoding: 'base64' });
	} catch (error) {
		onError(error);
		process.exit(1);
	}
	twitterClient
		.post('media/upload', { media_data: b64content })
		.then(catchError((data) => {
			media_id = data.media_id_string;
			return twitterClient.post('media/metadata/create', {
				media_id: data.media_id_string,
				alt_text: { text: tweet.alt_text },
			})
		}))
		.then(catchError(() => twitterClient.post('statuses/update', {
				status: tweet.status,
				media_ids: [media_id],
			})
		))
		.then(catchError((data) => {
			tweet.tweetId = data.id;
			fs.writeFileSync(tweetsPath, JSON.stringify(tweets, null, 2));
			console.log(`Send ${data.id} ${tweet.status}`);
		}))
		.catch(onError);
} else {
	// Send tweet without image.
	twitterClient
		.post('statuses/update', { status: tweet.status })
		.then(catchError((data) => {
			tweet.tweetId = data.id;
			fs.writeFileSync(tweetsPath, JSON.stringify(tweets, null, 2));
			console.log(`Send [no imgage] ${data.id} ${tweet.status}`);
		}))
		.catch(onError);
}
