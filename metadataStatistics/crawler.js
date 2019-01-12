const Crawler = require('crawler');
const jsdom = require('jsdom');

module.exports =  new Crawler({
	rateLimit: 100,
	userAgent:
		'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.100 Safari/537.36',
	jQuery: jsdom,
	maxConnections: 10,
	// This will be called for each crawled page
	// callback: scanPage,
});
