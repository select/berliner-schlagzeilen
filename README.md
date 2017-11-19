# Berliner Schlagzeilen

Die Berliner Volks-Zeitung war vor 100 Jahren die Tageszeitung für die Metropole Berlin. Mit Sensationen und Unterhaltung wurde sie zur erfolgreichsten Boulevardzeitung der Zeit.

We tweet news headlines and newspaper images of the Berliner Volks-Zeitung from exactly 100 years ago, every day.

# [twitter.com/volkszeitung100](https://twitter.com/Volkszeitung100)

## Motivation

This project was created during the [Coding Da Vinci](https://codingdavinci.de/) hackaton 2017 using the [Zefys database](http://zefys.staatsbibliothek-berlin.de/).

Our project is also present on the official Coding Da Vinci [Hackdash](https://hackdash.org/projects/59ec6cc287d0970a0e0a3ca8)

## Community

Add your ideas and questions to our [issue tracker](https://github.com/shoutrlabs/berliner-schlagzeilen/issues).

Talk to us directly, join our chat on [slack](https://join.slack.com/t/cdvb17/shared_invite/enQtMjU5OTM1MzkwNzM5LTQ1N2MzYWY4MmNhYjM0NTYyZTNhMGYyOWVmNzVkYjRiOTJlMmEwOTA0YjkyMjViMWZkNzBkNzZiOWYwNGJmM2U).

## Installation

Clone the git project.
```
git clone git@github.com:shoutrlabs/berliner-schlagzeilen.git
```

Go to the new directory.
```
cd berliner-schlagzeilen
```

Install all dependecies.
```
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

This will download all images from `date2metaDataId.json` to the `data/img/raw` directory. We now look at each image and manually crop a nice version into the `data/img` directory. From the images in `data/img` we can now generate empty tweets.

```
node ./src/init.tweets.js
```

The script extends the `data/tweets.json` file. The messages have to be written manually (the `status` field needs to be exented). This is an example entry.

```
{
    "sendAfter": "2017-11-06 19:35",
    "status": "… 06.11.1917 http://zefys.staatsbibliothek-berlin.de/kalender/auswahl/date/1917-11-06/27971740",
    "alt_text": "Berliner Volkszeitung 06.11.1917 Abend-Ausgabe",
    "img": "1917-11-06.2.png",
    "tweetId": 0
  }
```

To send tweets run.

```
node ./src/tweet.js
```

The script checks if there is a tweet with a date-time lower than the current date-time in `sendAfter` and a falsy `tweetId`. As soon as a tweet is successfully send the `tweetId` is filled. If there was an error sending the tweet an `error` field is added to the tweet.

```
{
    "sendAfter": "2017-11-02 19:35",
    "status": "Hertling Reichskanzler. 02.11.1917 http://zefys.staatsbibliothek-berlin.de/kalender/auswahl/date/1917-11-02/27971740",
    "alt_text": "Berliner Volkszeitung 02.11.1917 Abend-Ausgabe",
    "img": "1917-11-02.2.png",
    "error": "Error: ENOENT: no such file or directory, open '/home/select/Dev/berliner-schlagzeilen/src/../data/img/1917-11-02.2.png'"
  },
```

Also tweets containing an `error` will be skipped.

To automate sending tweets we create a cronjob that tries to tweet every x minutes

```
# To create the coronjob run the followin command
# crontab -e
# then add the following line (and adapt the paths)
*/15 * * * *  /path/to/src/tweet.js >> /path/to/log/cron.log 2>&1
```

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
