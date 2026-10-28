import { parseTriton, tritonMount } from '../src/radio/radio.service';

// np.tritondigital.com yanıtının kısaltılmış hali (28 Eki 2026, SUPER_FM)
const xml = (p: Record<string, string>) =>
  `<?xml version="1.0" encoding="UTF-8"?><nowplaying-info-list><nowplaying-info mountName="SUPER_FM" type="track">${Object.entries(p)
    .map(([k, v]) => `<property name="${k}"><![CDATA[${v}]]></property>`)
    .join('')}</nowplaying-info></nowplaying-info-list>`;
const START = 1_793_169_429_000;
const song = {
  cue_time_duration: '229000',
  cue_time_start: String(START),
  cue_title: '10. Yıl Marşı',
  track_artist_name: 'Kenan Doğulu',
  track_cover_url: 'https://mediacdns.karnaval.com/media/album_media/47974/albumcover_400x400/cover_47974.jpg',
};

describe('Triton now-playing', () => {
  it('StreamTheWorld adresinden mount adı çıkarır', () => {
    const stw = 'https://playerservices.streamtheworld.com/api/livestream-redirect';
    expect(tritonMount(`${stw}/SUPER_FM.mp3`)).toBe('SUPER_FM');
    expect(tritonMount(`${stw}/JOYTURK_ROCK_SC`)).toBe('JOYTURK_ROCK'); // _SC now-playing'de boş döner
    expect(tritonMount('https://20133.live.streamtheworld.com/METRO_FMAAC.aac')).toBe('METRO_FMAAC');
    expect(tritonMount('https://ice2.somafm.com/groovesalad-128-mp3')).toBeNull();
    expect(tritonMount('https://streamtheworld.com.evil.example/SUPER_FM.mp3')).toBeNull();
    expect(tritonMount('bozuk')).toBeNull();
  });

  it('sanatçı, parça ve kapağı ayrı verir', () => {
    expect(parseTriton(xml(song), START + 60_000)).toEqual({
      raw: 'Kenan Doğulu - 10. Yıl Marşı',
      artist: 'Kenan Doğulu',
      title: '10. Yıl Marşı',
      cover: song.track_cover_url,
    });
  });

  it('istasyonun varsayılan görseli kapak sayılmaz', () => {
    const def = 'https://mediacdns.karnaval.com/media/station_media/3/default_images/default_artist_image.jpg';
    expect(parseTriton(xml({ ...song, track_cover_url: def }), START)?.cover).toBeNull();
  });

  it('parça bitmiş (araya reklam/program girmiş), boş ya da reklamsa null → ICY\'ye düşülür', () => {
    expect(parseTriton(xml(song), START + 229_000 + 3 * 60_000)).toBeNull();
    expect(parseTriton('<?xml version="1.0"?><nowplaying-info-list/>')).toBeNull();
    expect(parseTriton(xml({ ...song, track_artist_name: 'Reklam' }), START)).toBeNull();
  });
});
