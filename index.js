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

// 1. Kısım: Katalog (Filmleri listelediğimiz yer)
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

// 2. Kısım: Bizim eklediğimiz META (Afiş ve Detay) kısmı
app.get('/meta/:type/:id.json', async (req, res) => {
    try {
        const type = req.params.type;
        const fullId = req.params.id; 
        const base64Url = fullId.replace('hdfilm:', '');
        const url = Buffer.from(base64Url, 'base64').toString('utf-8');

        console.log(`[META] Şuraya dalıyoruz: ${url}`);

        const response = await fetch(url);
        const html = await response.text();
        const $ = cheerio.load(html);

        const title = $('h1').first().text().trim() || $('meta[property="og:title"]').attr('content') || 'İsimsiz Film';
        const poster = $('meta[property="og:image"]').attr('content') || $('.poster img').attr('src');
        const description = $('.ozet').text().trim() || $('meta[name="description"]').attr('content') || 'Bu film için özet bulunamadı usta.';
        const background = poster; 

        const metaObj = {
            id: fullId,
            type: type,
            name: title,
            poster: poster,
            background: background,
            description: description
        };

        res.json({ meta: metaObj });
    } catch (e) {
        console.error("[META] Hata patladı usta:", e);
        res.json({ meta: { id: req.params.id, type: req.params.type, name: "Hata Oluştu" } });
    }
});

// 3. Kısım: Bizim eklediğimiz STREAM (Oynatıcı) kısmı
app.get('/stream/:type/:id.json', async (req, res) => {
    try {
        const fullId = req.params.id; 
        const base64Url = fullId.replace('hdfilm:', '');
        const url = Buffer.from(base64Url, 'base64').toString('utf-8');

        console.log(`[STREAM] Operasyon başladı, mekana dalıyoruz: ${url}`);

        const response = await fetch(url);
        const html = await response.text();
        const $ = cheerio.load(html);

        let videoUrl = '';
        const iframeSrc = $('iframe').first().attr('src');

        if (iframeSrc) {
            videoUrl = iframeSrc.startsWith('http') ? iframeSrc : `https:${iframeSrc}`;
            console.log(`[STREAM] İframe yakalandı: ${videoUrl}`);
        }

        if (videoUrl) {
            res.json({
                streams: [
                    {
                        title: "HD Film Cehennemi",
                        url: videoUrl 
                    }
                ]
            });
        } else {
            console.log("[STREAM] Linki bulamadık usta, sayfa boş çıktı.");
            res.json({ streams: [] });
        }

    } catch (e) {
        console.error("[STREAM] Motor su kaynattı usta:", e);
        res.json({ streams: [] });
    }
});

app.get('/', (req, res) => {
    res.send('HD Film Cehennemi Stremio Addon çalışıyor usta!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Addon çalışıyor: port ${PORT}`));
