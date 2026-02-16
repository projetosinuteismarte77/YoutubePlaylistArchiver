import { exit } from "process"

// @ts-nocheck noImplicitAny
const slsk = require('slsk-client')
require('dotenv').config()
const fs = require('fs')

type SoulSeekFileResult = {
  user: string,
  file: string,
  size: number,
  slots: boolean,
  bitrate: number,
  speed: number
}

type PlaylistFile = {
  playlist_name: string,
  playlist_description: string,
  playlist_type: string,
  playlist_id: string,
  number_of_views: string,
  number_of_videos: string,
  observed_number_of_videos: number,
  items: {
    url: string,
    title: string,
    author: string,
  }[]
}

function filterResultsPredicate(result: SoulSeekFileResult) {
  return result.file.toLowerCase().includes('.flac') || result.file.toLowerCase().includes('.opus') || (result.file.toLowerCase().includes('.mp3') && result.bitrate >= 320)
}



async function main() {

  let playlists: PlaylistFile[] = fs.readdirSync('../playlists').filter(file => file.endsWith('.json')).map(file => {
    const filePath = `../playlists/${file}`
    const fileContent = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(fileContent) as PlaylistFile
  })

  playlists = [playlists[0]]
  playlists[0].items = [playlists[0].items[0]]

  const clientConnectCallback = (err: any, client: any) => { 
    if (err) {
      console.error('Error connecting to SLSK client:', err)
      return
    }
    console.log('Iterating over playlists')
    for (const playlist of playlists) {
      for (const item of playlist.items) {
        console.log('Searching for item:' + item.title)
        client.search(
          {req: item.title},
          (err: any, res: SoulSeekFileResult[]) => {
            if (err) return console.error('Error during search:', err)
            let found = res.filter(filterResultsPredicate)
            if (found.length < 1) {
              client.search({req: item.author + ' ' + item.title}, (err: any, res: any[]) => {
                if (err) return console.error('Error during search:', err)
                found = res.filter(filterResultsPredicate)
              })
            }
            if (found.length < 1) {
              console.log('No results found for item: ' + item.title)
              return
            }
            let fileToDownload: SoulSeekFileResult | null = null
            const flac = found.filter(res => res.file.toLowerCase().endsWith('.flac'))
            if (flac.length > 0) {
              fileToDownload = flac[0]
            } else {
              const opus = found.filter(res => res.file.toLowerCase().endsWith('.opus'))
              if (opus.length > 0) {
                fileToDownload = opus[0]
              } else {
                if (found.length > 0)
                  fileToDownload = found[0]
              }
            }
            console.log('Selected file for download: ' + (fileToDownload ? fileToDownload.file : 'Not found'))
            if (fileToDownload)
              client.download({
                file: fileToDownload,
                path: process.env.DOWNLOAD_PATH + '/' + fileToDownload.user + '_' + fileToDownload.file
              }, (err, data) => {
                // do nothing i think
              })
            else {
              console.log('No suitable file found for item: ' + item.title)
              fs.appendFileSync('not_found.txt', `${item.author} - ${item.title}\n`, { encoding: 'utf-8' })
            }
          }
        )
      }
    }
    exit(0)
  }

  slsk.connect({
    user: process.env.SLSK_USERNAME,
    pass: process.env.SLSK_PASSWORD,
    host: process.env.SLSK_HOST,
    port: process.env.SLSK_PORT,
    incomingPort: process.env.SLSK_INCOMING_PORT,
    sharedFolders: process.env.SLSK_SHARED_FOLDERS === undefined ? [] : process.env.SLSK_SHARED_FOLDERS.split(',').map(folder => folder.trim())
  }, clientConnectCallback)
}

try {
  if (!process.env.SLSK_USERNAME || !process.env.SLSK_PASSWORD || !process.env.DOWNLOAD_PATH) {
    console.error('Missing required environment variables. Please set SLSK_USERNAME, SLSK_PASSWORD and DOWNLOAD_PATH.')
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