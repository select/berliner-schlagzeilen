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

socket.on('message', message);

function renderTweet(tweet) {
	const { img, sendAfter, status, ready, id } = tweet;
	const imgEl = img ? `<img data-origin="${host}/img/${img}"/>` : '';
	// pattern="\d{4}-\d{2}-\d{2} \d{2}:\d{2}"
	return `<div class="tweet card-1" data-id="${id}">
		<div class="tweet__close">❌</div>
		<div class="tweet__body ${ready ? 'ready' : ''}">
			<div class="tweet__menu">
				<!-- <div class="tweet__delete" title="Delete this tweet">❌</div> -->
				<div class="tweet__full-screen" title="Maximize tweet">↗</div>
			</div>
			<input type="text" value="${sendAfter}" placeholder="yyyy-mm-dd hh:mm" class="tweet__sendAfter">
			<div class="tweet__status" contenteditable="true">${status}</div>
			${imgEl}
		</div>
	</div>`;
}

function isElementInViewport(el) {
	if (!el) return false;
	const rect = el.getBoundingClientRect();
	return rect.top + 300 >= 0 && rect.bottom - 300 <= (window.innerHeight || document.documentElement.clientHeight);
}

function findAncestor($el, className) {
	while (!$el.classList.contains(className) && ($el = $el.parentElement));
	return $el;
}

function renderTweetVisibility() {
	[...$tweets.querySelectorAll('img:not([src])')].forEach($el => {
		if (isElementInViewport($el.parentElement)) {
			$el.src = $el.dataset.origin;
		}
	});
}

window.addEventListener('scroll', renderTweetVisibility);

function render(tweets) {
	if (!(tweets && Array.isArray(tweets))) return;
	let html = '';
	tweets.filter(({ sendAfter }) => now < new Date(sendAfter)).forEach(tweet => {
		html += renderTweet(tweet);
	});
	$tweets.innerHTML = html;
	renderTweetVisibility();
}

document.querySelector('.nav__init-tweets').addEventListener('click', () => {
	secureSocket.emit('init tweets', null, data => {
		message(data);
	});
});

$tweets.addEventListener(
	'input',
	debounce(event => {
		if (event.target.classList.contains('tweet__status')) {
			secureSocket.emit('edit tweet', {
				id: findAncestor(event.target, 'tweet').dataset.id,
				data: { status: event.target.innerHTML.replace('&nbsp;', ' ') },
			});
		}
	}, 500)
);

$tweets.addEventListener('dblclick', event => {
	if (!event.target.classList.contains('tweets')) {
		let tweetBody = findAncestor(event.target, 'tweet__body');
		if (!tweetBody) tweetBody = event.target.querySelector('.tweet__body');
		const ready = !tweetBody.classList.contains('ready');
		tweetBody.classList[ready ? 'add' : 'remove']('ready');
		event.currentTarget.classList[ready ? 'add' : 'remove']('ready');
		secureSocket.emit('edit tweet', {
			id: findAncestor(event.target, 'tweet').dataset.id,
			data: { ready },
		});
	}
});

$tweets.addEventListener('click', event => {
	if (event.target.classList.contains('tweet__full-screen')) {
		findAncestor(event.target, 'tweet').classList.add('tweet--maximize');
	}
	if (event.target.classList.contains('tweet__close')) {
		findAncestor(event.target, 'tweet').classList.remove('tweet--maximize');
	}
	if (event.target.classList.contains('tweet__delete')) {
		if (confirm('Delete this tweet?')) {
			secureSocket.emit('delete tweet', {
				id: findAncestor(event.target, 'tweet').dataset.id,
			});
		}
	}
});

document.querySelector('.add-tweet').addEventListener('click', event => {
	event.stopPropagation();
	message({ error: 'Not implemented … working on it.' });
});

const $loginForm = document.querySelector('.login');
function onLoggedIn(tweets) {
	secureSocket = io(`${host}/secure`);
	$loginForm.style.display = 'none';
	render(tweets);
	secureSocket.on('message', message);
	secureSocket.on('disconnect', () => {
		message({ error: 'Secure socket disconnected. Please reload.' });
		$loginForm.style.display = 'flex';
	});
	secureSocket.on('update tweet', ({ tweet }) => {
		const $el = document.querySelector(`.tweet[data-id="${tweet.id}"]`);
		if ($el) $el.outerHTML = renderTweet(tweet);
		renderTweetVisibility();
	});
	secureSocket.on('delete tweet', ({ id }) => {
		document.querySelector(`.tweet[data-id="${id}"]`).remove();
		renderTweetVisibility();
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
		if (data.error) return void message(data);
		onLoggedIn(data.tweets);
		const { sessionId, sessionToken } = data;
		localStorage.credentials = JSON.stringify({ sessionToken, sessionId });
	});
});

function logout() {
	if (localStorage.credentials) {
		secureSocket.emit('logout', JSON.parse(localStorage.credentials), () => {
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
	registration = registrationToken
		? `<a href="?username=${username}&registrationToken=${registrationToken}">(⎘ registration link)</a>`
		: registration;
	return `<div class="card-1 ${hasRegistrationToken ? 'user--not-registerd' : ''} ${
		registrationToken ? 'user--has-reg-token' : ''
	}">
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
	secureSocket.emit('list users', null, data => {
		if (data.error) return void message(data.error);
		$user.style.display = 'flex';
		({ userList } = data);
		userList.forEach(user => {
			$userList.innerHTML += renderUser(user);
		});
	});
});

$user.querySelector('form').addEventListener('submit', event => {
	event.preventDefault();
	const username = event.target.elements.username.value;
	secureSocket.emit('create registration token', { username }, data => {
		if (data.error) return void message(data);
		event.target.elements.username.value = '';
		$userList.innerHTML += renderUser(data.user);
		userList.push(data.user);
	});
});

const userActions = {
	reset(username) {
		if (confirm('Reset password and create new registration token?')) {
			secureSocket.emit('create registration token', { username }, data => {
				if (data.error) return void message(data);
				$userList.querySelector(`[data-username="${username}"]`).parentElement.outerHTML = renderUser(data.user);
			});
		}
	},
	delete(username) {
		if (confirm(`Delete user ${username}?`)) {
			secureSocket.emit('delete user', { username }, data => {
				if (data.error) return void message(data);
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
			const item = part.split('=');
			return Object.assign(acc, { [item[0]]: decodeURIComponent(item[1]) });
		}, {});
}

const $newPasswordForm = document.querySelector('.new-password');
const getParameters = getJsonFromUrl();
if (getParameters.registrationToken && getParameters.username && !localStorage.credentials) {
	socket.emit('is registration token active', getParameters, ({ isRegistrationActive }) => {
		if (isRegistrationActive) {
			logout();
			$newPasswordForm.style.display = 'flex';
		} else {
			window.history.pushState({}, document.title, '/');
			message({ error: 'Your registration token is not valid any more.' });
		}
	});
}

$newPasswordForm.addEventListener('submit', event => {
	event.preventDefault();
	const password = event.target.elements.password1.value;
	const password2 = event.target.elements.password2.value;
	if (password !== password2) return void message({ error: 'Passwords did not match.' });
	socket.emit('register', Object.assign({ password }, getParameters), data => {
		message(data);
		if (data.error) return;
		window.history.replaceState({}, document.title, '/');
		$newPasswordForm.style.display = 'none';
	});
});
