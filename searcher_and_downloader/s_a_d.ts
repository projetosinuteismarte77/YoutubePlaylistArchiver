import { execSync } from "child_process"
import { exit } from "process"
import fs from 'node:fs'
import slsk from 'slsk-client'
import { promisify } from "node:util"
import parallelLimit from 'async/parallelLimit';
// @ts-nocheck noImplicitAny
require('dotenv').config()
//disable console
if (false) {
  console.log = ()=>{}
  console.error = ()=>{}
}

const genres = [
"Trap",
"Trap Remix",
"Future Trap",
"Dubstep",
"Drumstep",
"Drum & Bass",
"DnB",
"Hybrid Trap",
"Moombahton",
"House",
"Future House",
"Progressive House",
"Hardstyle",
"Hard Dance",
"Nu Disco",
"Jersey Club",
"Glitch Hop",
"Electro",
"Electro Swing",
"Electronic",
"Indie Dance",
"Wave",
"Melodic Dubstep",
]
const authorsBlacklist = [
  "Monstercat Uncaged",
  "Proximity",
  "renato silva",
  "Trap Nation",
  "Form Music",
  "G4F Records",
  "TheBugglesVEVO",
  "World Circuit Records",
  "Radio Edit",
  "House Nation",
  "Trap City",
  "Atlantic Records",
  "Trap and Bass",
  "GalaxyMusic",
  "NoCopyrightSounds",
  " Trap Nation  ",
  "Trap City  ",
  "Tribal Trap  ",
  "GLOBΛL Trap  ",
  "Dubstep N Trap  ",
  "Future House Music  ",
  "House Nation  ",
  "Bass Nation  ",
  "Chill Nation  ",
  "Indie Nation  ",
  "Nightblue Music  ",
  "CloudKid  ",
  "AirwaveMusicTV  ",
  "xKito Music  ",
  "Frequency Music  ",
  "Liquicity  ",
  "NoCopyrightSounds  ",
  "Monstercat Uncaged  ",
  "Monstercat Instinct  ",
  "UKF Drum & Bass  ",
  "Ninety9Lives  ",
  "MA Music  ",
  "MA Free  ",
  "Fatal Music  ",
  "GalaxyMusic  ",
  "Funky Panda (Funky Panda™)  ",
  "Visionary Music Group  ",
  "SKFuture  ",
  "Tesla Records  ",
  "Gemstone Records  ",
  "Spinnin' Records  ",
  "STMPD RCRDS  ",
  "Revealed Music  ",
  "Atlantic Records  ",
  "Ultra Records  ",
  "Protocol Recordings  ",
  "Rhymesayers Entertainment  ",
  "EDM City  ",
  "Future City  ",
  "Trap Warrior  ",
  "Maron Music  ",
  "Superior Tracks  ",
  "Diversity  ",
  "CyberPixl Music ",
]
const keywordsBlacklist = [
  "Monstercat Release",
  "Official Music Video",
  "Official Audio",
  "| NCS - Copyright Free Music",
"Official Video",
"Official Music Video",
"Music Video",
"Official Audio",
"(Audio)",
"Lyric Video",
"Lyrics",
"Lyric Video",
"Official Music Video",
"Official Audio",
"Video Oficial",
"Bass Boosted",
"Free Download",
"Free",
"Premiere",
"Exclusive",
"Monstercat Release",
"Monstercat EP Release",
"Monstercat FREE Release",
"NCS Release",
"| NCS - Copyright Free Music",
"Copyright Free Music",
"Proximity Release",
"Lyric Video",
]

const slskConnect = promisify(slsk.connect);

const playlistNames = [
  "músicas_2_PLyLyJwftT08WRAn9xEFfhh0Z46fyzG5rL.json",
  "Músic\\(as\\)_PLyLyJwftT08W8EFfE9sY7IvyJAGNLCd5t.json",
  "musicas_que_deviam_estar_no_primeiro_musicas_mas_não_estao_por_alguma_razao_PLyLyJwftT08VYMvYfFr5iNJZcTQvUCL7Q.json",
]


type SoulSeekFileResult = {
  user: string,
  file: string,
  size: number,
  slots: boolean,
  bitrate: number,
  speed: number
}
type Song = {
  url: string,
  title: string,
  author: string,
}
type PlaylistFile = {
  playlist_name: string,
  playlist_description: string,
  playlist_type: string,
  playlist_id: string,
  number_of_views: string,
  number_of_videos: string,
  observed_number_of_videos: number,
  items: Song[]
}

function filterResultsPredicate(result: SoulSeekFileResult) {
  return result.file.toLowerCase().includes('.flac') || result.file.toLowerCase().includes('.opus') || (result.file.toLowerCase().includes('.mp3') && result.bitrate >= 320)
}
function sortResultsPredicate(a: SoulSeekFileResult, b: SoulSeekFileResult) {
  // sort by file type (flac > opus > mp3) and then by bitrate
  const aFileType = a.file.toLowerCase().endsWith('.flac') ? 3 : a.file.toLowerCase().endsWith('.opus') ? 2 : a.file.toLowerCase().endsWith('.mp3') ? 1 : 0
  const bFileType = b.file.toLowerCase().endsWith('.flac') ? 3 : b.file.toLowerCase().endsWith('.opus') ? 2 : b.file.toLowerCase().endsWith('.mp3') ? 1 : 0
  if (aFileType === bFileType) {
    return b.bitrate - a.bitrate
  }
  return bFileType - aFileType
}

async function getPlaylists(): Promise<PlaylistFile[]> {
  if (process.env.PLAYLISTS && process.env.PLAYLISTS === 'all')
    return fs.readdirSync('../playlists').filter(file => (playlistNames.includes(file))).map(file => {
      const filePath = `../playlists/${file}`
      const fileContent = fs.readFileSync(filePath, 'utf-8')
      return JSON.parse(fileContent) as PlaylistFile
    })
  else if (process.env.PLAYLISTS && process.env.PLAYLISTS === 'git'){
    execSync("git pull")
    // check git history for the latest added songs and create a list of them
    let stdout = execSync('git log -1', {encoding:'utf-8'})
    let commitHash = stdout.split("\n")[0].split("commit ")[1]
    let results: PlaylistFile[] = []
    commitHash = "4895a804d1378437c5d9ba5f5d00cc5cae2ad1de"
    console.log("commitHash ", commitHash)
    for (const p of playlistNames) {
      // command from https://stackoverflow.com/a/5586435
      stdout = execSync(`git diff ${commitHash}:playlists/${p} -- ../playlists/${p}`, {encoding:'utf-8', maxBuffer:5000000}) // set a buffer so that the entire file doesnt get stored in memory
      let res_out: string[] = stdout
        .split("\n")
        .filter(val => val.startsWith("- ") || val.startsWith("+ "))
        .filter(val => !(val.indexOf("number_of_videos") > -1 || val.indexOf("observed_number_of_videos") > -1|| val.indexOf("number_of_views") > -1))
      if (res_out[0].startsWith( '-') && res_out[1].startsWith( '-') && res_out[2].startsWith("-")) {
        let i = 2
        for (i; i < res_out.length; i++) {
          const element = res_out[i];
          if (element.startsWith('+'))
            break
        }
        res_out = res_out.slice(i-1) // remove all the removed entries
      }
      if (res_out[0].startsWith("-") && res_out[1].startsWith("+") && res_out[2].startsWith("+")) {
        // means we got additions
        // the first plus (index 1) marks the start of a json object, and we go until the first "-" encoutered nex
        res_out.shift()
        let indexOfFirstMinus = -1;
        for (let index = 0; index < res_out.length; index++) {
          if (res_out[index].startsWith("- ")) {
            indexOfFirstMinus = index
            break;
          }
        }
        res_out = res_out.filter((_, index) => index < indexOfFirstMinus)
        res_out = res_out.map(val => val.split("+ ")[1].trim())
        res_out = res_out.slice(0, -2) // removes the last url and {
        let string = "[{" + res_out.join("")
        if (string.endsWith(","))
          string = string.substring(0, string.length - 1)
        string = string + "]"
        let pFile: PlaylistFile= {
          playlist_name: p.substring(0, p.lastIndexOf("_")),
          items: JSON.parse(string),
          playlist_id: p.substring( p.lastIndexOf("_")+1, p.length),
          playlist_type:"",
          playlist_description:"",
          number_of_videos:"",
          number_of_views:"",
          observed_number_of_videos:0
        }
        results.push(pFile)
      }
      console.log("New songs: ",results.length, results.map(val => val.playlist_name + " " + val.items.length))
    }
    return results
  }else {
    throw new Error("PLAYLISTS environment variable not set or invalid. It can be either 'all' or 'git'")
  }
}

async function main() {
  let listOfFiles: ({fileType: "mp3" | "flac" | "opus", path:string, file: SoulSeekFileResult})[] = []
  let playlists: PlaylistFile[] = await getPlaylists()
  const client = await slskConnect({
    user: process.env.SLSK_USERNAME,
    pass: process.env.SLSK_PASSWORD,
    host: process.env.SLSK_HOST,
    port: process.env.SLSK_PORT,
    incomingPort: process.env.SLSK_INCOMING_PORT,
    sharedFolders: process.env.SLSK_SHARED_FOLDERS === undefined ? [] : process.env.SLSK_SHARED_FOLDERS.split(',').map(folder => folder.trim())
  })
  const clientSearch = promisify(client.search)
  const clientDownload = promisify(client.download)
  const notFoundSongsPlaylist: {songs_missing:Song[], playlist_name: string, playlist_id:string}[] = []
  for (const playlist of playlists) {
    let notFoundSongs: Song[] = []
    for (const item of playlist.items) {
      let title = item.title
      let foundAuthor = false
      for (const author of authorsBlacklist) {
        if (title.indexOf(author)>=0)
        {
          foundAuthor = true
          break
        }
      }
      if (!foundAuthor)
        title = title + " " + item.author.replace("- Topic","")
      title = title.trim()
      if (title.startsWith("- ")) title = title.substring(2)
      if (title.startsWith(" -")) title = title.substring(0, title.length-2)
      for (const keyword of keywordsBlacklist) {
        if (title.indexOf(keyword) >= 0) {
          title = title.replace(keyword,"")
        }
      }
      for (const genre of genres) {
        if (title.indexOf(genre) >= 0) {
          title = title.replace(genre,"")
        }
      }
      title = title.replace("[","").replace("(","").replace("]","").replace(")","")
      let res: SoulSeekFileResult[] = await clientSearch.call(client, ({req: title}))
      let found = res.sort((a,b)=> b.speed - a.speed).sort(sortResultsPredicate).filter(filterResultsPredicate)
      if (found.length < 1) {
        client.search({req: item.author + ' ' + item.title}, (err: any, res: any[]) => {
          if (err) return console.error('Error during search:', err)
          found = res.filter(filterResultsPredicate)
        })
      }
      if (found.length < 1) {
        console.log('No results found for item: ' + item.title)
        continue
      }
      let fileToDownload: SoulSeekFileResult | null = null
      let fileType: "mp3" | "flac" | "opus" | null = null
      const flac = found.filter(res => res.file.toLowerCase().endsWith('.flac'))
      if (flac.length > 0) {
        fileToDownload = flac[0]
        fileType = "flac"
      } else {
        const opus = found.filter(res => res.file.toLowerCase().endsWith('.opus'))
        if (opus.length > 0) {
          fileToDownload = opus[0]
          fileType = "opus"
        } else {
          if (found.length > 0) {
            fileType = "mp3"
            fileToDownload = found[0]
          }
        }
      }
      if (fileToDownload) {
        console.log("Downloading: ", title, fileToDownload)
        listOfFiles.push({fileType: fileType, file:fileToDownload, path:`${item.title}.${fileType}` })
        //await clientDownload({file:fileToDownload, path: __dirname+`/downloads/${item.title}.${fileType}`})
      } else {
        notFoundSongs.push(item)
      }
    }
    notFoundSongsPlaylist.push({
      songs_missing:notFoundSongs,
      playlist_id:playlist.playlist_id,
      playlist_name:playlist.playlist_name
    })
  }
  fs.writeFile("songs_not_found.json",JSON.stringify(notFoundSongsPlaylist),(_)=>{})
  parallelLimit(listOfFiles.map(song => clientDownload(({file:song.file, path: song.path}))), 20, (err,results)=>{
    fs.writeFile("parallellDownloadOutput.json", JSON.stringify({err:err, results:results}), (_)=>{})
  })
}

try {
  if (!process.env.SLSK_USERNAME || !process.env.SLSK_PASSWORD || !process.env.DOWNLOAD_PATH || !process.env.PLAYLISTS) {
    console.error('Missing required environment variables. Please set SLSK_USERNAME, SLSK_PASSWORD, PLAYLISTS and DOWNLOAD_PATH.')
  } else {
    if (!fs.existsSync(process.env.DOWNLOAD_PATH)) {
      fs.mkdirSync(process.env.DOWNLOAD_PATH, { recursive: true })
    }
    main()
  }
} catch (error) {
  console.error('Error running main function:', error)
  exit(1)
}