const express = require('express');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

const app = express();

// USTA DİKKAT: Sitenin güncel adresi bu mu? Bu siteler sürekli adres değiştirir.
// Eğer telefondan girdiğinde .nl değil de .net falan açılıyorsa burayı ona göre değiştir!
const BASE_URL = 'https://www.hdfilmcehennemi.nl';

// Sahte Kimliğimiz (Site bizi normal bir kullanıcı sansın diye)
const fakeHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7'
};

const manifest = {
    id: 'com.hdfilmcehennemi',
    version: '1.0.1',
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

// 1. Kısım: Katalog
app.get('/catalog/:type/:id.json', async (req, res) => {
    try {
        const type = req.params.type;
        const url = type === 'movie' ? `${BASE_URL}/filmizle/` : `${BASE_URL}/yabanci-dizi-izle/`;
        console.log(`[KATALOG] İstek atılıyor: ${url}`);
        
        const response = await fetch(url, { headers: fakeHeaders });
        const html = await response.text();
        const $ = cheerio.load(html);
        const metas = [];

        // Güvenlik duvarına çarparsak anlayalım
        if(html.includes('Cloudflare') || html.includes('Just a moment...')) {
            console.log("[KATALOG] Usta fena patladık, Cloudflare engelledi!");
        }

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
        console.error("[KATALOG] Hata:", e);
        res.json({ metas: [] });
    }
});

// 2. Kısım: Meta
app.get('/meta/:type/:id.json', async (req, res) => {
    try {
        const fullId = req.params.id; 
        const base64Url = fullId.replace('hdfilm:', '');
        const url = Buffer.from(base64Url, 'base64').toString('utf-8');

        const response = await fetch(url, { headers: fakeHeaders });
        const html = await response.text();
        const $ = cheerio.load(html);

        const title = $('h1').first().text().trim() || $('meta[property="og:title"]').attr('content') || 'İsimsiz Film';
        const poster = $('meta[property="og:image"]').attr('content') || $('.poster img').attr('src');
        const description = $('.ozet').text().trim() || $('meta[name="description"]').attr('content') || 'Özet bulunamadı usta.';

        res.json({ 
            meta: { id: fullId, type: req.params.type, name: title, poster: poster, background: poster, description: description } 
        });
    } catch (e) {
        res.json({ meta: { id: req.params.id, type: req.params.type, name: "Hata Oluştu" } });
    }
});

// 3. Kısım: Stream
app.get('/stream/:type/:id.json', async (req, res) => {
    try {
        const fullId = req.params.id; 
        const base64Url = fullId.replace('hdfilm:', '');
        const url = Buffer.from(base64Url, 'base64').toString('utf-8');

        const response = await fetch(url, { headers: fakeHeaders });
        const html = await response.text();
        const $ = cheerio.load(html);

        let videoUrl = '';
        const iframeSrc = $('iframe').first().attr('src');

        if (iframeSrc) {
            videoUrl = iframeSrc.startsWith('http') ? iframeSrc : `https:${iframeSrc}`;
            res.json({ streams: [{ title: "HD Film Cehennemi", url: videoUrl }] });
        } else {
            res.json({ streams: [] });
        }
    } catch (e) {
        res.json({ streams: [] });
    }
});

app.get('/', (req, res) => {
    res.send('Stremio Addon çalışıyor usta!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Addon çalışıyor: port ${PORT}`));
