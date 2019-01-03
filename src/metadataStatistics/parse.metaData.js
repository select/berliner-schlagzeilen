#!/usr/bin/env node

/* eslint-disable no-restricted-syntax  */
const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');
const AdmZip = require('adm-zip');
const inquirer = require('inquirer');
const fuzzy = require('fuzzy');
const { execSync } = require('child_process');
inquirer.registerPrompt('checkbox-autocomplete', require('inquirer-checkbox-autocomplete-prompt'));

const { downloadFiles } = require('./downloadZefysOwnCloud');
const remoteDataDirIndex = './remote-dir-index.json';
const dirIndexData = require(remoteDataDirIndex);
const filesPath = path.join(__dirname, 'data', 'files');
const imagesPath = path.join(__dirname, 'data', 'images');
const statsPath = path.join(__dirname, 'data', 'stats');
const indexDataPath = path.join(__dirname, 'stats-index.json');

const stopwords = new Set(require(path.join(__dirname, 'stopwords.json')));

const numTopWords = 50;
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
					pageXML['mets:mdWrap'][0]['mets:xmlData'][0]['mix:mix'][0]['mix:ImageAssessmentMetadata'][0]['mix:SpatialMetrics'][0][
						'mix:xSamplingFrequency'
					][0]['mix:numerator'][0],
			};
		});

		const title = modsXML['mods:titleInfo'][0]['mods:title'][0];
		const dateIssued = modsXML['mods:originInfo'][0]['mods:dateIssued'][0]['_'];
		const details = detailsXML.map(detail => ({
			caption: detail['mods:caption'][0],
			number: detail['mods:number'][0],
		}));
		return { title, dateIssued, details, pages, numPages: pages.length };
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
		...['TextBlock', 'ComposedBlock', 'TextLine'].reduce(recursionReducer(recurseToString, root), []),
		...(root.String || []),
	];
}

function recurseToIllustration(root) {
	return [
		...['TextBlock', 'ComposedBlock'].reduce(recursionReducer(recurseToIllustration, root), []),
		...(root.Illustration || []),
	];
}

function recurseToLine(root) {
	return [...['TextBlock', 'ComposedBlock'].reduce(recursionReducer(recurseToLine, root), []), ...(root.TextLine || [])];
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

function px2cm(l) {
	return (l * 25.4 / (300 * 10)).toFixed(1);
}

function getTopWords2(words) {
	const topWords = Object.entries(
		words.reduce((acc, wn) => {
			if (wn in acc) acc[wn] += 1;
			else acc[wn] = 1;
			return acc;
		}, {})
	);
	topWords.sort((a, b) => (a[1] < b[1] ? 1 : -1));
	return topWords;
}

function getTopWords(words) {
	const topWords = Object.entries(
		words.reduce((acc, w) => {
			const wn = w.$.CONTENT.replace(/\W/g, '');
			if (wn.length < 3) return acc;
			if (/\d+/.test(wn)) return acc;
			if (wn in acc) acc[wn] += 1;
			else acc[wn] = 1;
			return acc;
		}, {})
	).filter(w => !stopwords.has(w[0].toLocaleLowerCase()));
	topWords.sort((a, b) => (a[1] < b[1] ? 1 : -1));
	return topWords;
}

function parseAlto(fileName) {
	return xml2obj(fileName).then(result => {
		const printSpaceXML = result.alto.Layout[0].Page[0].PrintSpace[0];
		const words = recurseToString(printSpaceXML);
		// return { words: words.map(w => w.$.CONTENT).join(' ') };
		const lines = recurseToLine(printSpaceXML);
		const blocks = recurseToBlock(printSpaceXML);
		const illustrations = recurseToIllustration(printSpaceXML);
		// The following line is not used since there are too many false positives for
		// illustrations.
		// const minMax = [...illustrations, ...words].reduce(
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
		const wordSpaceDimensionsInMm = {
			width: px2mm(minMax.xMax - minMax.xMin),
			height: px2mm(minMax.yMax - minMax.yMin),
		};
		const areaInSquareMm = wordSpaceDimensionsInMm.width * wordSpaceDimensionsInMm.height;
		const corpus = words.map(w => w.$.CONTENT).join(' ');
		return {
			// corpus,
			// words: words.map(w => w.$.CONTENT.replace(/\W/g, '')),
			numWords: words.length,
			numLetters: corpus.length,
			// topWords: getTopWords(words)
			// 	.map(w => w[0])
			// 	.slice(0, numTopWords),
			TextLines: lines.length,
			numIllustrations: illustrations.length,
			arithmeticMeanStrinsPerLine: (lines.reduce((acc, l) => acc + (l.String || []).length, 0) / lines.length).toFixed(4),
			arithmeticMeanLineLengthInMm: px2mm(lines.reduce((acc, l) => acc + getSize(l.$).w, 0) / lines.length),
			blocks: blocks.length,
			arithmeticMeanLinesPerBlock: (blocks.reduce((acc, l) => acc + (l.TextLine || []).length, 0) / blocks.length).toFixed(4),
			printSpaceDimensionsInMm: {
				left: px2mm(printSpaceXML.$.HPOS),
				top: px2mm(printSpaceXML.$.VPOS),
				width: px2mm(printSpaceXML.$.WIDTH),
				height: px2mm(printSpaceXML.$.HEIGHT),
			},
			wordSpaceDimensionsInMm,
			dimensionsInPx: Object.assign(
				{
					width: minMax.xMax - minMax.xMin,
					height: minMax.yMax - minMax.yMin,
				},
				minMax
			),
			dimensionsInPx2: {
				xMin: printSpaceXML.$.HPOS,
				yMin: printSpaceXML.$.VPOS,
				width: printSpaceXML.$.WIDTH,
				height: printSpaceXML.$.HEIGHT,
			},
			areaInSquareMm,
			wordDensity: words.length / areaInSquareMm,
			letterDensity: corpus.length / areaInSquareMm,
			arithmeticMeanWC: (words.reduce((acc, w) => acc + parseFloat(w.$.WC), 0) / words.length).toFixed(5),
		};
		// console.log('words', words.length);
		// console.log('words', words.map(w => w.$.CONTENT).join(' '));
	});
}

function getZipContent(zipFilePath) {
	const { size } = fs.statSync(zipFilePath);
	const zip = new AdmZip(zipFilePath);
	const zipEntries = zip.getEntries(); // an array of ZipEntry records
	const altoFiles = zipEntries.filter(zipEntry => /\d\.xml$/.test(zipEntry.entryName)).map(zipEntry => ({
		name: zipEntry.entryName,
		content: zipEntry.getData().toString('utf8'),
	}));
	if (!fs.existsSync(imagesPath)) fs.mkdirSync(imagesPath);
	zipEntries.filter(zipEntry => /\d\.jp2$/.test(zipEntry.entryName)).forEach(zipEntry => {
		zip.extractEntryTo(zipEntry.entryName, imagesPath, false, true);
	});
	const metsFile = zipEntries.find(zipEntry => /METS.xml$/i.test(zipEntry.entryName));
	return {
		zipFileName: path.basename(zipFilePath, path.extname(zipFilePath)),
		altoFiles,
		metsFile: {
			name: metsFile.entryName,
			content: metsFile.getData().toString('utf8'),
		},
	};
}

// function ensurePath(...path) {
// }
function convertAndCrop(baseName, cropCoordinates) {
	const name = path.join(imagesPath, baseName);
	if (!fs.existsSync(`${name}.jp2`)) {
		console.log('not exits');
		return;
	}
	execSync(`j2k_to_image -i ${name}.jp2 -o ${name}.bmp`);
	const padding = 50;
	const limits = {
		x: cropCoordinates.xMin > padding ? cropCoordinates.xMin - padding : 0,
		y: cropCoordinates.yMin > padding ? cropCoordinates.yMin - padding : 0,
		w: cropCoordinates.width + padding,
		h: cropCoordinates.height + padding,
	};
	const cropCommand = `convert -crop ${limits.w}x${limits.h}+${limits.x}+${limits.y} ${name}.bmp ${name}.jpg`;
	console.log('cropCommand', cropCommand);
	execSync(cropCommand);
	fs.unlinkSync(`${name}.bmp`);
	// fs.unlinkSync(`${name}.jp2`);
}

async function parseZipContent(file, year) {
	const dataMets = await parseMETS(file.metsFile.content);
	const pageStats = await Promise.all(file.altoFiles.map(({ content }) => parseAlto(content))).then(altos =>
		altos.map((res, index) => ({ ...res, fileName: file.altoFiles[index].name }))
	);

	const fileStats = {
		...dataMets,
		metsFileName: file.metsFile.name,
		zipFileName: file.zipFileName,
		pages: pageStats,
	};
	// if (!fs.existsSync(statsPath)) fs.mkdirSync(statsPath);
	// const yearPath = path.join(statsPath, year);
	// if (!fs.existsSync(yearPath)) fs.mkdirSync(yearPath);
	// const statsFilePath = path.join(yearPath, `${file.zipFileName}.json`);
	// fs.writeFileSync(statsFilePath, JSON.stringify(fileStats, null, 2));
	return fileStats;
}

function copyFile(source, target) {
	const rd = fs.createReadStream(source);
	rd.pipe(fs.createWriteStream(target));
}

function topWordsPerMonth() {
	const corpusDataPath = path.join(__dirname, 'corpus-month.json');
	const topWordsDataPath = path.join(__dirname, 'top-words-month.json');
	const corpusData = require(corpusDataPath);
	const result = Object.entries(corpusData).reduce(
		(acc, [date, words]) =>
			Object.assign(acc, {
				[date]: getTopWords2(words)
					.map(w => w[0])
					.slice(0, numTopWords),
			}),
		{}
	);
	fs.writeFileSync(topWordsDataPath, JSON.stringify(result, null, 2));
}

async function corpusPerMonth() {
	const corpusDataPath = path.join(__dirname, 'corpus-month.json');
	let oldData = {};
	// try {
	// 	oldData = require(corpusDataPath);
	// } catch (e) {
	// 	process.stderr.write(`${corpusDataPath} was empty, initialized with {}\n`);
	// }
	const zeroSuffixRegEx = /_0\.zip$/;
	const numberRegExeg = /\d+/;
	const years = fs.readdirSync(filesPath);
	for (const year of years) {
		const files = fs.readdirSync(path.join(filesPath, year));
		for (const file of files) {
			const filePath = path.join(filesPath, year, file);
			try {
				if (!zeroSuffixRegEx.test(file)) continue;
				console.log('parse filePath', filePath);
				const zipContent = await getZipContent(filePath);
				const dataMets = await parseMETS(zipContent.metsFile.content);
				// Only take the first page
				const result = await xml2obj(zipContent.altoFiles[0].content);
				const printSpaceXML = result.alto.Layout[0].Page[0].PrintSpace[0];
				const month = dataMets.dateIssued.slice(0, 7);
				const words = recurseToString(printSpaceXML)
					.map(w => w.$.CONTENT.replace(/\W/g, ''))
					.filter(w => !stopwords.has(w.toLocaleLowerCase()) && w.length > 3 && !numberRegExeg.test(w));
				if (month in oldData) oldData[month] = oldData[month].concat(words);
				else oldData[month] = words;
			} catch (error) {
				console.log('parseZipContent error: ', error);
			}
		}
	}
	fs.writeFileSync(corpusDataPath, JSON.stringify(oldData, null, 2));
}

async function addToIndex() {
	const dataListPath = path.join(__dirname, 'stats-list.json');
	// const filesPath = path.join('data', 'files');
	let oldData = {};
	try {
		oldData = require(indexDataPath);
	} catch (e) {
		process.stderr.write(`${indexDataPath} was empty, initialized with {}\n`);
	}

	// statsPath
	const files = fs.readdirSync(filesPath).reduce(
		(acc, year) => [
			...acc,
			...fs
				.readdirSync(path.join(filesPath, year))
				.filter(file => !(file in oldData))
				.map(file => [year, path.join(filesPath, year, file)]),
		],
		[]
	);
	const newData = Object.assign({}, oldData);
	for (const [year, filePath] of files) {
		console.log(`${year}: ${filePath}`);
		try {
			newData[filePath] = await parseZipContent(getZipContent(filePath), year);
		} catch (error) {
			console.log('parseZipContent error: ', error);
		}
	}
	fs.writeFileSync(indexDataPath, JSON.stringify(newData, null, 2));
	const pagesList = Object.values(newData).reduce(
		(acc, { dateIssued, pages }) => [...acc, ...pages.map(page => Object.assign({ dateIssued }, page))],
		[]
	);
	fs.writeFileSync(dataListPath, JSON.stringify(pagesList, null, 2));
}

function deleteFolderRecursive(path) {
	if (fs.existsSync(path)) {
		fs.readdirSync(path).forEach(function(file, index) {
			var curPath = path + '/' + file;
			if (fs.lstatSync(curPath).isDirectory()) {
				// recurse
				deleteFolderRecursive(curPath);
			} else {
				// delete file
				fs.unlinkSync(curPath);
			}
		});
		fs.rmdirSync(path);
	}
}

async function runCui() {
	const actions = [
		{
			name: 'Parse a file',
			async action() {
				const years = fs.readdirSync(`${filesPath}/`);
				// console.log('years', years);
				// const { year } = await inquirer.prompt([
				// 	{
				// 		type: 'checkbox-autocomplete',
				// 		name: 'year',
				// 		asyncSource: async (answers, input) => fuzzy.filter(input || '', years).map(el => el.original),
				// 		message: 'Please select a year:',
				// 		validate(answer) {
				// 			if (answer.length !== 1) return 'You must choose one year.';
				// 			return true;
				// 		},
				// 	},
				// ]);
				const files = years.reduce((allFiles, year) => {
					const filesInFolder = fs.readdirSync(`${filesPath}/${year}/`);
					return allFiles.concat(filesInFolder.map(file => path.join(year, file)));
				}, []);
				const { fileList } = await inquirer.prompt([
					{
						type: 'checkbox-autocomplete',
						name: 'fileList',
						asyncSource: async (answers, input) => fuzzy.filter(input || '', files).map(el => el.original),
						message: 'Please select one file:',
						validate(answer) {
							if (answer.length < 1) return 'You must choose at least one file.';
							return true;
						},
					},
				]);
				// console.log('fileList', fileList);
				return Promise.all(
					fileList.map(file =>
						parseZipContent(getZipContent(path.join(filesPath, file)), file.split('/')[0])
							.then(res => {} /*console.log(JSON.stringify(res, null, 2))*/)
							.catch(e => console.warn(e))
					)
				);
			},
		},
		{
			name: 'Extend index with downloaded Files',
			action: () => addToIndex(),
		},
		{
			name: 'convert',
			action: () => {
				const pages = require('./stats-list.json');
				// console.log("pages", pages);
				pages.forEach(page => {
					convertAndCrop(path.basename(page.fileName).split('.')[0], page.dimensionsInPx);
				});
			},
		},
		{
			name: 'get corpus',
			async action() {
				await corpusPerMonth();
			},
		},
		{
			name: 'get top words from cropus',
			async action() {
				topWordsPerMonth();
			},
		},
		{
			name: 'Download and parse one year',
			async action() {
				const choices = Object.keys(dirIndexData);
				const { year } = await inquirer.prompt([
					{
						type: 'checkbox-autocomplete',
						name: 'year',
						asyncSource: async (answers, input) => fuzzy.filter(input || '', choices).map(el => el.original),
						message: 'Please select one year:',
						validate(answer) {
							if (answer.length !== 1) return 'You must choose one year.';
							return true;
						},
					},
				]);
				const bins = dirIndexData[year[0]].reduce(
					(acc, file, index) => {
						if (index % 2 === 0) acc.push([]);
						acc[acc.length - 1].push(file);
						return acc;
					},
					[[]]
				);
				// console.log('bins.slice(0, 3)', bins.slice(0, 3));
				// for (const files of bins.slice(0, 5)) {
				for (const files of bins) {
					console.log('processing', files);
					await downloadFiles(year, files);
					console.log('add to index');
					await addToIndex();
					// if (fs.existsSync(filesPath)) deleteFolderRecursive(filesPath);
					console.log('done');
				}
			},
		},
	];
	const { startAction } = await inquirer.prompt([
		{
			type: 'list',
			message: 'What do you want to do?',
			name: 'startAction',
			choices: actions,
		},
	]);
	const { action } = actions.find(({ name }) => name === startAction);
	if (action) action().then();
}

if (require.main === module) {
	// corpusPerMonth().then(() => console.log('The End'));
	runCui().then(() => console.log('The End'));
}

module.exports = {
	runCui,
	parseZipContent,
	getZipContent,
	corpusPerMonth,
};
