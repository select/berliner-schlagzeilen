# Berliner Schlagzeilen

Die Berliner Volks-Zeitung war vor 100 Jahren die Tageszeitung für die Metropole Berlin. Mit Sensationen und Unterhaltung wurde sie zur erfolgreichsten Boulevardzeitung der Zeit.

# [twitter.com/Volkszeitung100](https://twitter.com/Volkszeitung100)

https://hackdash.org/projects/59ec6cc287d0970a0e0a3ca8

This project was created during the Coding Da Vinci 2017 using the Zefys database.

http://zefys.staatsbibliothek-berlin.de/

https://codingdavinci.de/

## Installation

Clone the git project 

```
git clone git@github.com:shoutrlabs/berliner-schlagzeilen.git
```

Then install all dependecies.
```
cd berliner-schlagzeilen
npm i
```

## Running

First we need to scrape the Zefys site to get the hash id under which we can can download the images for each newspaper

```
node ./src/load.metaData.js
```

This will generate the file `date2metaDataId.json` with entries like
```
{
    "date": "1917-11-19",
    "ids": [
      "10e23300-0776-4ca8-af12-d9026cfd8f8b",
      "a3918c61-3a39-4a9c-b06e-23c36f1885ba"
    ]
  },
```

Now we can download the images with

```
node ./src/load.images.js
```

This will download all images from `date2metaDataId.json` to the `data/img` directory. From the images we can now generate empty tweets.

```
node ./src/init.tweets.js
```

This will extend the `data/tweets.json` file. The messages have to be written by hand. 

In the future we can extend this process by automatically retrieving the texts from OCR scans of the images. This is currently not possible due to API restrictions, but once this the API is ready the next section explains where the ORC information can be retrieved.

## Getting Metadata and links to OCR files

Using the ids in `date2metaDataId.json` we can generate URLs to get so called [METS](https://www.loc.gov/standards/mets/) files. A METS file contains the following sections:

Metadata about the publication sits in
```xml
<mets:dmdSec>
```
including, among other things:

Unique title of the newspaper
```xml
<mods:title>
```
Date of publication of the newspaper issue
```xml
<mods:dateIssued>
```

Further down the tree, there is a section for all information on data objects relating to the issue
```xml
<mets:fileSec>
```
which again has children for different file groups (images, text, etc)
```xml
<mets:fileGrp>
```
that contain elements with URIs for the various data objects per newspaper page
```xml
<mets:file MIMETYPE="image/jpg" ID="default_1">
   <mets:FLocat LOCTYPE="URL" xlink:href="http://ztcs.staatsbibliothek-berlin.de/zefys_contentServer.php?action=metsImage&format=png&metsFile=454dde27-b9f4-4faf-987f-ee73cad2c351&divID=phys_1&width=1200&metsFileGroup=PRESENTATION"/>
</mets:file>
```

## Newspaper id mappings

```
http://zefys.staatsbibliothek-berlin.de/kalender/auswahl/date/1917-02-07/27971740/?no_cache=1
```

The identifier `27971741` is for the Berliner Volkszeitung. The date can be generated. Note that only for issues from the time period of 1890-1930, OCRed text files are provided.

The identifiers for the other Berlin newspapers are:
- Berliner Tageblatt ```27646518``` (1878-1928)
- Berliner Börsenzeitung ```2436020X``` (1872-1930)
- Norddeutsche Allgemeine Zeitung ```28028685``` (1879-1919)

On the URL above we scrape the identifier `454dde27-b9f4-4faf-987f-ee73cad2c351` and generate the link to the XML metadata file.

```
http://zefys.staatsbibliothek-berlin.de/oai/?tx_zefysoai_pi1[identifier]=454dde27-b9f4-4faf-987f-ee73cad2c351
```
