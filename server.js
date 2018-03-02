const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const securePassword = require('secure-password');
const uuidv4 = require('uuid/v4');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

// Initialise the password policy
const pwd = securePassword();

const tweetsPath = 'data/tweets3.json';
const dbTweets = low(new FileSync(tweetsPath));
dbTweets.defaults([]).write();

const userDb = low(new FileSync('data/users.json'));
userDb.defaults({}).write();

function authenticateSession(username, sessionToken, socketCallback, successCallback) {
	const user = userDb.get(username).value();
	if (!user) return socketCallback({ error: 'Username or token wrong.' });
	const result = pwd.verifySync(Buffer.from(sessionToken), Buffer.from(user.sessionTokenHash.data));
	if (result === securePassword.INVALID) return socketCallback({ error: 'Username or token wrong.' });
	if (result === securePassword.VALID) {
		successCallback();
	}
}

io.on('connection', function(socket) {
	// Login with username: if sucessfull return a session token and
	// store the secure hash token in the user db.
	socket.on('login with password', ({ username, password }, cb) => {
		const user = userDb.get(username).value();
		if (!user) return cb({ error: 'Username or password wrong.' });
		const result = pwd.verifySync(Buffer.from(password), Buffer.from(user.passwordHash.data));
		if (result === securePassword.INVALID) return cb({ error: 'Username or password wrong.' });
		if (result === securePassword.VALID) {
			socket.authenticated = true;
			const sessionToken = uuidv4();
			const sessionTokenHash = pwd.hashSync(Buffer.from(sessionToken));
			userDb.set(`${username}.sessionTokenHash`, sessionTokenHash).write();
			cb({ sessionToken, success: true, tweets: dbTweets.getState() });
		}
	});

	// Login with session token: check if the user has a matching token in the db.
	socket.on('login with sessionToken', ({ username, sessionToken }, cb) => {
		authenticateSession(username, sessionToken, cb, () => {
			socket.authenticated = true;
			cb({ success: true, tweets: dbTweets.getState() });
		});
	});

	// Logout: Remove authenticated flag and delete the session token.
	socket.on('logout', ({ username, sessionToken }, cb) => {
		authenticateSession(username, sessionToken, cb, () => {
			socket.authenticated = false;
			userDb.set(`${username}.sessionTokenHash`, undefined).write();
			cb({ success: true });
		});
	});

	// Register: This must happen in a secure namespace or everybody can registerC
	// Create a new user entry and calculate a secure password hash.
	socket.on('register', ({ username, password }, cb) => {
		if (userDb.get(username).value()) return cb({ error: `Username <b>${username}</b> is already registered.` });
		console.log('register username, password', username, password);
		const passwordHash = pwd.hashSync(Buffer.from(password));
		userDb.set(username, { passwordHash }).write();
		cb({ success: `Created new user <b>${username}</b>.` });
	});

	socket.on(
		'edit tweet',
		checkAuthenticated(socket, ({ index, data }, cb) => {
			console.log('dbTweets.nth(index)', dbTweets.nth(index).value());
			dbTweets.nth(index).assign(data).write();
			cb({ success: 'Edit success.' });
		})
	);
});

function checkAuthenticated(socket, next) {
	return (data, cb) => {
		if (socket.authenticated) next(data, cb);
		else cb({ error: 'not authenticated' });
	};
}

const port = process.env.PORT || 3001;
http.listen(port, function() {
	console.log('listening on *:' + port);
});

app.use(express.static('public'));
app.use('/img', express.static('data/img'));
