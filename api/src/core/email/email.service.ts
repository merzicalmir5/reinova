import { Injectable, Logger } from '@nestjs/common';
import sgMail from '@sendgrid/mail';

import type { SendEmailOptions } from './email.types';

function formatFrom(): string {
  const email = process.env.SENDGRID_FROM_EMAIL?.trim();
  const name = process.env.SENDGRID_FROM_NAME?.trim();
  if (!email) {
    return '';
  }
  if (name) {
    return `${name} <${email}>`;
  }
  return email;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly from: string;

  constructor() {
    this.from = formatFrom();
    const apiKey = process.env.SENDGRID_API_KEY?.trim();
    if (apiKey) {
      sgMail.setApiKey(apiKey);
    } else {
      this.logger.warn(
        'SENDGRID_API_KEY is not set; EmailService.send will fail until configured.',
      );
    }
  }

  isConfigured(): boolean {
    return Boolean(process.env.SENDGRID_API_KEY?.trim() && this.from);
  }

  async send(options: SendEmailOptions): Promise<void> {
    const apiKey = process.env.SENDGRID_API_KEY?.trim();
    if (!apiKey) {
      throw new Error('Email is not configured: missing SENDGRID_API_KEY');
    }
    if (!this.from) {
      throw new Error('Email is not configured: missing SENDGRID_FROM_EMAIL');
    }
    if (options.text === undefined && options.html === undefined) {
      throw new Error('Email must include text or html body');
    }

    const base = {
      to: options.to,
      from: this.from,
      subject: options.subject,
      ...(options.replyTo ? { replyTo: options.replyTo } : {}),
    };

    if (options.text !== undefined && options.html !== undefined) {
      await sgMail.send({ ...base, text: options.text, html: options.html });
    } else if (options.text !== undefined) {
      await sgMail.send({ ...base, text: options.text });
    } else {
      await sgMail.send({ ...base, html: options.html! });
    }
  }
}
