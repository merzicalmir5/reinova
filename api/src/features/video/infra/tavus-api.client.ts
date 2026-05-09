import { HttpService } from '@nestjs/axios';
import {
  BadGatewayException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';

export type TavusCreateVideoResponse = {
  video_id: string;
  video_name?: string;
  status?: string;
  hosted_url?: string;
  download_url?: string;
  created_at?: string;
};

export type TavusGetVideoResponse = {
  video_id: string;
  video_name?: string;
  status: string;
  hosted_url?: string;
  download_url?: string;
  stream_url?: string;
  status_details?: string;
  created_at?: string;
  updated_at?: string;
};

export type TavusReplicaItem = {
  replica_id: string;
  replica_name?: string;
  thumbnail_video_url?: string;
  training_progress?: string;
  status?: string;
  created_at?: string;
  replica_type?: string;
  model_name?: string;
};

export type TavusListReplicasResponse = {
  data: TavusReplicaItem[];
  total_count: number;
};

@Injectable()
export class TavusApiClient {
  constructor(private readonly http: HttpService) {}

  private baseUrl(): string {
    const raw = process.env.TAVUS_BASE_URL?.trim();
    const base = raw || 'https://tavusapi.com';
    return base.replace(/\/$/, '');
  }

  private apiKey(): string {
    const key = process.env.TAVUS_API_KEY;
    if (!key?.trim()) {
      throw new InternalServerErrorException('TAVUS_API_KEY is not configured');
    }
    return key;
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey(),
    };
  }

  async createVideo(
    body: Record<string, unknown>,
  ): Promise<TavusCreateVideoResponse> {
    const url = `${this.baseUrl()}/v2/videos`;
    try {
      const res = await firstValueFrom(
        this.http.post<TavusCreateVideoResponse>(url, body, {
          headers: this.headers(),
        }),
      );
      return res.data;
    } catch (err) {
      this.rethrowAxios(err);
    }
  }

  async getVideo(videoId: string): Promise<TavusGetVideoResponse> {
    const url = `${this.baseUrl()}/v2/videos/${encodeURIComponent(videoId)}`;
    try {
      const res = await firstValueFrom(
        this.http.get<TavusGetVideoResponse>(url, {
          headers: this.headers(),
        }),
      );
      return res.data;
    } catch (err) {
      this.rethrowAxios(err);
    }
  }

  /** GET https://tavusapi.com/v2/replicas — replicas for the Tavus account tied to the API key. */
  async listReplicas(query?: {
    limit?: number;
    page?: number;
    verbose?: boolean;
    replica_type?: 'user' | 'system';
    replica_ids?: string;
    model_name?: string;
  }): Promise<TavusListReplicasResponse> {
    const url = `${this.baseUrl()}/v2/replicas`;
    try {
      const res = await firstValueFrom(
        this.http.get<TavusListReplicasResponse>(url, {
          headers: this.headers(),
          params: {
            limit: query?.limit,
            page: query?.page,
            verbose: query?.verbose,
            replica_type: query?.replica_type,
            replica_ids: query?.replica_ids,
            model_name: query?.model_name,
          },
        }),
      );
      const data = Array.isArray(res.data?.data) ? res.data.data : [];
      const total_count =
        typeof res.data?.total_count === 'number'
          ? res.data.total_count
          : data.length;
      return { data, total_count };
    } catch (err) {
      this.rethrowAxios(err);
    }
  }

  private rethrowAxios(err: unknown): never {
    if (err instanceof AxiosError) {
      const status = err.response?.status;
      const raw = err.response?.data;
      const msg = this.messageFromTavusBody(status, raw, err.message);
      if (status === 401) {
        throw new UnauthorizedException(msg);
      }
      if (status === 403) {
        throw new ForbiddenException(msg);
      }
      throw new BadGatewayException(msg);
    }
    throw err;
  }

  /** Tavus sometimes returns HTML (CDN/WAF); avoid surfacing full HTML to clients. */
  private messageFromTavusBody(
    status: number | undefined,
    data: unknown,
    axiosMessage: string,
  ): string {
    if (typeof data === 'string') {
      const s = data.trim();
      if (
        s.startsWith('<!') ||
        s.includes('<html') ||
        /Unauthorized|don't have permission/i.test(s)
      ) {
        return (
          `Tavus returned HTTP ${status ?? '?'} with an HTML error page (not JSON). ` +
          'Check TAVUS_API_KEY, account/plan limits, and whether this request is allowed ' +
          '(e.g. transparent_background may be restricted for some replicas or tiers).'
        );
      }
      return s.length > 800 ? `${s.slice(0, 800)}…` : s;
    }
    if (data && typeof data === 'object') {
      const o = data as { message?: string; error?: string };
      return o.message ?? o.error ?? axiosMessage ?? 'Tavus request failed';
    }
    return axiosMessage ?? 'Tavus request failed';
  }
}
