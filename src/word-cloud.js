import * as d3 from 'd3';
import * as cloud from './d3-cloud';
import data from '../metadataStatistics/data/top-words-month.json';

const $year = document.querySelector('.year');
const $month = document.querySelector('.month');
const $cloud = document.querySelector('.cloud');
const $filter = document.querySelector('.filter');
let layout;

export function hashCode(str) {
	let hash = 0;
	let i;
	let chr;
	if (str.length === 0) return hash;
	for (i = 0; i < str.length; i++) {
		chr = str.charCodeAt(i);
		hash = (hash << 5) - hash + chr;
		hash |= 0; // Convert to 32bit integer
	}
	return hash;
}

function stringToColour(str) {
	return `hsl(${hashCode(str) % 360},100%,30%)`;
}

function createCloud(date) {
	localStorage.setItem('wcDate', date);
	const [year, month] = date.split('-');
	$year.value = year;
	$month.value = month;
	$cloud.innerHTML = '';
	const filterWords = new Set($filter.value.split(' ').map(w => w.toLocaleLowerCase()));
	const words = data[date].filter(w => !filterWords.has(w.text.toLocaleLowerCase()));
	layout = cloud()
		.size([700, 500])
		.words(words)
		.padding(5)
		.rotate(0)
		.font('Impact')
		.fontSize(d => d.size)
		.spiral('rectangular')
		.on('end', draw);

	layout.start();
}

function draw(words) {
	d3
		.select('.cloud')
		.append('svg')
		.attr('width', layout.size()[0])
		.attr('height', layout.size()[1])
		.append('g')
		.attr('transform', 'translate(' + layout.size()[0] / 2 + ',' + layout.size()[1] / 2 + ')')
		.selectAll('text')
		.data(words)
		.enter()
		.append('text')
		.style('font-size', d => d.size + 'px')
		.style('font-family', 'Impact')
		.style('fill', d => stringToColour(d.text))
		.attr('text-anchor', 'middle')
		.attr('transform', d => 'translate(' + [d.x, d.y] + ')rotate(' + d.rotate + ')')
		.text(d => d.text);
}

const dates = Object.keys(data);
dates.sort();
let currentDateIndex = 0;
dates.forEach(currentDate => {
	data[currentDate].forEach(item => {
		item.size *= 0.6;
	});
});

function zeroPad(num, size) {
	const s = `000000000${num}`;
	return s.substr(s.length - size);
}

function setDate() {
	const targetDate = `${$year.value}-${zeroPad($month.value, 2)}`;
	const index = dates.indexOf(targetDate);
	if (index === -1) {
		alert('Date not found. Please select one between 1890-01 and 1930-12. Some dates are missing.');
		return;
	}
	currentDateIndex = index;
	createCloud(dates[currentDateIndex]);
}

const filterWords = localStorage.getItem('wcFilter');
if (filterWords !== null) $filter.value = filterWords;
const storedDate = localStorage.getItem('wcDate');

$filter.addEventListener('change', event => {
	localStorage.setItem('wcFilter', event.target.value);
	setDate();
});

$year.addEventListener('change', setDate);
$month.addEventListener('change', setDate);

document.querySelector('.prev').addEventListener('click', () => {
	console.log('prev currentDateIndex', currentDateIndex);
	if (currentDateIndex <= 0) return;
	createCloud(dates[--currentDateIndex]);
});
document.querySelector('.next').addEventListener('click', () => {
	if (currentDateIndex >= dates.length - 1) return;
	console.log('next currentDateIndex', currentDateIndex);
	createCloud(dates[++currentDateIndex]);
});

createCloud(storedDate || dates[0]);
