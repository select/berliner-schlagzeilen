#!/usr/bin/env node
/* eslint-disable no-param-reassign, no-unused-expressions */
const express = require('express');
const securePassword = require('secure-password');
const uuidv4 = require('uuid/v4');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

// Initialise the password policy
const pwd = securePassword();

const tweetsDb = low(new FileSync('data/tweets3.json'));
tweetsDb.defaults([]).write();

const userDb = low(new FileSync('data/users.json'));
userDb.defaults({}).write();

const sessionDb = low(new FileSync('data/sessions.json'));
sessionDb.defaults({}).write();

function checkAuthenticated(socket, next) {
	return (data, cb) => {
		if (socket.authenticated) next(data, cb);
		else cb && cb({ error: 'not authenticated' });
	};
}

const authenticatedSockets = new Set();

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
			socket.authenticated = true;
			authenticatedSockets.add(`/secure#${socket.id}`);
			socket.username = username;
			const sessionId = uuidv4();
			const sessionToken = uuidv4();
			const sessionTokenHash = pwd.hashSync(Buffer.from(sessionToken));
			sessionDb.set(sessionId, { sessionTokenHash, username }).write();
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
			socket.authenticated = true;
			authenticatedSockets.add(`/secure#${socket.id}`);
			socket.username = session.username;
			socket.sessionId = sessionId;
			cb && cb({ success: true, tweets: tweetsDb.read().getState() });
		}
	});

	// Logout: Remove authenticated flag and delete the session token.
	socket.on(
		'logout',
		checkAuthenticated(socket, (a, cb) => {
			socket.authenticated = false;
			authenticatedSockets.delete(`/secure#${socket.id}`);
			userDb.unset(socket.sessionId).write();
			cb && cb({ success: true });
		})
	);

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

	// Create registration token
	socket.on(
		'create registration token',
		checkAuthenticated(socket, ({ username }, cb) => {
			const registrationToken = uuidv4();
			const registrationTokenBuffer = pwd.hashSync(Buffer.from(registrationToken));
			userDb.set(username, { registrationTokenBuffer }).write();
			// TODO add broadcast here
			cb && cb({ success: 'Edit success.', user: { username, registrationToken, hasRegistrationToken: true } });
		})
	);

	socket.on(
		'delete user',
		checkAuthenticated(socket, ({ username }, cb) => {
			userDb.unset(username).write();
			// TODO add broadcast here
			cb && cb({ success: 'Delete success.' });
		})
	);

	socket.on(
		'list users',
		checkAuthenticated(socket, (data, cb) => {
			cb &&
				cb({
					userList: userDb
						.read()
						.entries()
						.value()
						.map(([username, { registrationTokenBuffer }]) => ({ username, hasRegistrationToken: !!registrationTokenBuffer })),
				});
		})
	);
});

io.of('/secure').on('connection', socket => {
	if (!authenticatedSockets.has(socket.id)) {
		socket.disconnect();
	}
	socket.on('edit tweet', ({ index, data }, cb) => {
		tweetsDb
			.nth(index)
			.assign(data)
			.write();
		socket.broadcast.emit('update tweet', { index, tweet: tweetsDb.nth(index).value() });
		cb && cb({ success: 'Edit success.' });
	});
});

const port = process.env.PORT || 3001;
http.listen(port, () => {
	process.stdout.write(`\nlistening on *: ${port}\n`);
});

app.use(express.static('public'));
app.use('/img', express.static('data/img'));
