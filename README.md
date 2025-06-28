# YoutubePlaylistArchiver
I want to backup all the songs on my playlists so i dont lose any song ever
# to use with other playlists simply change the playlist id at the top of index.js. since it's an array, you can add multiple
# then a file will be created with the playlist id or the playlist name (also configurable).

# just do `npm install` and `npm run start` to run on your laptop 

this repository runs every monday at 00:00 UTC (github actions restriction), executes the script for the given playlist ids which creates the files and then commits them with the template "playlist change on YYYY-MM-DD"
