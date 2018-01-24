title: Berliner Schlagzeilen - Tweets von vor 100 Jahren
author:
	name: Falko Krause, Erik Koenen, Olivier Wagener
	github: shoutrlabs
	url: https://github.com/shoutrlabs/berliner-schlagzeilen
output: ./documentation/workshop.berlin.2018-01.html
theme: ./cleaver-select-theme
controls: true

--
# Zeitungs OCRs

## Staatsbibliothek zu Berlin – Preußischer Kulturbesitz


<style>
.fullscreen {
	position: fixed;
    top: 5%;
    left: 5%;
    height: 90%;
    width: 90%;
    background-size: ;
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
}
.fullscreen-full {
	position: fixed;
    top: 0;
    left: 0;
    height: 100%;
    width: 100%;
    background-size: ;
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
}
</style>

--
<div style="background-image: url('img/presentation.volkszeitung100.jpg'); " class="fullscreen-full" ></div>
--
<div style="background-image: url('img/papergirl.volkszeitung100.jpg'); " class="fullscreen-full" ></div>
--
### About Falko Krause

Bioinformatics FU-Berlin

Computational Systems Biology - MPIfMG

Theoretical Biophysics - HU-Berlin

Webpgr - Startup Founder

Shoutr Labs - Software Development

--
### Falkos (Open Source) Projects

<div class="left">
<ul>
	<li>Audius</li>
	<li>Berliner Volks-Zeitung 100 years ago</li>
	<li>Haxorpoda Collective</li>
	<li>Fantasyplanet.de</li>
	<li>Emoji Text</li>
	<li>Boom, next video!</li>
	<li>manfs</li>
	<li>Slack standup bot</li>
</ul>
</div>
<div class="right">
<ul>
	<li>Cleaver: select theme</li>
	<li>cached-webpgr.js</li>
	<li>Webpgr</li>
	<li>rXncon</li>
	<li>pyMantis</li>
	<li>semanticSBML</li>
	<li>BioGrapher</li>
</ul>
</div>

--
### Newspapers

Berliner Volks-Zeitung

Berliner Tageblatt und Handelszeitung

Berliner Börsen-Zeitung

Deutsche Allgemeine Zeitung

Deutsches Nachrichtenbüro

--
### Data

**6TB** zip archives of OCR data

**40 folders** from 1890 to 1930

Each contains **950 to 1400** scanned issues

Volkszeitung **3 pages** per issue

**&gt; 120000 data points** per question

--
### Meta Data Statistic: Script
We have a powerful script that can parse and analyze local and remote data.
```js
function xml2obj(fileName) { … }
function parseMETS(fileName) { … }
function recursionReducer(recurseFkt, root, addSelf) { … }
function recurseToString(root) { … }
function recurseToLine(root) { … }
function recurseToBlock(root) { … }
function zeroPad(num, size) { … }
function getSize(o) { … }
function px2mm(l) { … }
function parseAlto(fileName) { … }
function getZipContent(zipFilePath) { … }
function parseZipContent(file) { … }
```

--
### Meta Data Statistic: Results - Issue

```json
{
	"title": "Volkszeitung (1890-1904) /Berliner Volkszeitung (1904-1930)",
	"dateIssued": "1890-04-01",
	"metsFileName": "SBB_00006_18900401_F_038_077_1_mets.xml",
	"zipFileName": "SBB_00006_18900401_F_038_077_1.zip"
	"details": [
		…
	],
	"pages": [
		…
	],
},
```

--
### Meta Data Statistic: Results - Page 1/2

```json
{
	"Strings": 3345,
	"TextLines": 377,
	"arithmeticMeanStrinsPerLine": "8.8727",
	"arithmeticMeanLineLengthInMm": "84.0",
	"blocks": 16,
	"arithmeticMeanLinesPerBlock": "23.5625",
	"arithmeticMeanWC": "0.51236",
	"sizeInPx": {
		"xMin": 170,
		"xMax": 3407,
		"yMin": 507,
		"yMax": 5465
	},
	"sizeInMm": {
		"width": "274.1",
		"height": "419.8"
	},
	"fileName": "alto/F_SBB_00009_18900401_038_077_2_001.xml"
},
```

--
### Meta Data Statistic: Results - Page 2/2

```json
{

	"top10words": [
		"Berlin",
		"Forckenbeck",
		"Zahl",
		"Leiche",
		"Tochter"
		…
	],
}

```

--
### Machine Learning - better OCR data

Fix the faulty ORC texts.

Train NN for ORC for old german fonts.

--
<div style="background-image: url('img/team.volkszeitung100.jpg'); " class="fullscreen-full" ></div>

--
### Links and Code
Visit our Twitter feed and or our GitHub repository

[github.com/shoutrlabs/berliner-schlagzeilen](https://github.com/shoutrlabs/berliner-schlagzeilen)

# @volkszeitung100
<div style="text-align: center;">
	https://twitter.com/Volkszeitung100
</div>
