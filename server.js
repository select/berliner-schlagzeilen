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
const tweetsDb = low(new FileSync(tweetsPath));
tweetsDb.defaults([]).write();

const userDb = low(new FileSync('data/users.json'));
userDb.defaults({}).write();


function authenticateSession(username, sessionToken, cb, successCallback) {
	try {
		const user = userDb.read().get(username).value();
		if (!user) return cb && cb({ error: 'Username or token wrong.' });
		const result = pwd.verifySync(Buffer.from(sessionToken), Buffer.from(user.sessionTokenHash.data));
		if (result === securePassword.INVALID) return cb && cb({ error: 'Username or token wrong.' });
		if (result === securePassword.VALID) {
			successCallback();
		}
	} catch (error) {
		cb && cb({ error: `Something went wrong. ${error}` });
	}
}

io.on('connection', function(socket) {
	// Login with username: if sucessfull return a session token and
	// store the secure hash token in the user db.
	socket.on('login with password', ({ username, password }, cb) => {
		const user = userDb.read().get(username).value();
		if (!user) return cb({ error: 'Username or password wrong.' });
		if (!(user.passwordHash)) return cb && cb({ error: 'Please contact an admin and ask for a new registration link.' });
		let result;
		try {
			result = pwd.verifySync(
				Buffer.from(password),
				Buffer.from(user.passwordHash.data)
			);
		} catch (error) {
			return cb && cb({ error: `Crashed: ${error}` });
		}
		if (result === securePassword.INVALID) return cb({ error: 'Username or password wrong.' });
		if (result === securePassword.VALID) {
			socket.authenticated = true;
			const sessionToken = uuidv4();
			const sessionTokenHash = pwd.hashSync(Buffer.from(sessionToken));
			userDb.set(`${username}.sessionTokenHash`, sessionTokenHash).write();
			cb && cb({ sessionToken, success: true, tweets: tweetsDb.getState() });
		}
	});

	// Login with session token: check if the user has a matching token in the db.
	socket.on('login with sessionToken', ({ username, sessionToken }, cb) => {
		authenticateSession(username, sessionToken, cb, () => {
			socket.authenticated = true;
			cb && cb({ success: true, tweets: tweetsDb.getState() });
		});
	});

	// Logout: Remove authenticated flag and delete the session token.
	socket.on('logout', ({ username, sessionToken }, cb) => {
		authenticateSession(username, sessionToken, cb, () => {
			socket.authenticated = false;
			userDb.set(`${username}.sessionTokenHash`, undefined).write();
			cb && cb({ success: true });
		});
	});

	// Register: This must happen in a secure namespace or everybody can registerC
	// Create a new user entry and calculate a secure password hash.
	socket.on('register', ({ username, password, registrationToken }, cb) => {
		console.log("registrationToken", registrationToken);
		const registrationTokenBuffer = userDb.read().get(`${username}.registrationTokenBuffer.data`).value();
		console.log("`${username}.registrationTokenBuffer.data`", `${username}.registrationTokenBuffer.data`);
		if (!registrationTokenBuffer) return cb && cb({ error: 'Username or token wrong.' });
		const result = pwd.verifySync(
			Buffer.from(registrationToken),
			Buffer.from(registrationTokenBuffer)
		);
		if (result === securePassword.INVALID) return cb && cb({ error: 'Username or token wrong.' });
		if (result === securePassword.VALID) {
			console.log('register username, password', username, password);
			const passwordHash = pwd.hashSync(Buffer.from(password));
			userDb
				.set(username, { passwordHash })
				.unset(`${username}.registrationTokenBuffer`)
				.write();
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
			cb && cb({ success: 'Edit success.',user: { username, registrationToken, hasRegistrationToken: true } });
		})
	);

	socket.on(
		'delete user',
		checkAuthenticated(socket, ({ username }, cb) => {
			userDb.unset(username).write();
			cb && cb({ success: 'Delete success.'});
		})
	);

	socket.on(
		'edit tweet',
		checkAuthenticated(socket, ({ index, data }, cb) => {
			tweetsDb
				.nth(index)
				.assign(data)
				.write();
			cb && cb({ success: 'Edit success.' });
		})
	);

	socket.on(
		'list users',
		checkAuthenticated(socket, (data, cb) => {
			cb &&
				cb({userList:
					userDb
						.read()
						.entries()
						.value()
						.map(([username, { registrationTokenBuffer }]) => ({ username, hasRegistrationToken: !!registrationTokenBuffer }))
				}
				);
		})
	);
});

function checkAuthenticated(socket, next) {
	return (data, cb) => {
		if (socket.authenticated) next(data, cb);
		else cb && cb({ error: 'not authenticated' });
	};
}

const port = process.env.PORT || 3001;
http.listen(port, function() {
	console.log('listening on *:' + port);
});

app.use(express.static('public'));
app.use('/img', express.static('data/img'));
