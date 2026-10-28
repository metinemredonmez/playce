import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';
import { Env } from '../config/env';

// Giriş kodu e-postası. SMTP_URL yoksa geliştirmede kod API konsoluna yazılır;
// production'da e-posta ile giriş kapalı kalır (enabled=false → OTP uçları 503). Kod asla loglanmaz.
@Injectable()
export class MailService {
  private readonly log = new Logger('Mail');
  private readonly transport: Transporter | null;
  private readonly from: string;
  readonly enabled: boolean;

  constructor(config: ConfigService<Env, true>) {
    const url = config.get('SMTP_URL', { infer: true });
    this.transport = url ? createTransport(url) : null;
    this.from = config.get('MAIL_FROM', { infer: true });
    this.enabled = !!this.transport || config.get('NODE_ENV', { infer: true }) !== 'production';
    if (!this.enabled) this.log.warn('SMTP_URL tanımlı değil — e-posta ile giriş kapalı');
  }

  async sendOtp(email: string, code: string) {
    if (!this.enabled) throw new Error('E-posta gönderimi kapalı');
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
