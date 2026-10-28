import { Injectable } from '@nestjs/common';
import { RadioService } from '../radio/radio.service';
import { ArtistsService } from '../artists/artists.service';
import { EventsService } from '../events/events.service';
import { VenuesService } from '../venues/venues.service';

// Playce'ın çekirdeği: çalan müzikten şehirdeki karşılığına köprü.
//   çalan parça → sanatçı eşleşmesi → sanatçının yaklaşan konserleri
//   dinlenen tür → bu gece (yoksa yakında) o türün etkinlikleri + o türü çalan mekânlar
@Injectable()
export class DiscoverService {
  constructor(
    private readonly radio: RadioService,
    private readonly artists: ArtistsService,
    private readonly events: EventsService,
    private readonly venues: VenuesService,
  ) {}

  async now(url: string, genre?: string) {
    const track = url ? await this.radio.nowPlaying(url) : { raw: null, artist: null, title: null };
    const artist = await this.artists.match(track.artist, track.raw);

    const none = { items: [] };
    const [artistEvents, tonight, venues] = await Promise.all([
      artist ? this.events.list({ artist: artist.slug, when: 'upcoming', limit: 5 }) : none,
      genre ? this.events.list({ genre, when: 'tonight', limit: 6 }) : none,
      genre ? this.venues.list({ genre }) : [],
    ]);

    let genreEvents = tonight.items;
    let genreWindow: 'tonight' | 'upcoming' = 'tonight';
    if (genre && !genreEvents.length) {
      genreEvents = (await this.events.list({ genre, when: 'upcoming', limit: 6 })).items;
      genreWindow = 'upcoming';
    }

    const artistRef = artist && { slug: artist.slug, name: artist.name, imageUrl: artist.imageUrl };
    return { track, artist: artistRef, artistEvents: artistEvents.items, genreEvents, genreWindow, venues: venues.slice(0, 8) };
  }
}
