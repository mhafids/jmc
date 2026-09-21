import fs from 'node:fs/promises';
import path from 'node:path';
import { uuidv7 } from 'uuidv7';
import { requireEmployeeAccess } from '~~/server/utils/employee-auth-guard.js';

export default defineEventHandler(async (event) => {
  await requireEmployeeAccess(event, 'update');

  const files = await readMultipartFormData(event);
  if (!files || files.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request: Tidak ada file yang diunggah.',
    });
  }

  const photoFile = files.find((f) => f.name === 'photo' || f.name === 'file');
  if (!photoFile || !photoFile.data) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request: Field file foto tidak ditemukan.',
    });
  }

  const MAX_SIZE = 2 * 1024 * 1024;
  if (photoFile.data.length > MAX_SIZE) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request: Ukuran file foto melebihi batas maksimal 2MB.',
    });
  }

  const buffer = photoFile.data;
  let extension = '';

  if (
    buffer.length >= 4 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    extension = 'png';
  } else if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    extension = 'jpg';
  } else {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request: Format file tidak didukung. Hanya file PNG, JPG, atau JPEG asli yang diperbolehkan.',
    });
  }

  const uploadDir = path.resolve(process.cwd(), 'public/uploads/employees');
  await fs.mkdir(uploadDir, { recursive: true });

  const fileName = `${uuidv7()}.${extension}`;
  const filePath = path.join(uploadDir, fileName);

  await fs.writeFile(filePath, buffer);

  const publicUrl = `/uploads/employees/${fileName}`;

  return {
    success: true,
    data: {
      url: publicUrl,
    },
  };
});
