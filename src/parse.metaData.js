#!/usr/bin/env node

const fs = require('fs');
const xml2js = require('xml2js');

var parser = new xml2js.Parser();
fs.readFile(`${__dirname}/../data/metadata.example.xml`, function(err, data) {
    parser.parseString(data, function (err, result) {
        console.log("data", data);
        console.dir(result);
        console.log('Done');
    });
});
