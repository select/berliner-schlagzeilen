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

const stopwords = new Set(require(path.join(__dirname, 'stopwords-merged.json')).map(w => w.toLocaleLowerCase()));

const numTopWords = 50;
const idRegEx = /FID-F_SBB_\d+_(\d+_\d+_\d+)_(\d+)_(\d+)-OCRMASTER-TECHMD/;
const pageNumberRegEx = /_(\d+)\.xml$/;

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
			// const id = pageXML['$'].ID;
			return {
				// id,
				// idParts: idRegEx.exec(id).slice(1),
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
	return topWords.map(([text, size]) => ({ text, size }));
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
		const illustrationAreaInSquareMm = illustrations.reduce((acc, illustr) => {
			const w = px2mm(illustr.$.WIDTH);
			const h = px2mm(illustr.$.HEIGHT);
			acc += w * h;
			return acc;
		}, 0);
		const corpus = words.map(w => w.$.CONTENT).join(' ');
		return {
			numWords: words.length,
			numLetters: corpus.length,
			TextLines: lines.length,
			numIllustrations: illustrations.length,
			illustrationAreaInSquareMm,
			illustrationAreaRatio: illustrationAreaInSquareMm / areaInSquareMm,
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
	// zipEntries.filter(zipEntry => /\d\.jp2$/.test(zipEntry.entryName)).forEach(zipEntry => {
	// 	if (!fs.existsSync(path.join(imagesPath, zipEntry.entryName))) {
	// 		zip.extractEntryTo(zipEntry.entryName, imagesPath, false, true);
	// 	}
	// });
	const metsFile = zipEntries.find(zipEntry => /METS.xml$/i.test(zipEntry.entryName));
	const zipFileName = path.basename(zipFilePath, path.extname(zipFilePath));
	const zipFileParts = zipFileName.split('_');

	return {
		zipFileName,
		altoFiles,
		issue: parseInt(zipFileParts[zipFileParts.length - 2], 10),
		subIssue: parseInt(zipFileParts[zipFileParts.length - 1], 10),
		metsFile: {
			name: metsFile.entryName,
			content: metsFile.getData().toString('utf8'),
		},
	};
}

// function ensurePath(...path) {
// }
function convertAndCrop(baseName, cropCoordinates, newName) {
	const name = path.join(imagesPath, baseName);
	execSync(`j2k_to_image -i ${name}.jp2 -o ${name}.bmp`);
	const padding = 50;
	const limits = {
		x: cropCoordinates.xMin > padding ? cropCoordinates.xMin - padding : 0,
		y: cropCoordinates.yMin > padding ? cropCoordinates.yMin - padding : 0,
		w: cropCoordinates.width + padding,
		h: cropCoordinates.height + padding,
	};
	const cropCommand = `convert -crop ${limits.w}x${limits.h}+${limits.x}+${limits.y} ${name}.bmp ${newName}.jpg`;
	console.log('cropCommand', cropCommand);
	execSync(cropCommand);
	fs.unlinkSync(`${name}.bmp`);
	// fs.unlinkSync(`${name}.jp2`);
}

async function parseZipContent(file, year) {
	const dataMets = await parseMETS(file.metsFile.content);
	const pageStats = await Promise.all(file.altoFiles.map(({ content }) => parseAlto(content))).then(altos =>
		altos.map((res, index) => {
			const fileName = file.altoFiles[index].name;
			const pageNumberMatch = pageNumberRegEx.exec(fileName);
			return {
				...res,
				fileName,
				pageNumber: pageNumberMatch ? parseInt(pageNumberMatch[1], 10) : undefined,
			};
		})
	);

	const zipFileParts = file.zipFileName.split('_');
	pageStats.forEach((page, index) => {
		Object.assign(page, dataMets.pages[index], {
			issue: parseInt(dataMets.details[1].number, 10),
			subIssue: parseInt(zipFileParts[zipFileParts.length - 1], 10),
		});
	});

	const fileStats = {
		...dataMets,
		metsFileName: file.metsFile.name,
		zipFileName: file.zipFileName,
		issue: file.issue,
		subIssue: file.subIssue,
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
				[date]: getTopWords2(words).slice(0, 50),
			}),
		{}
	);
	fs.writeFileSync(topWordsDataPath, JSON.stringify(result));
}

function mergeStopwordLists() {
	/* prettier-ignore */
	const stopwords = Array.from(new Set([
		...require('./stopwords'),
		...require('./stopwords1'),
		...require('./stopwords2'),
		...require('./stopwords3'),
		...require('./stopwords4'),
		...require('./stopwords5'),
	]));
	const stopwordsPath = path.join(__dirname, 'stopwords-merged.json');
	fs.writeFileSync(stopwordsPath, JSON.stringify(stopwords, null, 2));
}

async function corpusPerMonth() {
	const corpusDataPath = path.join(__dirname, 'corpus-month.json');
	const oldCorpusData = require(corpusDataPath);
	const corpusData = {};
	const numberRegExeg = /\d+/;

	const pages = require('./stats-pages-list.json')
	// const choices = Array.from(new Set(pages.map(({ dateIssued }) => dateIssued.slice(0, 4))));
	// const [yearToGet] = await inquireYear(choices);

	const pagesFiltered = pages.filter(
		({ pageNumber, subIssue, jokesIssue, year }) =>
			/*year === parseInt(yearToGet, 10) &&*/ pageNumber === 1 && subIssue === 0 && !jokesIssue
	);
	for (const { fileName, zipFileId, dateIssued, year } of pagesFiltered) {
		console.log('zipFileId', zipFileId);
		const month = dateIssued.slice(0, 7);

		if (month in oldCorpusData) continue;

		const zip = new AdmZip(path.join(filesPath, `${year}`, `${zipFileId}.zip`));
		const zipEntry = zip.getEntry(fileName);
		const content = zipEntry.getData().toString('utf8');

		// Only take the first page
		const result = await xml2obj(content);
		const printSpaceXML = result.alto.Layout[0].Page[0].PrintSpace[0];
		const words = recurseToString(printSpaceXML)
			.map(w => w.$.CONTENT.replace(/\W/g, ''))
			.filter(w => !stopwords.has(w.toLocaleLowerCase()) && w.length > 3 && !numberRegExeg.test(w));
		if (month in corpusData) {
			corpusData[month] = corpusData[month].concat(words);
		} else {
			fs.writeFileSync(corpusDataPath, JSON.stringify(corpusData, null, 2));
			corpusData[month] = words;
		}
	}
	// await Promise.all(pages
	// 	.filter(({ pageNumber, subIssue, jokesIssue, year }) => year === parseInt(yearToGet, 10) && pageNumber === 1 && subIssue === 0 && !jokesIssue)
	// 	.map(async ({ fileName, zipFileId, dateIssued, year }) => {
	// 	})
	// );
	fs.writeFileSync(corpusDataPath, JSON.stringify(corpusData, null, 2));
}

function corpusToCsv() {
	const corpusDataPath = path.join(__dirname, 'corpus-month.json');
	const corpusDataFilesPath = path.join(__dirname, 'data', 'corpus');
	if (!fs.existsSync(corpusDataFilesPath)) fs.mkdirSync(corpusDataFilesPath);
	const corpusData = require(corpusDataPath);
	Object.entries(corpusData).forEach(([date, words]) => {
		fs.writeFileSync(path.join(corpusDataFilesPath, `${date}.csv`), words.join('\n'));
	});
}

function extendPageData(statsData) {
	let maxIssue = 0;
	let maxYear = 0;
	return Object.entries(statsData).reduce((acc, zipIssue) => {
		const [zipFileId, issueData] = zipIssue;
		const year = parseInt(issueData.dateIssued.slice(0, 4), 10);
		if (year > maxYear) {
			maxIssue = 0;
			maxYear = year;
		}
		return Object.assign(acc, {
			[zipFileId]: Object.assign(issueData, {
				year,
				pages: issueData.pages.map(page => {
					const { issue } = page;
					const data = Object.assign(page, {
						jokesIssue: issue < maxIssue,
						zipIssue: parseInt(issueData.details[0].number, 10),
						dateIssued: issueData.dateIssued,
						year,
						zipFileId,
					});
					if (issue > maxIssue) maxIssue = issue;
					return data;
				}),
			}),
		});
	}, {});
}

function writeIssueList(newData) {
	const issueListPath = path.join(__dirname, 'stats-issue-list.json');
	const issueList = Object.values(newData).reduce((acc, issue) => {
		delete issue.pages;
		return [...acc, issue];
	}, []);
	fs.writeFileSync(issueListPath, JSON.stringify(issueList, null, 2));
}

function writePageList(newData) {
	const pagesListPath = path.join(__dirname, 'stats-pages-list.json');
	const pagesList = Object.values(newData).reduce(
		(acc, { pages, year }) => {
			const batch = year < 1910 ? 0 : 1;
			acc[batch] = acc[batch].concat(pages);
			return acc;
		},
		[[], []]
	);
	fs.writeFileSync(path.join(__dirname, 'stats-pages-list.0.json'), JSON.stringify(pagesList[0], null, 2));
	fs.writeFileSync(path.join(__dirname, 'stats-pages-list.1.json'), JSON.stringify(pagesList[1], null, 2));
	fs.writeFileSync(path.join(__dirname, 'stats-pages-list.json'), JSON.stringify([...pagesList[0], ...pagesList[1]], null, 2));
}

function migrateIndexFile() {
	const data = extendPageData(require('./stats-index.json'));
	fs.writeFileSync('./stats-index.json', JSON.stringify(data, null, 2));
	writePageList(data);
	// writeIssueList(data);
}

async function addToIndex() {
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
				.filter(file => !(path.basename(file, '.zip') in oldData))
				.map(file => [year, path.join(filesPath, year, file)]),
		],
		[]
	);
	let newData = Object.assign({}, oldData);
	let count = 0;
	for (const [year, filePath] of files) {
		const basename = path.basename(filePath, '.zip');
		console.log(`${year}: ${filePath}`);
		try {
			newData[basename] = await parseZipContent(getZipContent(filePath), year);
			if (count % 100 === 0) {
				fs.writeFileSync(indexDataPath, JSON.stringify(extendPageData(newData), null, 2));
			}
			++count;
		} catch (error) {
			console.log('parseZipContent error: ', error);
		}
	}
	fs.writeFileSync(indexDataPath, JSON.stringify(extendPageData(newData), null, 2));
	writePageList(newData);
	writeIssueList(newData);
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

async function inquireYear(choices) {
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
	return year;
}

async function runCui() {
	const actions = [
		// {
		// 	name: 'Parse a file',
		// 	async action() {
		// 		const years = fs.readdirSync(`${filesPath}/`);
		// 		const files = years.reduce((allFiles, year) => {
		// 			const filesInFolder = fs.readdirSync(`${filesPath}/${year}/`);
		// 			return allFiles.concat(filesInFolder.map(file => path.join(year, file)));
		// 		}, []);
		// 		const { fileList } = await inquirer.prompt([
		// 			{
		// 				type: 'checkbox-autocomplete',
		// 				name: 'fileList',
		// 				asyncSource: async (answers, input) => fuzzy.filter(input || '', files).map(el => el.original),
		// 				message: 'Please select one file:',
		// 				validate(answer) {
		// 					if (answer.length < 1) return 'You must choose at least one file.';
		// 					return true;
		// 				},
		// 			},
		// 		]);
		// 		// console.log('fileList', fileList);
		// 		return Promise.all(
		// 			fileList.map(file =>
		// 				parseZipContent(getZipContent(path.join(filesPath, file)), file.split('/')[0])
		// 					.then(res => {} /*console.log(JSON.stringify(res, null, 2))*/)
		// 					.catch(e => console.warn(e))
		// 			)
		// 		);
		// 	},
		// },
		{
			name: 'Extend index with downloaded Files',
			action: () => addToIndex(),
		},
		{
			name: 'convert',
			async action() {
				const pages = require('./stats-pages-list.json');
				const choices = Array.from(new Set(pages.map(({ dateIssued }) => dateIssued.slice(0, 4))));
				const [yearToGet] = await inquireYear(choices);
				// const zeroSuffixRegEx = /_001\.xml$/;
				const processedImagesPath = path.join(__dirname, 'data', 'processedImages');
				if (!fs.existsSync(processedImagesPath)) fs.mkdirSync(processedImagesPath);
				await Promise.all(
					pages
						.filter(
							({ pageNumber, subIssue, jokesIssue, year }) =>
								year === parseInt(yearToGet, 10) && pageNumber === 1 && subIssue === 0 && !jokesIssue
						)
						.map(async ({ fileName, zipFileId, dimensionsInPx, dateIssued, issue, subIssue, year }) => {
							const outFileName = `${dateIssued}.${issue}`;
							const baseName = path.basename(fileName).split('.')[0];
							if (!fs.existsSync(path.join(imagesPath, `${baseName}.jp2`))) {
								const zip = new AdmZip(path.join(filesPath, `${year}`, `${zipFileId}.zip`));
								zip.extractEntryTo(`viewing/${baseName}.jp2`, imagesPath, false, true);
							}
							convertAndCrop(baseName, dimensionsInPx, path.join(processedImagesPath, outFileName));
						})
				);
			},
		},
		{
			name: 'get corpus',
			async action() {
				await corpusPerMonth();
				topWordsPerMonth();
			},
		},
		// {
		// 	name: 'corpus to csv',
		// 	async action() {
		// 		corpusToCsv();
		// 	},
		// },
		{
			name: 'migrate index files',
			async action() {
				migrateIndexFile();
			},
		},
		{
			name: 'merge stopwords',
			async action() {
				mergeStopwordLists();
			},
		},
		{
			name: 'Download and parse one year',
			async action() {
				const choices = Object.keys(dirIndexData);
				const year = await inquireYear(choices);
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
	runCui().then(() => console.log('The End'));
	// migrateIndexFile();
	// corpusPerMonth().then(() => console.log('The End'));
	// mergeStopwordLists()
	// corpusToCsv();
}

module.exports = {
	runCui,
	parseZipContent,
	getZipContent,
	corpusPerMonth,
	corpusToCsv,
};
