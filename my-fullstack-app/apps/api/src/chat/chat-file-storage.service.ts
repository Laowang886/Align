import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export type ChatUploadedFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

export type StoredChatFile = {
  originalName: string;
  storedName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
};

const CHAT_UPLOAD_ROOT =
  process.env.CHAT_UPLOAD_DIR ?? resolveDefaultChatUploadRoot();

@Injectable()
export class ChatFileStorageService {
  private readonly uploadRoot = CHAT_UPLOAD_ROOT;

  async saveFiles(files: ChatUploadedFile[]): Promise<StoredChatFile[]> {
    if (files.length === 0) return [];

    await fs.mkdir(this.uploadRoot, { recursive: true });
    const saved: StoredChatFile[] = [];

    try {
      for (const file of files) {
        const storedName = `${randomUUID()}${safeExtension(file.originalname)}`;
        const absolutePath = this.resolveStoragePath(storedName);
        await fs.writeFile(absolutePath, file.buffer, { flag: 'wx' });
        saved.push({
          originalName: path.basename(file.originalname),
          storedName,
          mimeType: file.mimetype || 'application/octet-stream',
          sizeBytes: file.size,
          storagePath: storedName,
        });
      }
      return saved;
    } catch (error) {
      await this.deleteFiles(saved.map((file) => file.storagePath));
      throw new InternalServerErrorException('Unable to save uploaded files');
    }
  }

  async readFile(storagePath: string): Promise<Buffer> {
    return fs.readFile(this.resolveStoragePath(storagePath));
  }

  async deleteFiles(storagePaths: string[]): Promise<void> {
    await Promise.all(
      storagePaths.map(async (storagePath) => {
        try {
          await fs.unlink(this.resolveStoragePath(storagePath));
        } catch (error: unknown) {
          if (isNodeError(error) && error.code === 'ENOENT') return;
          console.error('Unable to delete chat upload', {
            storagePath,
            error,
          });
        }
      }),
    );
  }

  private resolveStoragePath(storagePath: string): string {
    if (storagePath.includes('/') || storagePath.includes('\\')) {
      throw new InternalServerErrorException('Invalid chat file path');
    }
    const absolutePath = path.resolve(this.uploadRoot, storagePath);
    const relative = path.relative(this.uploadRoot, absolutePath);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new InternalServerErrorException('Invalid chat file path');
    }
    return absolutePath;
  }
}

function safeExtension(originalName: string): string {
  const extension = path.extname(originalName).toLowerCase();
  if (!/^\.[a-z0-9]{1,12}$/.test(extension)) return '';
  return extension;
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return typeof error === 'object' && error !== null && 'code' in error;
}

function resolveDefaultChatUploadRoot(): string {
  if (path.basename(process.cwd()) === 'api') {
    return path.resolve(process.cwd(), 'uploads/chat');
  }
  return path.resolve(process.cwd(), 'apps/api/uploads/chat');
}
