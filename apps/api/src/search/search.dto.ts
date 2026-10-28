import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';

export class SearchQuery {
  @ApiProperty({ example: 'dedubluman', description: 'Türkçe karakter ve küçük yazım hatalarına duyarsız' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString() @Length(2, 60) q: string;
}
