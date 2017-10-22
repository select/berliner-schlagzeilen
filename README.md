# Berliner Schlagzeilen

Twitterbot mit Nachrichten von vor 100 Jahren

## Getting data

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
