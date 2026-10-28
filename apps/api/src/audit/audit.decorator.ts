import { SetMetadata } from '@nestjs/common';

export const AUDIT_ACTION = 'auditAction';

/**
 * Başarılı isteği AuditLog'a yazar. Eylem "<tür>.<fiil>" biçiminde: "event.update", "unmatched.link".
 * Kayıt: kim (req.user), ne (eylem), hangi kayıt (yanıttaki id/key ya da yoldaki slug), gönderilen alanlar.
 */
export const Audit = (action: string) => SetMetadata(AUDIT_ACTION, action);
