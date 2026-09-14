/**
 * Utilitários de WhatsApp (deep link para o app instalado no aparelho).
 * NÃO usa API do WhatsApp — apenas o link oficial wa.me.
 */

/**
 * Normaliza um telefone brasileiro para o formato aceito pelo wa.me: 55DDDNUMERO.
 * Retorna null quando o número é inválido/ausente.
 */
export function normalizeBrPhone(raw?: string | null): string | null {
  if (!raw) return null;

  let digits = String(raw).replace(/\D/g, "");
  if (!digits) return null;

  // Remove zeros de discagem nacional (ex.: 0 66 9...)
  digits = digits.replace(/^0+/, "");

  // Já possui DDI 55 (não duplicar)
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    return digits;
  }

  // DDD + número (10 ou 11 dígitos)
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }

  // Casos com 55 repetido indevidamente (ex.: 5555669...)
  if (digits.startsWith("5555")) {
    const stripped = digits.slice(2);
    if (stripped.length === 12 || stripped.length === 13) return stripped;
  }

  return null;
}

export interface OpenWhatsAppResult {
  ok: boolean;
  reason?: "no-phone" | "invalid-phone" | "blocked";
  url?: string;
}

/**
 * Abre a conversa do destinatário no WhatsApp com a mensagem pré-preenchida.
 * O remetente é sempre o WhatsApp instalado no aparelho de quem usa o app.
 */
export function openWhatsApp(params: {
  phone?: string | null;
  message?: string;
  debugLabel?: string;
  deliveryId?: string;
}): OpenWhatsAppResult {
  const { phone, message, debugLabel, deliveryId } = params;

  const normalized = normalizeBrPhone(phone);

  // Diagnóstico temporário (sem dados pessoais além do telefone)
  console.log("[WHATSAPP] deliveryId:", deliveryId ?? "-");
  console.log("[WHATSAPP] target:", debugLabel ?? "customer");
  console.log("[WHATSAPP] customerPhoneRaw:", phone ?? "-");
  console.log("[WHATSAPP] customerPhoneNormalized:", normalized ?? "-");

  if (!phone) return { ok: false, reason: "no-phone" };
  if (!normalized) return { ok: false, reason: "invalid-phone" };

  const url = `https://wa.me/${normalized}${message ? `?text=${encodeURIComponent(message)}` : ""}`;

  try {
    const win = window.open(url, "_system");
    if (!win) {
      const win2 = window.open(url, "_blank");
      if (!win2) {
        window.location.href = url;
      }
    }
    return { ok: true, url };
  } catch {
    try {
      window.location.href = url;
      return { ok: true, url };
    } catch {
      return { ok: false, reason: "blocked", url };
    }
  }
}

/** Mensagem padrão enviada ao cliente ao chamar no WhatsApp. */
export const CUSTOMER_LOCATION_MESSAGE = `Olá! 👋

Sou o entregador do É Pra Já Delivery responsável pela sua entrega.

Pode me enviar sua localização pelo WhatsApp para facilitar a entrega? 📍

Obrigado! 🚀`;
