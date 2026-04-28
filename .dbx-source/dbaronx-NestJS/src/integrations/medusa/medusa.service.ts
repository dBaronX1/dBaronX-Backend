import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MedusaService {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('medusa.baseUrl') || '';
    this.apiKey = this.configService.get<string>('medusa.apiKey') || '';
  }

  private buildHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['x-publishable-api-key'] = this.apiKey;
    }

    return headers;
  }

  async listProducts(query?: Record<string, string | number>) {
    if (!this.baseUrl) {
      throw new InternalServerErrorException('Medusa base URL not configured');
    }

    const searchParams = new URLSearchParams();

    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        searchParams.append(key, String(value));
      });
    }

    const url = `${this.baseUrl}/store/products${
      searchParams.toString() ? `?${searchParams.toString()}` : ''
    }`;

    const response = await fetch(url, {
      method: 'GET',
      headers: this.buildHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new InternalServerErrorException(
        `Failed to fetch products from Medusa: ${errorText}`,
      );
    }

    return response.json();
  }

  async getProductByHandle(handle: string) {
    if (!this.baseUrl) {
      throw new InternalServerErrorException('Medusa base URL not configured');
    }

    const url = `${this.baseUrl}/store/products?handle=${encodeURIComponent(handle)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: this.buildHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new InternalServerErrorException(
        `Failed to fetch product from Medusa: ${errorText}`,
      );
    }

    return response.json();
  }
}