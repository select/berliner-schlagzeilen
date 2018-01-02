#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');
const AdmZip = require('adm-zip');

const config = require('./config');
const outputPath = `${config.dataDir}/ocr-stats.json`;
let statsData = require(outputPath);
let stopwords = new Set(require(`${config.dataDir}/stopwords.json`));

const idRegEx = /FID-F_SBB_\d+_(\d+_\d+_\d+)_(\d+)_(\d+)-OCRMASTER-TECHMD/;

const parser = new xml2js.Parser();
function xml2obj(fileName) {
	return new Promise((resolve, reject) => {
		if (fileName.trim()[0] === '<') {
			parser.parseString(fileName, function(error, result) {
				if (error) reject(error);
				else resolve(result);
			});
		} else {
			fs.readFile(fileName, function(err, data) {
				parser.parseString(data, function(error, result) {
					if (error) reject(error);
					else resolve(result);
				});
			});
		}
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

function recursionReducer(recurseFkt, root, addSelf = false) {
	return (acc, tagName) => [
		...acc,
		...(root[tagName] || []).reduce((_acc, node) => [..._acc, ...recurseFkt(node)], []),
		...(addSelf ? root[tagName] || [] : []),
	];
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
			recursionReducer(recurseToString, root),
			[]
		),
		...(root.String || []),
	];
}

function recurseToLine(root) {
	return [
		...['TextBlock', 'ComposedBlock'].reduce(recursionReducer(recurseToLine, root), []),
		...(root.TextLine || []),
	];
}

function recurseToBlock(root) {
	return ['TextBlock', 'ComposedBlock'].reduce(recursionReducer(recurseToBlock, root, true), []);
}

function zeroPad(num, size) {
	const s = `000000000${num}`;
	return s.substr(s.length - size);
}

function getSize(o) {
	return {
		x: parseInt(o.HPOS, 10),
		y: parseInt(o.VPOS, 10),
		w: parseInt(o.WIDTH, 10),
		h: parseInt(o.HEIGHT, 10),
	};
}

function px2mm(l) {
	return (l * 25.4 / 300).toFixed(1);
}

function parseAlto(fileName) {
	return xml2obj(fileName).then(result => {
		const printSpaceXML = result['alto']['Layout'][0]['Page'][0]['PrintSpace'][0];
		const words = recurseToString(printSpaceXML);
		const lines = recurseToLine(printSpaceXML);
		const blocks = recurseToBlock(printSpaceXML);
		const minMax = words.reduce(
			(acc, w) => {
				const size = getSize(w.$);
				return {
					xMin: acc.xMin > size.x ? size.x : acc.xMin,
					xMax: acc.xMax < size.x + size.w ? size.x + size.w : acc.xMax,
					yMin: acc.yMin > size.y ? size.y : acc.yMin,
					yMax: acc.yMax < size.y + size.h ? size.y + size.h : acc.yMax,
				};
			},
			{ xMin: 999999999, yMin: 999999999, xMax: 0, yMax: 0 }
		);
		const top10words = Object.entries(
			words.reduce((acc, w) => {
				const wn = w.$.CONTENT.replace(/\W/g,'');
				if (wn.length < 3) return acc;
				if (/\d+/.test(wn)) return acc;
				if (wn in acc) acc[wn] += 1;
				else acc[wn] = 1;
				return acc;
			}, {})
		).filter(w => !stopwords.has(w[0].toLocaleLowerCase()));
		top10words.sort((a, b) => (a[1] < b[1] ? 1 : -1));
		console.log('top10words', top10words.slice(0, 10));
		return {
			top10words: top10words.map(w => w[0]).slice(0, 10),
			Strings: words.length,
			TextLines: lines.length,
			arithmeticMeanStrinsPerLine: (
				lines.reduce((acc, l) => acc + (l.String || []).length, 0) / lines.length
			).toFixed(4),
			arithmeticMeanLineLengthInMm: px2mm(
				lines.reduce((acc, l) => acc + getSize(l.$).w, 0) / lines.length
			),
			blocks: blocks.length,
			arithmeticMeanLinesPerBlock: (
				blocks.reduce((acc, l) => acc + (l.TextLine || []).length, 0) / blocks.length
			).toFixed(4),
			sizeInPx: minMax,
			sizeInMm: {
				width: px2mm(minMax.xMax - minMax.xMin),
				height: px2mm(minMax.yMax - minMax.yMin),
			},
			arithmeticMeanWC: (
				words.reduce((acc, w) => acc + parseFloat(w.$.WC), 0) / words.length
			).toFixed(5),
		};
		console.log('words', words.length);
		// console.log('words', words.map(w => w.$.CONTENT).join(' '));
	});
}

// function copyFile(source, target) {
// 	var rd = fs.createReadStream(source);
// 	var wr = fs.createWriteStream(target);
// 	return new Promise(function(resolve, reject) {
// 		rd.on('error', reject);
// 		wr.on('error', reject);
// 		wr.on('finish', resolve);
// 		rd.pipe(wr);
// 	}).catch(function(error) {
// 		rd.destroy();
// 		wr.end();
// 		throw error;
// 	});
// }

function getZipContent(zipFilePath) {
	const zip = new AdmZip(zipFilePath);
	const zipEntries = zip.getEntries(); // an array of ZipEntry records
	const altoFiles = zipEntries
		.filter(zipEntry => /\d\.xml$/.test(zipEntry.entryName))
		.map(zipEntry => ({
			name: zipEntry.entryName,
			content: zipEntry.getData().toString('utf8'),
		}));
	const metsFile = zipEntries.find(zipEntry => /METS.xml$/i.test(zipEntry.entryName));
	return {
		altoFiles,
		metsFile: {
			name: metsFile.entryName,
			content: metsFile.getData().toString('utf8'),
		},
	};
}

function parseZipContent(file) {
	console.log('file', file.zipFileName);
	let dataMets;
	return parseMETS(file.metsFile.content)
		.then(data => {
			dataMets = data;
			return Promise.all(file.altoFiles.map(({ content }) => parseAlto(content))).then(altos =>
				altos.map((res, index) => ({ ...res, fileName: file.altoFiles[index].name }))
			);
		})
		.then(pageStats => {
			const fileStats = {
				...dataMets,
				metsFileName: file.metsFile.name,
				zipFileName: file.zipFileName,
				pages: pageStats,
			};
			statsData = [...statsData, fileStats];
			fs.writeFileSync(outputPath, JSON.stringify(statsData, null, 2));
			process.stdout.write(`\nwrote file ${outputPath}\n`);
			console.log('file.metsFile.name', file.metsFile.name);
			return fileStats;
		});
}

const statsDataIndex = new Set(statsData.map(({ zipFileName }) => zipFileName));
console.log('statsDataIndex', statsDataIndex);

// const res = getZipContent(`${config.dataDir}/SBB_00006_18970306_F_045_110_0.zip`);
// parseZipContent(res).then(x => {
// 	console.log('res', x);
// });

const promises = fs
	.readdirSync(`${config.remoteDataDir}`)
	.filter(y => /^\d+/.test(y))
	.splice(0, 1)
	.map(year => {
		console.log('year', year);
		const files = fs.readdirSync(`${config.remoteDataDir}/${year}`);
		return files
			.splice(0, 10)
			.filter(file => !statsDataIndex.has(file))
			.map(file => ({
				zipFileName: file,
				...getZipContent(`${config.remoteDataDir}/${year}/${file}`),
			}));
	})
	.map(files => {
		return Promise.all(
			files.map(parseZipContent)
		);
	});

Promise.all(promises).then(res => {
	// console.log(JSON.stringify(res, null, 2));
});
