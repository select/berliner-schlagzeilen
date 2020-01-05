Download the zip files and extract and crop the images from them
```
cd ../metadataStatistics
./parse.metadata.js
> Download and parse one year
> 1921
./parse.metadata.js
> convert
> 1921
```

If you are missing the openjpg-tools
```
dpkg -i libopenjpeg5_1.5.2-3.1_amd64.deb openjpeg-tools_1.5.2-3.1_amd64.deb
```

Copy the images from `~/metadataStatistics/data/processedImages` to `~/server-data/img`

Sync the images and download the current tweets file so we can update it in the consequent step. 
```
npm run sync
```

Now prepare the tweets and sync the results to the server
```
./src/init.tweets.js
npm run sync
```



