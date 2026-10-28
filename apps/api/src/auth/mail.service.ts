import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';
import { Env } from '../config/env';

// Giriş kodu e-postası. SMTP_URL yoksa (yalnız geliştirme) kod API konsoluna yazılır.
@Injectable()
export class MailService {
  private readonly log = new Logger('Mail');
  private readonly transport: Transporter | null;
  private readonly from: string;

  constructor(config: ConfigService<Env, true>) {
    const url = config.get('SMTP_URL', { infer: true });
    this.transport = url ? createTransport(url) : null;
    this.from = config.get('MAIL_FROM', { infer: true });
  }

  async sendOtp(email: string, code: string) {
    if (!this.transport) {
      this.log.warn(`SMTP_URL tanımlı değil — ${email} için giriş kodu: ${code}`);
      return;
    }
    await this.transport.sendMail({
      from: this.from,
      to: email,
      subject: `Playce giriş kodun: ${code}`,
      text: `Playce giriş kodun: ${code}\n\nKod 10 dakika geçerli. Bu isteği sen yapmadıysan bu e-postayı yok sayabilirsin.`,
      html:
        `<p>Playce giriş kodun:</p><p style="font-size:28px;font-weight:700;letter-spacing:6px">${code}</p>` +
        `<p>Kod 10 dakika geçerli. Bu isteği sen yapmadıysan bu e-postayı yok sayabilirsin.</p>`,
    });
  }
}
