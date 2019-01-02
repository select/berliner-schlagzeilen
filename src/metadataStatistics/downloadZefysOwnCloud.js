#!/usr/bin/env node
const fs = require('fs');
const crawler = require('./crawler');
const inquirer = require('inquirer');
const fuzzy = require('fuzzy');
const { execSync, spawn } = require('child_process');

inquirer.registerPrompt('checkbox-autocomplete', require('inquirer-checkbox-autocomplete-prompt'));

const remoteDataDirIndex = './remote-dir-index.json';
const dirIndexData = require(remoteDataDirIndex);

const localUser = 'select';
const mountPath = './webdav';
const dataPath = './data/files';

function mount() {
	if (!fs.existsSync(mountPath)) fs.mkdirSync(mountPath);
	const mountCommand = `sudo mount -t davfs "https://cloud.rockdapus.org/remote.php/webdav/Berliner Volkszeitung 1890-1930/" ${mountPath} -o uid=${localUser} -o gid=${localUser}`;
	console.log(mountCommand);
	// const mountSplit = mount.split(' ');
	// console.log("mountSplit.slice(1)", mountSplit.slice(1));
	// const p = spawn(mountSplit[0], mountSplit.slice(1));
	// p.stdout.on('data',function (data) {
	//     console.log(data.toString())
	// });
	// process.stdout.write(mount);
	// execSync(mount);
}

function unmount() {
	if (!fs.existsSync(mountPath)) return;
	const unmountCommand = `sudo umount ${mountPath}`;
	process.stdout.write(unmountCommand);
	execSync(unmountCommand);
	if (fs.existsSync(mountPath)) {
		fs.rmdirSync(mountPath);
	}
}

function getFileIndex() {
	console.log('getFileIndex');
	const dirs = fs.readdirSync(`${mountPath}/`);
	if (!dirs.length) {
		console.warn('Mount dir was empty.');
		return;
	}
	dirs.filter(dir => !(dir in dirIndexData)).forEach(year => {
		const newDirIndexData = Object.assign({}, dirIndexData);
		newDirIndexData[year] = [];
		if (!newDirIndexData[year].length) {
			newDirIndexData[year] = fs.readdirSync(`${mountPath}/${year}`);
			console.log(`read dir ${year} - files ${newDirIndexData[year].length}`);
			fs.writeFileSync(remoteDataDirIndex, JSON.stringify(newDirIndexData, null, 2));
			// process.stdout.write(`\nwrote file ${remoteDataDirIndex}\n`);
		}
	});
}

function downloadFiles(year, files) {
	return new Promise(resolve => {
		if (!files.length) resolve();
		if (!fs.existsSync(dataPath)) fs.mkdirSync(dataPath);
		const yearPath = `${dataPath}/${year}`;
		if (!fs.existsSync(yearPath)) fs.mkdirSync(yearPath);

		crawler.on('drain', () => {
			resolve();
		});

		crawler.queue(
			files.filter(fileName => !fs.existsSync(`${yearPath}/${fileName}`)).map(fileName => ({
				uri: `http://136.243.4.67/index.php/s/hp6TFyqvZ5ZuAlW/download?path=%2F${year}&files=${fileName}`,
				fileName,
				encoding: null,
				jQuery: false,
				callback: (error1, res1, done1) => {
					console.log(res1.options.uri);
					if (error1) console.error('Download error', error1.stack);
					else {
						console.log(`${yearPath}/${res1.options.fileName}`);
						fs.createWriteStream(`${yearPath}/${res1.options.fileName}`).write(res1.body);
					}
					done1();
				},
			}))
		);
	});
}

async function runCui() {
	const actions = [
		{
			name: 'Download a file',
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
				const _choices = dirIndexData[year[0]];
				const { files } = await inquirer.prompt([
					{
						type: 'checkbox-autocomplete',
						name: 'files',
						asyncSource: async (answers, input) => fuzzy.filter(input || '', _choices).map(el => el.original),
						message: 'Please select files:',
						validate(answer) {
							if (answer.length < 1) return 'You must choose at least one file.';
							return true;
						},
					},
				]);
				await downloadFiles(year, files);
			},
		},
		// {
		// 	name: 'Mount rockdapus webdav',
		// 	action: () => mount(),
		// },
		// {
		// 	name: 'Unmount rockdapus webdav',
		// 	action: () => unmount(),
		// },
		// {
		// 	name: 'Build file index',
		// 	action: () => getFileIndex(),
		// },
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
}

module.exports = {
	runCui,
	getFileIndex,
	downloadFiles,
};
