this folder contains code for searching places like soulseek and downloading them

# how to use

create a .env with
```env
SLSK_USERNAME=<soulseek username>
SLSK_PASSWORD=<soulseek password>
PLAYLISTS=<all | git>
# if it doesnt exist, it will be created, recursively
DOWNLOAD_PATH=<data dir> 
# options for soulseek
SLSK_HOST=
SLSK_PORT=
SLSK_INCOMING_PORT=
# separate with commas ,
SLSK_SHARED_FOLDERS=
# add this so that you dont get ads on the terminal
DOTENV_CONFIG_QUIET=true
```
and execute `npm run start`