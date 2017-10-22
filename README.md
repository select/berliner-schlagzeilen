# Berliner Schlagzeilen

Das Berliner Tageblatt war vor 100 Jahren eine der großen überregionalen Zeitungen in Deutschland und ein Leitmedium für gesellschaftliche Debatten und Diskurse. 1914 erreichte das Tageblatt 245.000 Leser und Leserinnen.

# https://twitter.com/Volkszeitung100

https://hackdash.org/projects/59ec6cc287d0970a0e0a3ca8

This project was created during the Coding Da Vinci 2017 using the zfz

http://zefys.staatsbibliothek-berlin.de/

https://codingdavinci.de/

## Installation

Clone the git project 

```
git clone
```

Then install all dependecies.
```
npm install
```

## Getting data

You can find the map between the date and the metadata file ids for the  **Berliner Volkszeitung** at `data/date2metaDataId.json`. Read more if you want to know how the script works.


From the derived URLs, so called [METS](https://www.loc.gov/standards/mets/) files can be obtained. A METS file contains e.g. the following sections that are relevant here:

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

## Date to metadata script

Run the script with

```
./src/metadata.js
```

The generated mapping can be found at 

```
data/date2metaDataId.json
```

This is the page where we can get the identifiers for each newspaper.
There can be multiple issues for one newspaper for one day.

```
http://zefys.staatsbibliothek-berlin.de/kalender/auswahl/date/1917-02-07/27971740/?no_cache=1
```

The identifier `27971741` is for the Berliner Volkszeitung. The date can be generated. Note that only for issues from the time period of 1890-1930, OCRed text files are provided.

The identifiers for the other Berlin newspapers are:
- Berliner Tageblatt ```27646518``` (1878-1928)
- Berliner Börsenzeitung ```2436020X``` (1872-1930)
- Norddeutsche Allgemeine Zeitung ```28028685``` (1879-1919)

From this page we scrape the identifier `454dde27-b9f4-4faf-987f-ee73cad2c351` and generate the link to the XML metadata file.

```
http://zefys.staatsbibliothek-berlin.de/oai/?tx_zefysoai_pi1[identifier]=454dde27-b9f4-4faf-987f-ee73cad2c351
```
