import io from 'socket.io-client';
import { debounce } from './debounce';
import './app.sass';

const host = window.location.host === 'bs.rockdapus.org' ? 'https://bs.rockdapus.org' : 'http://localhost:3001';

const $tweets = document.querySelector('.tweets');
const now = Date.now();

// Connect to socket.io server
const socket = io(host);
let secureSocket; // on logged in connect to secure socket

// Display messages with error and success syle.
// `messageObject` Examples:
// ```
// {error: 'Error message with <b>style</b>.'}
// {success: 'Success message.'}
// ```
function message(messageObject) {
	const $message = document.createElement('div');
	[$message.innerHTML] = Object.values(messageObject);
	$message.classList.add(Object.keys(messageObject)[0]);
	document.querySelector('.messages').appendChild($message);
	setTimeout(() => {
		$message.remove();
	}, 3000);
}
function renderTweet(tweet) {
	const { img, sendAfter, status, ready, index } = tweet;
	const imgEl = img ? `<img src="${host}/img/${img}"/>` : '';
	return `<div class="tweet card-1 ${ready ? 'ready' : ''}" data-id="${index}">
		<div class="tweet__close">❌</div>
		<div class="tweet__full-screen">↗</div>
		<div class="tweet__sendAfter">${sendAfter}</div>
		<div class="tweet__status" contenteditable="true" data-id="${index}">${status}</div>
		${imgEl}
	</div>`;
}

function render(tweets) {
	if (!(tweets && Array.isArray(tweets))) return;
	$tweets.innerHTML = '';
	tweets
		.map((tweet, index) => Object.assign(tweet, { index }))
		.filter(({ sendAfter }) => now < new Date(sendAfter))
		.forEach(tweet => {
			$tweets.innerHTML += renderTweet(tweet);
		});
	[...document.querySelectorAll('[contenteditable]')].forEach(el => {
		// prettier-ignore
		el.addEventListener('input', debounce(event => {
			secureSocket.emit('edit tweet', {
					index: event.target.dataset.id,
					data: { status: event.target.innerHTML },
				}, data => { message(data); });
			}),
			500
		);
	});
	[...document.querySelectorAll('.tweets > div')].forEach(el => {
		// prettier-ignore
		el.addEventListener('dblclick', event => {
			const ready = !event.currentTarget.classList.contains('ready');
			el.classList[ready ? 'add' : 'remove']('ready');
			secureSocket.emit('edit tweet', {
				index: event.currentTarget.dataset.id,
				data: { ready },
			},
			data => { message(data); });
		});
	});
}

$tweets.addEventListener('click', event => {
	if (event.target.classList.contains('tweet__full-screen')) {
		event.target.parentElement.classList.add('tweet--maximize');
	}
	if (event.target.classList.contains('tweet__close')) {
		event.target.parentElement.classList.remove('tweet--maximize');
	}
});

const $loginForm = document.querySelector('.login');
function onLoggedIn(tweets) {
	secureSocket = io(`${host}/secure`);
	$loginForm.style.display = 'none';
	render(tweets);
	secureSocket.on('disconnect', () => {
		message({ error: 'Secure socket disconnected. Please reload.' });
		$loginForm.style.display = 'flex';
	});
	secureSocket.on('update tweet', ({ index, tweet }) => {
		const $el = document.querySelector(`.tweet[data-id="${index}"]`);
		if ($el) $el.outerHTML = renderTweet(Object.assign(tweet, { index }));
	});
}
window.onLoggedIn = onLoggedIn;

// Login with session token if available
socket.on('connect', () => {
	if (localStorage.credentials) {
		socket.emit('login with sessionToken', JSON.parse(localStorage.credentials), data => {
			if (data.error) localStorage.removeItem('credentials');
			onLoggedIn(data.tweets);
		});
	}
});

// Connect the login form to login over the socket
$loginForm.addEventListener('submit', event => {
	event.preventDefault();
	const username = event.target.elements.username.value;
	const password = event.target.elements.password.value;
	socket.emit('login with password', { username, password }, data => {
		if (data.error) return message(data);
		onLoggedIn(data.tweets);
		const { sessionId, sessionToken } = data;
		localStorage.credentials = JSON.stringify({ sessionToken, sessionId });
	});
});

function logout() {
	if (localStorage.credentials) {
		socket.emit('logout', JSON.parse(localStorage.credentials), () => {
			localStorage.removeItem('credentials');
			render([]);
			$loginForm.style.display = 'flex';
		});
	}
}
// Log out: send logout to server and delete credentials
document.querySelector('.logout').addEventListener('click', logout);

// User management function
let userList = [];
const $user = document.querySelector('.user');
const $userList = $user.querySelector('.user__list');
function renderUser({ username, hasRegistrationToken, registrationToken }) {
	let registration = hasRegistrationToken ? '<i>(pending)</i>' : '';
	registration = registrationToken ? `<a href="?username=${username}&registrationToken=${registrationToken}">(⎘ registration link)</a>` : registration;
	return `<div class="card-1 ${hasRegistrationToken ? 'user--not-registerd' : ''} ${registrationToken ? 'user--has-reg-token' : ''}">
		<span>${username} ${registration}</span>
		<div class="user__menu" data-username="${username}">
			<span data-fkt="reset">↻</span>
			<span data-fkt="delete">❌</span>
		</div>
	</div>`;
}

$user.querySelector('.user__close').addEventListener('click', () => {
	$user.style.display = 'none';
});
document.querySelector('.nav__user-list').addEventListener('click', () => {
	if (userList.length) {
		$user.style.display = 'flex';
		return;
	}
	socket.emit('list users', null, data => {
		if (data.error) return message(data.error);
		$user.style.display = 'flex';
		userList = data.userList;
		userList.forEach(user => {
			$userList.innerHTML += renderUser(user);
		});
	});
});

$user.querySelector('form').addEventListener('submit', event => {
	event.preventDefault();
	const username = event.target.elements.username.value;
	socket.emit('create registration token', { username }, data => {
		if (data.error) return message(data);
		event.target.elements.username.value = '';
		$userList.innerHTML += renderUser(data.user);
		userList.push(data.user);
	});
});

const userActions = {
	reset(username) {
		if (confirm('Reset password and create new registration token?')) {
			socket.emit('create registration token', { username }, data => {
				if (data.error) return message(data);
				$userList.querySelector(`[data-username="${username}"]`).parentElement.outerHTML = renderUser(data.user);
			});
		}
	},
	delete(username) {
		if (confirm(`Delete user ${username}?`)) {
			socket.emit('delete user', { username }, data => {
				if (data.error) return message(data);
				$userList.querySelector(`[data-username="${username}"]`).parentElement.remove();
			});
		}
	},
};
$userList.addEventListener('click', event => {
	if (event.target.hasAttribute('data-fkt')) {
		const { username } = event.target.parentElement.dataset;
		const { fkt } = event.target.dataset;
		userActions[fkt](username);
	}
});

function getJsonFromUrl() {
	return location.search
		.substr(1)
		.split('&')
		.reduce((acc, part) => {
			var item = part.split('=');
			return Object.assign(acc, { [item[0]]: decodeURIComponent(item[1]) });
		}, {});
}

const $newPasswordForm = document.querySelector('.new-password');
const getParameters = getJsonFromUrl();
if (getParameters.registrationToken && getParameters.username) {
	logout();
	$newPasswordForm.style.display = 'flex';
}

$newPasswordForm.addEventListener('submit', event => {
	event.preventDefault();
	const password = event.target.elements.password1.value;
	const password2 = event.target.elements.password2.value;
	if (password !== password2) return message({ error: 'Passwords did not match.' });
	socket.emit(
		'register',
		{
			username: getParameters.username,
			password,
			registrationToken: getParameters.registrationToken,
		},
		data => {
			message(data);
			if (data.error) return;
			window.history.replaceState({}, document.title, '/');
			$newPasswordForm.style.display = 'none';
		}
	);
});
