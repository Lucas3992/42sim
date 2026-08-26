import type { FastifyInstance } from 'fastify';
import { fileTypeFromBuffer } from 'file-type';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs/promises';
import { prisma } from '../prisma.js';
import { verifyAuth } from '../utils/verifyAuth.js';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const uploadsDir = path.join(process.cwd(), 'uploads', 'avatars');

export async function avatarRoutes(app: FastifyInstance) {
  app.post('/users/me/avatar', { preHandler: verifyAuth }, async (request, reply) => {

    try {
      const data = await request.file();

      if (!data)
       return reply.status(400).send({ error: 'No file provided' });

      const buffer = await data.toBuffer();

      const detectedType = await fileTypeFromBuffer(buffer);
      if (!detectedType || !ALLOWED_MIME_TYPES.includes(detectedType.mime))
        return reply.status(415).send({ error: 'Unsupported file type' });

      const filename = `${randomUUID()}.${detectedType.ext}`;
      const filepath = path.join(uploadsDir, filename);

      await fs.writeFile(filepath, buffer);

      const userId = request.user.userId;
      const oldUser = await prisma.user.findUnique({ where: { id: userId } });

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { avatar_url: `/uploads/avatars/${filename}` },
      });

      if (oldUser?.avatar_url) {
        const oldFilename = path.basename(oldUser.avatar_url);
        const oldFilepath = path.join(uploadsDir, oldFilename);
        await fs.unlink(oldFilepath).catch(() => {});
      }

      return reply.send({ avatar_url: updatedUser.avatar_url });
    } catch (err){
        if (err instanceof app.multipartErrors.RequestFileTooLargeError) {
          return reply.status(413).send({ error: 'File too large' });
        }
        app.log.error(err);
          return reply.status(500).send({ error: 'Avatar upload failed' });
    }
  });
}