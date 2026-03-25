const express = require('express');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

const app = express();
const BASE_URL = 'https://www.hdfilmcehennemi.nl';

const manifest = {
    id: 'com.hdfilmcehennemi',
    version: '1.0.0',
    name: 'HD Film Cehennemi',
    description: 'Türkçe dublaj ve altyazılı film ve dizi',
    resources: ['catalog', 'meta', 'stream'],
    types: ['movie', 'series'],
    catalogs: [
        { type: 'movie', id: 'hdfilm-movies', name: 'HD Film Cehennemi Filmler' },
        { type: 'series', id: 'hdfilm-series', name: 'HD Film Cehennemi Diziler' }
    ],
    idPrefixes: ['hdfilm:']
};

app.get('/manifest.json', (req, res) => {
    res.json(manifest);
});

app.get('/catalog/:type/:id.json', async (req, res) => {
    try {
        const type = req.params.type;
        const url = type === 'movie' ? `${BASE_URL}/filmizle/` : `${BASE_URL}/yabanci-dizi-izle/`;
        const response = await fetch(url);
        const html = await response.text();
        const $ = cheerio.load(html);
        const metas = [];
        $('.movie-item, .film-item, article').each((i, el) => {
            const title = $(el).find('h2, h3, .title').first().text().trim();
            const poster = $(el).find('img').attr('data-src') || $(el).find('img').attr('src');
            const link = $(el).find('a').attr('href');
            if (title && poster && link) {
                metas.push({
                    id: 'hdfilm:' + Buffer.from(link).toString('base64'),
                    type,
                    name: title,
                    poster
                });
            }
        });
        res.json({ metas });
    } catch (e) {
        res.json({ metas: [] });
    }
});

app.get('/stream/:type/:id.json', async (req, res) => {
    res.json({ streams: [] });
});

app.get('/', (req, res) => {
    res.send('HD Film Cehennemi Stremio Addon çalışıyor!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Addon çalışıyor: port ${PORT}`));
