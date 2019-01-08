import * as d3 from 'd3';
import * as cloud from './d3-cloud';
import * as data from './metadataStatistics/top-words-month.json';

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

console.log("data['1919-01']", data['1919-01']);

const layout = cloud()
	.size([500, 500])
	.words(data['1919-01']
		// ['Hello', 'world', 'normally', 'you', 'want', 'more', 'words', 'than', 'this'].map(d => ({
		// 	text: d,
		// 	size: 10 + Math.random() * 90,
		// 	// test: 'haha',
		// }))
	)
	.padding(5)
	.rotate(0)
	.font('Impact')
	.fontSize(d => d.size*2)
	.spiral('rectangular')
	.on('end', draw);

layout.start();

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
