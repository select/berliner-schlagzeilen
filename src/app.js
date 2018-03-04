import io from 'socket.io-client';
import { debounce } from './debounce';
import './app.sass';

const host = 'http://localhost:3001';

const $tweets = document.querySelector('.tweets');
const now = Date.now();

// Connect to socket.io server
const socket = io(host);

function render(tweets) {
	if (!tweets) return;
	$tweets.innerHTML = '';
	tweets
		.map((tweet, index) => Object.assign(tweet, { index }))
		.filter(({ sendAfter }) => now < new Date(sendAfter))
		.forEach(({ img, sendAfter, status, ready, index }) => {
			const imgEl = img ? `<img src="${host}/img/${img}"/>` : '';
			$tweets.innerHTML += `<div class="card-1 ${ready ? 'ready' : ''}" data-id="${index}">
						<div class="full-screen">↗</div>
						<div class="sendAfter">${sendAfter}</div>
						<div class="status" contenteditable="true" data-id="${index}">${status}</div>
						${imgEl}
					</div>`;
		});
	[...document.querySelectorAll('[contenteditable]')].forEach(el => {
		// prettier-ignore
		el.addEventListener('input', debounce(event => {
			socket.emit('edit tweet', {
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
			el.classList[ready ? 'add' : 'remove']('ready')
			socket.emit('edit tweet', {
				index: event.currentTarget.dataset.id,
				data: { ready },
			},
			data => { message(data); });
		});
	});
}

// Display messages with error and success syle.
// `messageObject` Examples:
// ```
// {error: 'Error message with <b>style</b>.'}
// {success: 'Success message.'}
// ```
function message(messageObject) {
	const $message = document.createElement('div');
	$message.innerHTML = Object.values(messageObject)[0];
	$message.classList.add(Object.keys(messageObject)[0]);
	document.querySelector('.messages').appendChild($message);
	setTimeout(() => {
		$message.remove();
	}, 3000);
}

// Login with session token if available
if (localStorage.credentials) {
	socket.on('connect', () => {
		socket.emit('login with sessionToken', JSON.parse(localStorage.credentials), data => {
			if (data.error) localStorage.removeItem('credentials');
			$loginForm.style.display = 'none';
			render(data.tweets);
		});
	});
}

// Connect the login form to login over the socket
const $loginForm = document.querySelector('.login');
$loginForm.addEventListener('submit', event => {
	event.preventDefault();
	const username = event.target.elements.username.value;
	const password = event.target.elements.password.value;
	socket.emit('login with password', { username, password }, data => {
		if (data.error) return message(data);
		$loginForm.style.display = 'none';
		render(data.tweets);
		localStorage.credentials = JSON.stringify({ sessionToken: data.sessionToken, username });
	});
});

function logout() {
	if (localStorage.credentials) {
		socket.emit('logout', JSON.parse(localStorage.credentials), () => {
			localStorage.removeItem('credentials');
			render([]);
			$loginForm.style.display = '';
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
	socket.emit('list users', null, (data) => {
		if(data.error) return message(data.error);
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
			registrationToken: getParameters.registrationToken
		},
		data => {
			message(data);
			window.history.replaceState({}, document.title, '/');
			$newPasswordForm.style.display = 'none';
			if (data.error) return;
		});
});
