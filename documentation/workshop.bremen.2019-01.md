title: Berliner Schlagzeilen - Tweets von vor 100 Jahren
author:
	name: Erik Koenen, Falko Krause, Simon Sax, 
	github: shoutrlabs
	url: https://github.com/shoutrlabs/berliner-schlagzeilen
output: ./documentation/workshop.bremen.2019-01.html
theme: ./cleaver-select-theme
controls: true

--

<style>
.slide.slide::before {
	background: url(img-bremen/background.png) center center no-repeat;
	background-size: cover;
}
h1 {
	color: #3b3b3b;
	text-shadow: 1px 2px 4px #191919;
}
#slide-1 h1 {
	color: #FFF;
	font-size: 1.5em;
}
.fullscreen {
	position: fixed;
	top: 5%;
	left: 5%;
	height: 90%;
	width: 90%;
	background-size: contain;
	background-repeat: no-repeat;
	background-position: center;
}
.fullscreen-h {
	position: fixed;
	top: 0;
	left: 0;
	height: 100%;
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
	overflow: auto;
}
.fullscreen-full img {
	height: 98%;
	width: auto;
}
.smaller {
	font-size: 0.7em;
}
</style>

# Big News Data. Praxis und Potentiale digitaler Methoden des <br>„Distant Reading“ für die historische Presseforschung

## Erik Koenen (Bremen) <br> Falko Krause (Berlin) & Simon Sax (Bremen)

--
<div style="background-image: url('img-bremen/max_weber_pink.jpg'); " class="fullscreen-full" ></div>

--
# "Maßband, Schere und Algorithmen"
<div class="smaller" style="float:right">* im Geiste von Max Weber</div>

--
<div style="background-image: url('img-bremen/Illustration_für_Präsentation_BigNewsData.jpg'); " class="fullscreen-full" ></div> 

--
- "Distant Reading“
- Beispielprojekte

--
# Die <br><span style="white-space: nowrap">Berliner Volkszeitung</span> 

--
### Über die Zeitung

Simons Teil hier

--
### Die Daten

**40 Jahre** 1890 to 1930

**601,4 GiB** ZIP Archive

**142.399** Seiten

**22.190** Titelseiten 


--
<div style="background-image: url('img-bremen/Screenshot papers zoom.0.png'); " class="fullscreen-full" ></div>
--
<div style="background-image: url('img-bremen/Screenshot papers zoom.1.png'); " class="fullscreen-full" ></div>
--
<div style="background-image: url('img-bremen/Screenshot papers zoom.2.png'); " class="fullscreen-full" ></div>
--
<div style="background-image: url('img-bremen/Screenshot papers zoom.3.png'); " class="fullscreen-full" ></div>

--
<div style="background-image: url('img-bremen/fussballfeld.jpg'); " class="fullscreen-full" >
	<h1 style="color: #fff; margin-top: 100px">2,39 Fussballfelder</h1>
</div>

--
### Rechenpower

Virtual Private Server

**13 GiB** RAM

**4 Cores** 

**> 1000 Zeilen** Java Script Code

**> 168 Stunden** CPU unter Volllast

--
- Beschreibung des Korpus, des Software- und Hardwarekontexts, des Ressourcenaufwands

--
### Auswertungsdimensionen

<div class="left" style="margin-top: 1em">
**Anzal der**<br>
Wörter <br>
Buchstaben <br>
Illustrations <br>
Zeilen <br>
Blöcke <br>
Seiten pro Ausgabe <br>
</div>
<div class="right" style="margin-top: 1em">
**Fläch in Millimeter** <br>
Seite <br>
Illustration<br>
<br>
Anteil der Illustationen <br>
</div>

--
### Fehlschläge gehören dazu
Anazahl der Blöcke

Anzahl der Bilder

--
<div style="background-image: url('img-bremen/failed measures plot.png'); " class="fullscreen-full" ></div> 
--
<div class="fullscreen-full">
	<img src="img-bremen/failed measures plot.png">
</div>


--
### Form- und Gestaltwandel: Informationsdichte & Fläche der Illustrationen
- Überblick
o   Maße 
- Fallstudie zum Gestaltwandel: Anfang 1928
--
<div style="background-image: url('img-bremen/layout measures plot.png'); " class="fullscreen-full" ></div> 
--
<div class="fullscreen-full">
	<img src="img-bremen/layout measures plot.png">
</div>

--
# OCR Qualität
<div class="smaller" style="text-align: center">Anzahl der Seiten </div>

--
<div style="background-image: url('img-bremen/ocr-quality.png'); " class="fullscreen-full" ></div>

--
### Inhaltliche Analyse

Wenn man alles lesen wollen würde

**409.265.622** Wörter im Korpus

**300** Wörter pro Minute

**8** Stunden am Tag

**356** Tage im Jahr 

--
# 7,78 Jahre
<div class="smaller" style="text-align: center">= 409265622 / 300 / 60 / 8 / 365 </div>

--
### Inhaltliche Analyse
- verrauschten Text zeigen wie können wir damit arbeiten? 
- Website vorstellen
- Ausblick: Möglichkeiten von Word-Clouds, z.B. Werbeanzeigen

--
<iframe src="https://bs.rockdapus.org/word-cloud.html" frameborder="0" class="fullscreen-full"></iframe>

--
# Krieg und Liebe

--
### Krieg
- Juli / August 1914

--
### Liebe (Roman auf der ersten Seite)

--
### Video
<video 
	width="320" 
	height="240" 
	src="./img-bremen/berliner-volkszeitung.mp4"
	controls 
	onclick="this.paused ? this.play() : this.pause();"
	class="fullscreen-full"
	style="background-color: #000" 
	></video>

--
### Links and Code

Besucht uns auf Twitter - benutzt unsern Source Code

[github.com/shoutrlabs/berliner-schlagzeilen](https://github.com/shoutrlabs/berliner-schlagzeilen)

# @volkszeitung100
<div style="text-align: center;">
	https://twitter.com/Volkszeitung100
</div>
