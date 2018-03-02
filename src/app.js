import io from 'socket.io-client';
import { debounce } from './debounce';
import './app.sass';

const host = 'http://localhost:3001';

const $tweets = document.querySelector('.tweets');
const now = Date.now();

// Connect to socket.io server
const socket = io(host);

function render(tweets) {
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
		el.addEventListener('input', debounce(event => {
			socket.emit(
				'edit tweet',
				{
					index: event.target.dataset.id,
					data: { status: event.target.innerHTML },
				},
				data => {
					message(data);
				}
			);
		}),500);
	});
	[...document.querySelectorAll('.tweets > div')].forEach(el => {
		el.addEventListener('dblclick', event => {
			socket.emit('edit tweet', {
				index: event.target.dataset.id,
				data: {
					ready: !event.currentTarget.classList.contains('ready'),
				},
			});
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
	console.log('Log IN!');
	event.preventDefault();
	const username = document.querySelector('[name="username"]').value;
	const password = document.querySelector('[name="password"]').value;
	socket.emit('login with password', { username, password }, data => {
		if (data.error) return message(data);
		$loginForm.style.display = 'none';
		render(data.tweets);
		localStorage.credentials = JSON.stringify({ sessionToken: data.sessionToken, username });
	});
});

// Log out: send logout to server and delete credentials
document.querySelector('.logout').addEventListener('click', () => {
	socket.emit('logout', JSON.parse(localStorage.credentials), () => {
		localStorage.removeItem('credentials');
		render([]);
		$loginForm.style.display = '';
	});
});
