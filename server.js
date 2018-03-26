#!/usr/bin/env node
/* eslint-disable no-param-reassign, no-unused-expressions */
const express = require('express');
const securePassword = require('secure-password');
const uuidv4 = require('uuid/v4'); // real random uuid
const uuidv1 = require('uuid/v1'); // timestamp
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

const dataDir = process.env.DATA_DIR || 'server-data';

// Initialise the password policy
const pwd = securePassword();

const tweetsDb = low(new FileSync(`${dataDir}/tweets.json`));
tweetsDb.defaults([]).write();

const userDb = low(new FileSync(`${dataDir}/users.json`));
userDb.defaults({}).write();

const sessionDb = low(new FileSync(`${dataDir}/sessions.json`));
sessionDb.defaults({}).write();

const authenticatedSockets = {};

io.on('connection', socket => {
	// Login with username: if sucessfull return a session token and
	// store the secure hash token in the user db.
	socket.on('login with password', ({ username, password }, cb) => {
		const user = userDb
			.read()
			.get(username)
			.value();
		if (!user) return cb && cb({ error: 'Username or password wrong.' });
		if (!user.passwordHash) return cb && cb({ error: 'Please contact an admin and ask for a new registration link.' });
		const result = pwd.verifySync(Buffer.from(password), Buffer.from(user.passwordHash.data));
		if (result === securePassword.INVALID) return cb({ error: 'Username or password wrong.' });
		if (result === securePassword.VALID) {
			const sessionId = uuidv4();
			const sessionToken = uuidv4();
			const sessionTokenHash = pwd.hashSync(Buffer.from(sessionToken));
			sessionDb.set(sessionId, { sessionTokenHash, username }).write();
			authenticatedSockets[`/secure#${socket.id}`] = sessionId;
			cb && cb({ sessionToken, sessionId, success: true, tweets: tweetsDb.read().getState() });
		}
	});

	// Login with session token: check if the user has a matching token in the db.
	socket.on('login with sessionToken', ({ sessionId, sessionToken }, cb) => {
		const session = sessionDb
			.read()
			.get(sessionId)
			.value();
		if (!session) return cb && cb({ error: 'Username or token wrong.' });
		const result = pwd.verifySync(Buffer.from(sessionToken), Buffer.from(session.sessionTokenHash.data));
		if (result === securePassword.INVALID) return cb && cb({ error: 'Unknown token.' });
		if (result === securePassword.VALID) {
			authenticatedSockets[`/secure#${socket.id}`] = sessionId;
			cb && cb({ success: true, tweets: tweetsDb.read().getState() });
		}
	});

	socket.on('is registration token active', ({ username }, cb) => {
		const isRegistrationActive = userDb
			.read()
			.has(`${username}.registrationTokenBuffer`)
			.value();
		cb && cb({ isRegistrationActive });
	});

	// Register: Create a new user entry and calculate a secure password hash.
	socket.on('register', ({ username, password, registrationToken }, cb) => {
		if (password.length < 8) return cb && cb({ error: 'Password too short.' });
		const registrationTokenBuffer = userDb
			.read()
			.get(`${username}.registrationTokenBuffer.data`)
			.value();
		if (!registrationTokenBuffer) return cb && cb({ error: 'Username or token wrong.' });
		const result = pwd.verifySync(Buffer.from(registrationToken), Buffer.from(registrationTokenBuffer));
		if (result === securePassword.INVALID) return cb && cb({ error: 'Username or token wrong.' });
		if (result === securePassword.VALID) {
			const passwordHash = pwd.hashSync(Buffer.from(password));
			userDb
				.set(username, { passwordHash })
				.unset(`${username}.registrationTokenBuffer`)
				.write();
			// TODO add broadcast here
			cb && cb({ success: `Registered new user <b>${username}</b>.` });
		}
	});
});

io.of('/secure').on('connection', socket => {
	if (!(socket.id in authenticatedSockets)) {
		socket.disconnect();
	}

	// Logout: Remove authenticated flag and delete the session token.
	socket.on('logout', (a, cb) => {
		userDb.unset(authenticatedSockets[`/secure#${socket.id}`]).write();
		delete authenticatedSockets[`/secure#${socket.id}`];
		cb && cb({ success: true });
	});

	// Create registration token
	socket.on('create registration token', ({ username }, cb) => {
		const registrationToken = uuidv4();
		const registrationTokenBuffer = pwd.hashSync(Buffer.from(registrationToken));
		userDb.set(username, { registrationTokenBuffer }).write();
		// TODO add broadcast here
		cb && cb({ success: 'Edit success.', user: { username, registrationToken, hasRegistrationToken: true } });
	});

	// Delete a user
	socket.on('delete user', ({ username }, cb) => {
		userDb.unset(username).write();
		// TODO add broadcast here
		cb && cb({ success: 'Delete success.' });
	});

	// List all users
	socket.on('list users', (data, cb) => {
		cb &&
			cb({
				userList: userDb
					.read()
					.entries()
					.value()
					.map(([username, { registrationTokenBuffer }]) => ({ username, hasRegistrationToken: !!registrationTokenBuffer })),
			});
	});

	// Init tweets
	socket.on('init tweets', () => {
		const tweets = tweetsDb.read().getState();
		tweets.forEach(tweet => {
			if (!tweet.id) tweet.id = uuidv1();
		});
		tweetsDb.setState(tweets).write();
		socket.emit('init tweets', { tweets: tweetsDb.read().getState() });
	});

	// Edit a tweet
	socket.on('edit tweet', ({ id, data }) => {
		tweetsDb
			.find(tweet => tweet.id === id)
			.assign(data)
			.write();
		socket.broadcast.emit('update tweet', { tweet: tweetsDb.find(tweet => tweet.id === id).value() });
		socket.send({ success: 'Edit success.' });
	});

	// Delete a tweet
	socket.on('delete tweet', ({ id }) => {
		tweetsDb.remove((tweet) => tweet.id === id).write();
		tweetsDb.read();
		socket.emit('delete tweet', { id });
		socket.send({ success: 'Deleted tweet.' });
	});
});

const port = process.env.PORT || 3001;
http.listen(port, () => {
	process.stdout.write(`\nlistening on *: ${port}\n`);
});

app.use(express.static('public'));
app.use('/img', express.static(`${dataDir}/img`));
