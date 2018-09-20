const dataDir = `${__dirname}/../data`;
const serverDataDir = `${__dirname}/../server-data`;
module.exports = {
	dataDir,
	serverDataDir,
	// date2mIdPath: `${__dirname}/../data/date2metaDataId.json`
	date2mIdPath: `${dataDir}/date2metaDataId.json`,
	remoteDataDir: `${dataDir}/remote-data`,
	twitterCredentials: require('../keys.js'),
	tweetsPath: `${serverDataDir}/tweets.json`,
	remoteDataDirIndex: `${dataDir}/remote-dir-index.json`,
	ocrStats: `${dataDir}/ocr-stats.json`,
};
