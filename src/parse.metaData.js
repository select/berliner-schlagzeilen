#!/usr/bin/env node

const fs = require('fs');
const xml2js = require('xml2js');

const config = require('./config');

var parser = new xml2js.Parser();
function parse1(fileName) {
	return new Promise((response, reject) => {
		fs.readFile(fileName, function(err, data) {
			parser.parseString(data, function(error, result) {
				if (error) reject(error);

				const modsXML = result['METS:mets']['mets:dmdSec'][0]['mets:mdWrap'][0]['mets:xmlData'][0]['mods:mods'][0];
				const detailsXML = modsXML['mods:relatedItem'][0]['mods:part'][0]['mods:detail'];

				const title = modsXML['mods:titleInfo'][0]['mods:title'][0];
				const dateIssued = modsXML['mods:originInfo'][0]['mods:dateIssued'][0]['_'];
				const details = detailsXML.map(detail => ({
					caption: detail['mods:caption'][0],
					number: detail['mods:number'][0],
				}));
				response({ title, dateIssued, details });
			});
		});
	})
}

const file1 = `${config.dataDir}/metadata/DOCS/19300101_0/19300101_0-METS.xml`;
parse1(file1)
	.then(data => {
		console.log(JSON.stringify(data, null, 2));
	})
