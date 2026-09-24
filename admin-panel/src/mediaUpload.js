import { api, payload } from './api.js';

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export function uploadHeroImage(file, { onProgress = () => {} } = {}) {
  if (!TYPES.includes(file.type)) throw new Error('Choose a JPEG, PNG, or WebP image.');
  if (file.size > MAX_BYTES) throw new Error('Images must be 5 MB or smaller.');
  const form = new FormData();
  form.append('file', file);
  form.append('folder', 'heroes');
  return api.post('/media/upload', form, {
    onUploadProgress: event => {
      if (event.total) onProgress(Math.round((event.loaded / event.total) * 100));
    }
  }).then(response => {
    onProgress(100);
    const media = payload(response)?.media;
    if (!media?.url) throw new Error('The media service did not return an image URL.');
    return { url: media.url, publicId: media._id };
  });
}
