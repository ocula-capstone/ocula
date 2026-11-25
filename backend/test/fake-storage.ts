import { ServiceUnavailableException } from '@nestjs/common';
import type {
  SignedUpload,
  StoredObject,
} from './../src/storage/storage.service.js';

/** In-memory stand-in for StorageService. `upload()` plays the app's PUT to the signed URL. */
export function createFakeStorage(configured = true) {
  const objects = new Map<string, StoredObject>();
  const signedUploads = new Set<string>();

  const ensure = () => {
    if (!configured) {
      throw new ServiceUnavailableException({
        error: {
          code: 'storage_unavailable',
          message: 'File storage is not set up yet.',
        },
      });
    }
  };

  return {
    objects,
    bucket: 'exam-images',
    get isConfigured() {
      return configured;
    },

    /** Test helper: the app uploading to a signed URL it was given. */
    upload(path: string, size = 2048, mimetype = 'image/jpeg') {
      if (!signedUploads.has(path))
        throw new Error(`no upload URL for ${path}`);
      objects.set(path, { size, mimetype });
    },

    createUploadUrl: async (path: string): Promise<SignedUpload> => {
      ensure();
      signedUploads.add(path);
      return {
        uploadUrl: `https://storage.test/upload/${path}?token=t-${path.length}`,
        token: `t-${path.length}`,
      };
    },
    createDownloadUrl: async (path: string, expiresIn: number) => {
      ensure();
      return `https://storage.test/view/${path}?expires=${expiresIn}`;
    },
    stat: async (path: string): Promise<StoredObject | null> => {
      ensure();
      const o = objects.get(path);
      return o ? { ...o } : null;
    },
    remove: async (paths: string[]) => {
      ensure();
      paths.forEach((p) => objects.delete(p));
    },
  };
}

export type FakeStorage = ReturnType<typeof createFakeStorage>;
