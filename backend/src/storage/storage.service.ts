import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from '../config/env.validation.js';

export interface SignedUpload {
  /** PUT the file body here (Content-Type = the file's type). Valid for 2 hours. */
  uploadUrl: string;
  token: string;
}

export interface StoredObject {
  size: number;
  mimetype: string;
}

/**
 * A small wrapper over the Supabase Storage REST API (plain fetch, no SDK).
 * The secret key stays on the server: the app only gets short-lived signed URLs.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger('Storage');
  private readonly base?: string;
  private readonly key?: string;
  readonly bucket: string;

  constructor(config: ConfigService<EnvironmentVariables, true>) {
    const url = config.get('SUPABASE_URL', { infer: true });
    this.base = url ? `${url.replace(/\/+$/, '')}/storage/v1` : undefined;
    this.key = config.get('SUPABASE_SECRET_KEY', { infer: true }) || undefined;
    this.bucket = config.get('STORAGE_BUCKET', { infer: true });
  }

  get isConfigured(): boolean {
    return Boolean(this.base && this.key);
  }

  /** A one-time URL the app uploads the file to directly (no Vercel body limit). */
  async createUploadUrl(path: string): Promise<SignedUpload> {
    const res = await this.call<{ url: string }>(
      'POST',
      `/object/upload/sign/${this.bucket}/${encodePath(path)}`,
    );
    const uploadUrl = `${this.base}${res.url}`;
    return {
      uploadUrl,
      token: new URL(uploadUrl).searchParams.get('token') ?? '',
    };
  }

  /** A short-lived URL to view or download the file. */
  async createDownloadUrl(path: string, expiresIn: number): Promise<string> {
    const res = await this.call<{ signedURL: string }>(
      'POST',
      `/object/sign/${this.bucket}/${encodePath(path)}`,
      { expiresIn },
    );
    return `${this.base}${res.signedURL}`;
  }

  /** Size and type of an uploaded file, or null if nothing is there. */
  async stat(path: string): Promise<StoredObject | null> {
    const slash = path.lastIndexOf('/');
    const folder = slash >= 0 ? path.slice(0, slash) : '';
    const name = path.slice(slash + 1);
    const rows = await this.call<
      { name: string; metadata?: { size?: number; mimetype?: string } | null }[]
    >('POST', `/object/list/${this.bucket}`, {
      prefix: folder,
      search: name,
      limit: 10,
      offset: 0,
    });
    const row = rows.find((r) => r.name === name);
    if (!row?.metadata) return null;
    return {
      size: Number(row.metadata.size ?? 0),
      mimetype: String(row.metadata.mimetype ?? ''),
    };
  }

  /** Deletes files. Missing files are ignored. */
  async remove(paths: string[]): Promise<void> {
    if (paths.length === 0) return;
    await this.call('DELETE', `/object/${this.bucket}`, { prefixes: paths });
  }

  private async call<T>(
    method: 'POST' | 'DELETE',
    route: string,
    body?: unknown,
  ): Promise<T> {
    if (!this.base || !this.key) {
      throw new ServiceUnavailableException({
        error: {
          code: 'storage_unavailable',
          message: 'File storage is not set up yet.',
        },
      });
    }
    const headers: Record<string, string> = {
      apikey: this.key,
      'Content-Type': 'application/json',
    };
    // Legacy service_role keys are JWTs and also go in Authorization; new sb_secret_ keys don't.
    if (this.key.startsWith('eyJ'))
      headers.Authorization = `Bearer ${this.key}`;

    let res: Response;
    try {
      res = await fetch(`${this.base}${route}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (error) {
      this.logger.error(
        `${method} ${route} failed: ${(error as Error).message}`,
      );
      throw storageError();
    }
    if (!res.ok) {
      this.logger.error(`${method} ${route} answered ${res.status}`);
      throw storageError();
    }
    return (await res.json()) as T;
  }
}

/** "exams/a b/x.jpg" → "exams/a%20b/x.jpg" (each segment encoded, slashes kept). */
export const encodePath = (path: string) =>
  path.split('/').map(encodeURIComponent).join('/');

const storageError = () =>
  new BadGatewayException({
    error: {
      code: 'storage_error',
      message: 'File storage did not respond. Please try again.',
    },
  });
