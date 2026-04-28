import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private readonly botToken: string;
  private readonly adminChatId: string;

  constructor(private readonly configService: ConfigService) {
    this.botToken = this.configService.get<string>('telegram.botToken') || '';
    this.adminChatId = this.configService.get<string>('telegram.adminChatId') || '';
  }

  async sendAdminAlert(message: string): Promise<{ ok: boolean; error?: string }> {
    if (!this.botToken || !this.adminChatId) {
      const error = 'Telegram config missing, alert skipped';
      this.logger.warn(error);
      return { ok: false, error };
    }

    try {
      const response = await fetch(
        `https://api.telegram.org/bot${this.botToken}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: this.adminChatId,
            text: message,
            parse_mode: 'HTML',
            disable_web_page_preview: true,
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Telegram alert failed: ${errorText}`);
        return { ok: false, error: errorText };
      }

      return { ok: true };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown Telegram send failure';
      this.logger.error(`Telegram alert exception: ${message}`);
      return { ok: false, error: message };
    }
  }
}