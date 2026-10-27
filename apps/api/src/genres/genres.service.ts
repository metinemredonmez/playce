import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GenresService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.genre.findMany({
      orderBy: [{ sort: 'asc' }, { name: 'asc' }],
      select: {
        slug: true,
        name: true,
        color: true,
        radioTag: true,
        _count: { select: { stations: true, venues: true } },
      },
    });
  }

  async get(slug: string) {
    const genre = await this.prisma.genre.findUnique({ where: { slug } });
    if (!genre) throw new NotFoundException('Tür bulunamadı');
    return genre;
  }
}
