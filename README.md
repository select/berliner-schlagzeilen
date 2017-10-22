# Berliner Schlagzeilen

Twitterbot mit Nachrichten von vor 100 Jahren

## Getting data

This is the page where we can get the identifiers for each newspaper.
There can be multiple issues for one newspaper for one day.

```
http://zefys.staatsbibliothek-berlin.de/kalender/auswahl/date/1917-02-07/27971740/?no_cache=1
```

The indetifier `27971741` is for the Berliner Volkszeitung. The date can be generated. 

From this page we scrape the identifier `454dde27-b9f4-4faf-987f-ee73cad2c351` and generate the link to the XML metadata file.

```
http://zefys.staatsbibliothek-berlin.de/oai/?tx_zefysoai_pi1[identifier]=454dde27-b9f4-4faf-987f-ee73cad2c351
```
