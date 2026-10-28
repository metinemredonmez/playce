import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../auth/decorators';
import { FavStationDto, FollowArtistDto, MergeDeviceDto, SavesQuery, SaveEventDto, StationUrlQuery } from './social.dto';
import { SocialService } from './social.service';

@ApiTags('me')
@ApiBearerAuth()
@Controller('me')
export class SocialController {
  constructor(private readonly social: SocialService) {}

  @Get('following')
  following(@CurrentUser() user: AuthUser) {
    return this.social.following(user.id);
  }

  @Put('follows/artists/:slug')
  followArtist(@CurrentUser() user: AuthUser, @Param('slug') slug: string, @Body() dto: FollowArtistDto) {
    return this.social.followArtist(user.id, slug, dto.notifyOnRadio);
  }

  @Delete('follows/artists/:slug')
  unfollowArtist(@CurrentUser() user: AuthUser, @Param('slug') slug: string) {
    return this.social.unfollowArtist(user.id, slug);
  }

  @Put('follows/venues/:slug')
  followVenue(@CurrentUser() user: AuthUser, @Param('slug') slug: string) {
    return this.social.followVenue(user.id, slug);
  }

  @Delete('follows/venues/:slug')
  unfollowVenue(@CurrentUser() user: AuthUser, @Param('slug') slug: string) {
    return this.social.unfollowVenue(user.id, slug);
  }

  @Get('saves')
  saves(@CurrentUser() user: AuthUser, @Query() q: SavesQuery) {
    return this.social.saves(user.id, q.when);
  }

  @Put('saves/:slug')
  save(@CurrentUser() user: AuthUser, @Param('slug') slug: string, @Body() dto: SaveEventDto) {
    return this.social.save(user.id, slug, dto.status);
  }

  @Delete('saves/:slug')
  unsave(@CurrentUser() user: AuthUser, @Param('slug') slug: string) {
    return this.social.unsave(user.id, slug);
  }

  @Get('stations')
  stations(@CurrentUser() user: AuthUser) {
    return this.social.stations(user.id);
  }

  @Put('stations')
  saveStation(@CurrentUser() user: AuthUser, @Body() dto: FavStationDto) {
    return this.social.saveStation(user.id, dto);
  }

  @Delete('stations')
  removeStation(@CurrentUser() user: AuthUser, @Query() q: StationUrlQuery) {
    return this.social.removeStation(user.id, q.url);
  }

  @Post('merge-device')
  @HttpCode(200)
  merge(@CurrentUser() user: AuthUser, @Body() dto: MergeDeviceDto) {
    return this.social.mergeDevice(user.id, dto);
  }
}
