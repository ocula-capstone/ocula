import { jest } from '@jest/globals';
import type { ConfigService } from '@nestjs/config';
import { encodePath, reasonOf, StorageService } from './storage.service.js';

const make = (env: Record<string, string | undefined>) =>
  new StorageService({
    get: (k: string) => ({ STORAGE_BUCKET: 'exam-images', ...env })[k],
  } as unknown as ConfigService<never, true>);

const ok = (body: unknown) =>
  ({ ok: true, status: 200, json: async () => body }) as Response;

describe('StorageService', () => {
  const realFetch = global.fetch;
  let fetchMock: jest.Mock<typeof fetch>;

  beforeEach(() => {
    fetchMock = jest.fn<typeof fetch>();
    global.fetch = fetchMock;
  });
  afterEach(() => {
    global.fetch = realFetch;
  });

  /** The headers and JSON body of the n-th fetch call. */
  const sent = (n = 0) => {
    const init = fetchMock.mock.calls[n][1] ?? {};
    return {
      headers: init.headers as Record<string, string>,
      body: JSON.parse(init.body as string) as unknown,
    };
  };

  const storage = () =>
    make({
      SUPABASE_URL: 'https://proj.supabase.co/',
      SUPABASE_SECRET_KEY: 'sb_secret_abc',
    });

  it('creates a signed upload URL', async () => {
    fetchMock.mockResolvedValue(
      ok({ url: '/object/upload/sign/exam-images/exams/e1/a.jpg?token=tok1' }),
    );
    const res = await storage().createUploadUrl('exams/e1/a.jpg');
    expect(res).toEqual({
      uploadUrl:
        'https://proj.supabase.co/storage/v1/object/upload/sign/exam-images/exams/e1/a.jpg?token=tok1',
      token: 'tok1',
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      'https://proj.supabase.co/storage/v1/object/upload/sign/exam-images/exams/e1/a.jpg',
    );
    expect(init?.method).toBe('POST');
    const headers = init?.headers as Record<string, string>;
    expect(headers.apikey).toBe('sb_secret_abc');
    expect(headers.Authorization).toBeUndefined();
    // No body, so no JSON content type (Supabase answers 400 to that).
    expect(init?.body).toBeUndefined();
    expect(headers['Content-Type']).toBeUndefined();
  });

  it('sends a legacy service_role JWT as a bearer token too', async () => {
    fetchMock.mockResolvedValue(
      ok({ signedURL: '/object/sign/exam-images/x.jpg?token=t' }),
    );
    const s = make({
      SUPABASE_URL: 'https://p.supabase.co',
      SUPABASE_SECRET_KEY: 'eyJhbGci',
    });
    const url = await s.createDownloadUrl('x.jpg', 300);
    expect(url).toBe(
      'https://p.supabase.co/storage/v1/object/sign/exam-images/x.jpg?token=t',
    );
    expect(sent().headers.Authorization).toBe('Bearer eyJhbGci');
    expect(sent().body).toEqual({ expiresIn: 300 });
  });

  it('finds an uploaded file by exact name', async () => {
    fetchMock.mockResolvedValue(
      ok([
        { name: 'a.jpg.bak', metadata: { size: 1, mimetype: 'image/jpeg' } },
        { name: 'a.jpg', metadata: { size: 2048, mimetype: 'image/jpeg' } },
      ]),
    );
    expect(await storage().stat('exams/e1/a.jpg')).toEqual({
      size: 2048,
      mimetype: 'image/jpeg',
    });
    expect(sent().body).toMatchObject({
      prefix: 'exams/e1',
      search: 'a.jpg',
    });
    fetchMock.mockResolvedValue(ok([]));
    expect(await storage().stat('exams/e1/a.jpg')).toBeNull();
  });

  it('deletes by prefixes and skips empty lists', async () => {
    fetchMock.mockResolvedValue(ok([]));
    await storage().remove([]);
    expect(fetchMock).not.toHaveBeenCalled();
    await storage().remove(['exams/e1/a.jpg']);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://proj.supabase.co/storage/v1/object/exam-images');
    expect(init?.method).toBe('DELETE');
    expect(sent().body).toEqual({ prefixes: ['exams/e1/a.jpg'] });
  });

  it('answers 503 when not configured and 502 when Storage fails', async () => {
    const off = make({});
    expect(off.isConfigured).toBe(false);
    await expect(off.createUploadUrl('a.jpg')).rejects.toMatchObject({
      status: 503,
    });
    expect(fetchMock).not.toHaveBeenCalled();

    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({}),
    } as Response);
    await expect(storage().createUploadUrl('a.jpg')).rejects.toMatchObject({
      status: 502,
    });
    fetchMock.mockRejectedValue(new Error('network down'));
    await expect(storage().remove(['a.jpg'])).rejects.toMatchObject({
      status: 502,
    });
  });

  it('encodes each path segment', () => {
    expect(encodePath('exams/a b/x#1.jpg')).toBe('exams/a%20b/x%231.jpg');
  });

  it("reads Supabase's error reason for the log", async () => {
    const res = (body: string) =>
      ({ ok: false, status: 400, text: async () => body }) as Response;
    await expect(
      reasonOf(
        res(
          '{"statusCode":"404","error":"Bucket not found","message":"Bucket not found"}',
        ),
      ),
    ).resolves.toBe('Bucket not found: Bucket not found (404)');
    await expect(reasonOf(res('Bad gateway'))).resolves.toBe('Bad gateway');
    await expect(reasonOf(res(''))).resolves.toBe('no body');
  });
});
