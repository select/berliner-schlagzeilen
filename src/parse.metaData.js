#!/usr/bin/env node

const fs = require('fs');
const xml2js = require('xml2js');

const config = require('./config');

const idRegEx = /FID-F_SBB_\d+_(\d+_\d+_\d+)_(\d+)_(\d+)-OCRMASTER-TECHMD/;

const parser = new xml2js.Parser();
function xml2obj(fileName) {
	return new Promise((resolve, reject) => {
		fs.readFile(fileName, function(err, data) {
			parser.parseString(data, function(error, result) {
				if (error) reject(error);
				else resolve(result);
			})
		})
	});
}


function parse1(fileName) {
	return xml2obj(fileName).then(result => {
		const rootXML = result['METS:mets'];
		const modsXML =
			rootXML['mets:dmdSec'][0]['mets:mdWrap'][0]['mets:xmlData'][0]['mods:mods'][0];
		const detailsXML = modsXML['mods:relatedItem'][0]['mods:part'][0]['mods:detail'];
		const pagesXML = rootXML['mets:amdSec'][0]['mets:techMD'];

		const pages = pagesXML.map(pageXML => {
			const id = pageXML['$'].ID;
			return {
				id,
				idParts: idRegEx.exec(id).slice(1),
				dpi:
					pageXML['mets:mdWrap'][0]['mets:xmlData'][0]['mix:mix'][0][
						'mix:ImageAssessmentMetadata'
					][0]['mix:SpatialMetrics'][0]['mix:xSamplingFrequency'][0]['mix:numerator'][0],
			};
		});

		const title = modsXML['mods:titleInfo'][0]['mods:title'][0];
		const dateIssued = modsXML['mods:originInfo'][0]['mods:dateIssued'][0]['_'];
		const details = detailsXML.map(detail => ({
			caption: detail['mods:caption'][0],
			number: detail['mods:number'][0],
		}));
		return { title, dateIssued, details, pages };
	});
}


function zeroPad(num, size) {
  const s = `000000000${num}`;
  return s.substr(s.length - size);
}

const baseDir = `${config.dataDir}/metadata/DOCS/19300101_0`
const file1 = `${baseDir}/19300101_0-METS.xml`;
parse1(file1).then(data => {

	// FID-F_SBB_00009_19300101_078_001_0_004-OCRMASTER-TECHMD
	// 18900930_038_228_2-0001.xml
	Promise.all(data.pages.map(page => {
		const p = page.idParts
		return xml2obj(`${baseDir}/ALTO/${p[0]}_${p[1]}-${zeroPad(parseInt(p[2],10),4)}.xml`).then(result => {
			console.log("result", result);
			const PrintSpaceXML = result['alto']['Layout'][0]['Page'][0]['PrintSpace'];
			console.log("PrintSpaceXML", PrintSpaceXML);
		});
	}));
	// console.log(JSON.stringify(data, null, 2));
});
