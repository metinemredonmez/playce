import { Body, Controller, Delete, Get, Header, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../auth/decorators';
import { ConsentDto, UpdateMeDto } from './users.dto';
import { UsersService } from './users.service';

@ApiTags('me')
@ApiBearerAuth()
@Controller('me')
export class MeController {
  constructor(private readonly users: UsersService) {}

  @Get()
  me(@CurrentUser() user: AuthUser) {
    return this.users.me(user.id);
  }

  @Patch()
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdateMeDto) {
    return this.users.update(user.id, dto);
  }

  @Delete()
  remove(@CurrentUser() user: AuthUser) {
    return this.users.softDelete(user.id);
  }

  @Get('export')
  @Header('Content-Disposition', 'attachment; filename="playce-verilerim.json"')
  export(@CurrentUser() user: AuthUser) {
    return this.users.export(user.id);
  }

  @Get('consents')
  consents(@CurrentUser() user: AuthUser) {
    return this.users.consents(user.id);
  }

  @Post('consents')
  addConsent(@CurrentUser() user: AuthUser, @Body() dto: ConsentDto) {
    return this.users.addConsent(user.id, dto);
  }
}
