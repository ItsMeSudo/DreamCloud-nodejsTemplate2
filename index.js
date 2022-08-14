const { DisTube } = require('distube')
const Discord = require('discord.js')
const figlet = require('figlet');
const client = new Discord.Client({
  intents: [
    Discord.Intents.FLAGS.GUILDS,
    Discord.Intents.FLAGS.GUILD_MESSAGES,
    Discord.Intents.FLAGS.GUILD_VOICE_STATES
  ],
  autoReconnect: true
})
const { SpotifyPlugin } = require('@distube/spotify')
const { SoundCloudPlugin } = require('@distube/soundcloud')
const { YtDlpPlugin } = require('@distube/yt-dlp')
client.distube = new DisTube(client, {
  leaveOnStop: false,
  emitNewSongOnly: true,
  emitAddSongWhenCreatingQueue: false,
  emitAddListWhenCreatingQueue: false,
  plugins: [
    new SpotifyPlugin({
      emitEventsAfterFetching: true
    }),
    new SoundCloudPlugin(),
    new YtDlpPlugin()
  ],
  youtubeDL: false
})
const dotenv = require('dotenv').config();
const token = dotenv.parsed.TOKEN;
const prefix = '&'

figlet('A bot fut, by: DreamCloud!', function (err, data) {
    console.log(data);
});

const distube = new DisTube(client, {
    searchSongs: 5,
    searchCooldown: 30,
    leaveOnEmpty: false,
    leaveOnFinish: false,
    leaveOnStop: true,
    youtubeDL: false,
    plugins: [new YtDlpPlugin()],
})

client.on('ready', client => {
    setInterval(()=>{
        client.user.setActivity(`DreamCloud.hu`, { type: "WATCHING"})
    },30000)
    client.user.setActivity(`DreamCloud.hu`, { type: "WATCHING"})
    console.log(`Sikeresen bejeletkezett ${client.user.tag} néven!`)
})
// client.on("debug", console.log)

client.on('messageCreate', message => {
    if (message.author.bot || !message.inGuild()) return
    if (!message.content.startsWith(prefix)) return
    const args = message.content
        .slice(prefix.length)
        .trim()
        .split(/ +/g)
    const command = args.shift()

    if (command === 'play') {
        const voiceChannel = message.member?.voice?.channel
        if (voiceChannel) {
            distube.play(voiceChannel, args.join(' '), {
                message,
                textChannel: message.channel,
                member: message.member,
            })
        } else {
            message.channel.send(
                'Először csatlakoznod kell egy hangcsatornába.',
            )
        }
    }

    if (['repeat', 'loop'].includes(command)) {
        const mode = distube.setRepeatMode(message)
        message.channel.send(
            `Ismétlési mód beállítva erre: \`${
                mode
                    ? mode === 2
                        ? 'Egész lista'
                        : 'Ez a zene'
                    : 'Kikapcsolva'
            }\``,
        )
    }

    if (command === 'stop') {
        distube.stop(message)
        message.channel.send('Zene megállítva!')
    }

    if (command === 'leave') {
        distube.voices.get(message)?.leave()
        message.channel.send('Sikeres lecsatlakozás!')
    }

    if (command === 'resume') distube.resume(message)
    if (command === 'pause') distube.pause(message)
    if (command === 'skip') distube.skip(message)
    if (command === 'queue') {
        const queue = distube.getQueue(message)
        if (!queue) {
            message.channel.send('Semmi nem szól jelenleg!')
        } else {
            message.channel.send(
                `Jelenlegi lista:\n${queue.songs
                    .map(
                        (song, id) =>
                            `**${id ? id : 'Ez szól'}**. ${
                                song.name
                            } - \`${song.formattedDuration}\``,
                    )
                    .slice(0, 10)
                    .join('\n')}`,
            )
        }
    }

    if (
        [
            '3d',
            'bassboost',
            'echo',
            'karaoke',
            'nightcore',
            'vaporwave',
        ].includes(command)
    ) {
        const filter = distube.setFilter(message, command)
        message.channel.send(
            `Jelenlegi filter: ${filter.join(', ') || 'Kikapcsolva'}`,
        )
    }
})

const status = queue =>
    `Hangerő: \`${queue.volume}%\` | Filter: \`${
        queue.filters.join(', ') || 'Kikapcsolva'
    }\` | Ismétlés: \`${
        queue.repeatMode
            ? queue.repeatMode === 2
                ? 'Egész lista'
                : 'Ez a zene'
            : 'Kikapcsolva'
    }\` | Autoplay: \`${queue.autoplay ? 'Bekapcsolva' : 'Kikapcsolva'}\``

distube
    .on('playSong', (queue, song) =>
        queue.textChannel?.send(
            `Jelenleg ez szól: \`${song.name}\` - \`${
                song.formattedDuration
            }\`\nKérte: ${song.user}\n${status(queue)}`,
        ),
    )
    .on('addSong', (queue, song) =>
        queue.textChannel?.send(
            `Hozzáadva: ${song.name} - \`${song.formattedDuration}\` zene a listához, általa: ${song.user}`,
        ),
    )
    .on('addList', (queue, playlist) =>
        queue.textChannel?.send(
            `Hozzáadva: \`${playlist.name}\` playlist (${
                playlist.songs.length
            } zene) a listához\n${status(queue)}`,
        ),
    )
    .on('error', (textChannel, e) => {
        console.error(e)
        textChannel.send(
            `Hiba: ${e.message.slice(0, 2000)}`,
        )
    })
    .on('finish', queue => queue.textChannel?.send('A lista a végéhez ért!'))
    .on('finishSong', queue =>
        queue.textChannel?.send('Zene vége!'),
    )
    .on('disconnect', queue =>
        queue.textChannel?.send('Lecsatlakozva!'),
    )
    .on('empty', queue =>
        queue.textChannel?.send(
            'Üres a hangcsatorna. Lecsatlakozás...',
        ),
    )

    .on('searchResult', (message, result) => {
        let i = 0
        message.channel.send(
            `**Válassz az elérhető opciók közül:**\n${result
                .map(
                    song =>
                        `**${++i}**. ${song.name} - \`${
                            song.formattedDuration
                        }\``,
                )
                .join(
                    '\n',
                )}\n*írj be valamit vagy várj 30másodpercet a visszavonáshoz.*`,
        )
    })
    .on('searchCancel', message =>
        message.channel.send('Keresés visszavonva'),
    )
    .on('searchInvalidAnswer', message =>
        message.channel.send('HIBA.'),
    )
    .on('searchNoResult', message =>
        message.channel.send('Nincs találat!'),
    )
    .on('searchDone', () => {})

client.login(token)
