const playlist_id = [
    "PLyLyJwftT08WRAn9xEFfhh0Z46fyzG5rL", 
    "PLyLyJwftT08XyaUQl_TGSf1rgC-oEExdC", 
    "PLyLyJwftT08Wj9-H5bKqkZMdUQ8cBvuzA",
    "PLyLyJwftT08W8EFfE9sY7IvyJAGNLCd5t"
]
const use_playlist_name = 2 // if 0, the file will be named with the playlist id, if 1 itll use the playlist name, if 2 it will have both <playlist_name>_<playlist_id>.txt
import * as fs from 'node:fs';
const folder_path = './playlists'
import { Innertube, Log, UniversalCache, YT, YTNodes }  from 'youtubei.js'

Log.setLevel(Log.Level.INFO)
main()
type Item = {url: string, title:string, author:string}
function convertPlaylistItem(item: YTNodes.PlaylistVideo | YTNodes.ReelItem | YTNodes.ShortsLockupView): Item | undefined{
    if (item instanceof YTNodes.PlaylistVideo) {
        let it = item as YTNodes.PlaylistVideo
        return {url: it.endpoint.toURL() || '', title: it.title.toString(), author: it.author.name}
    } else if (item instanceof YTNodes.ReelItem) {
        let it = item as YTNodes.ReelItem
        return {url: item.endpoint.toURL() || '', title: item.title.toString(), author: ''}
    } else if (item instanceof YTNodes.ShortsLockupView) {
        return undefined
    }
    Log.error(`convertPlaylistItem`, `erro: ${item}`);
    throw new Error(`Unknown item type`);
}

async function getPlaylistContent(playlist: YT.Playlist, file_path: {full: string, folder: string, name: string, p_id: string}) {
    const array: Array<Item> = []
    Log.info(`getPlaylistContent`, `Getting Playlist "${playlist.info.title}"`);
    let p = playlist
    let loopfn = (list: YT.Playlist) => {for (const video of list.items) {
            let item = convertPlaylistItem(video)
            if (item)
                array.push(item)
        }
    }
    loopfn(p)
    while (p.has_continuation) {
        p = await p.getContinuation()
        loopfn(p)
    }

    let str = array.map((item, index) => {return JSON.stringify({position: index + 1, ...item})}).join(',\n')
    try {
        if (!fs.existsSync(file_path.folder)) {
            fs.mkdirSync(folder_path, { recursive: true })
        }
        let finalobj = {
            playlist_name: playlist.info.title,
            playlist_description: playlist.info.description,
            playlist_type: playlist.info.type,
            playlist_id: file_path.p_id,
            number_of_views: playlist.info.views.split(' ')[0],
            number_of_videos: playlist.info.total_items.split(' ')[0],
            observed_number_of_videos: array.length, // this may be different from the total_items if the playlist has songs that have been removed or are unavailable
            items: array
        }
        fs.writeFileSync(file_path.full, JSON.stringify(finalobj, null, 4), {encoding: 'utf-8'})
        Log.info("getPlaylistContent",`Playlist read successfully: ${file_path.full}`);
    } catch (err: any) {
        Log.error("main",`Error creating file ${file_path.full}\n error: ${err.message}`);
    }

}



async function main() {
    const youtube = await Innertube.create({cache: new UniversalCache(false),  generate_session_locally: true})

    for (const id of playlist_id) {
        Log.info("main",`Fetching playlist with id: ${id}`);
        const playlist = await youtube.getPlaylist(`${id}`)
        //@ts-ignore 
        let filename = use_playlist_name === 0 ? `${id}.json` : use_playlist_name === 1 ? `${playlist.info.title?.replaceAll(" ", "_")}.json` : `${playlist.info.title?.replaceAll(" ", "_")}_${id}.json`
        let path = `${folder_path}/${filename}`
        Log.info("main",`File created: ${folder_path}/${id}`);
        try {
            getPlaylistContent(playlist,{full: path, folder: folder_path, name: filename, p_id: id})
        } catch (error) {
            Log.error("main",`Error getting playlist content for ${id}\n error: ${error}`);
        }
    }
}