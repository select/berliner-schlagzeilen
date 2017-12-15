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
			});
		});
	});
}

function parseMETS(fileName) {
	return xml2obj(fileName).then(result => {
		const rootXML = result['METS:mets'];
		const modsXML = rootXML['mets:dmdSec'][0]['mets:mdWrap'][0]['mets:xmlData'][0]['mods:mods'][0];
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

/**
 * recurseToString will get all `String` tags from a root node.
 * `String` tags represent individual words.
 * @param {Object} root xml2js node
 * @return {Array} list of xml2js String nodes
 */
function recurseToString(root) {
	return [
		...['TextBlock', 'ComposedBlock', 'TextLine'].reduce(
			(acc, tagName) => [
				...acc,
				...(root[tagName] || []).reduce((_acc, node) => [..._acc, ...recurseToString(node)], []),
			],
			[]
		),
		...(root.String || []).map(node => node),
	];
}

function zeroPad(num, size) {
	const s = `000000000${num}`;
	return s.substr(s.length - size);
}

const baseDir = `${config.dataDir}/metadata/DOCS/19300101_0`;
const file1 = `${baseDir}/19300101_0-METS.xml`;
let dataMETS;
parseMETS(file1)
	.then(data => {
		// FID-F_SBB_00009_19300101_078_001_0_004-OCRMASTER-TECHMD
		// 18900930_038_228_2-0001.xml
		dataMETS = data;
		return Promise.all(
			data.pages.map(page => {
				const p = page.idParts;
				return xml2obj(
					`${baseDir}/ALTO/${p[0]}_${p[1]}-${zeroPad(parseInt(p[2], 10), 4)}.xml`
				).then(result => {
					const printSpaceXML = result['alto']['Layout'][0]['Page'][0]['PrintSpace'][0];
					const words = recurseToString(printSpaceXML);
					const minMax = words.reduce(
						(acc, w) => ({
							xMax: acc.xMax < w.$.HPOS + w.$.WIDTH ? w.$.HPOS + w.$.WIDTH : acc.xMax,
							yMax: acc.yMax < w.$.VPOS + w.$.HEIGHT ? w.$.HPOS + w.$.HEIGHT : acc.yMax,
							xMin: acc.xMin > w.$.HPOS ? w.$.HPOS : acc.xMin,
							yMin: acc.yMin > w.$.VPOS ? w.$.HPOS : acc.yMin,
						}),
						{ xMin: 999999999, yMin: 999999999, xMax: 0, yMax: 0 }
					);
					return {
						strings: words.length,
						size: minMax,
					};
					console.log('words', words.length);
					// console.log('words', words.map(w => w.$.CONTENT).join(' '));
				});
			})
		);
	})
	.then(pageStats => {
		const stats = Object.assign(dataMETS, { pages: pageStats });
		console.log(JSON.stringify(stats, null, 2));
	});
