import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import fs from 'node:fs/promises';
import { createReadStream, existsSync } from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';

// Percorso per il volume persistente (su Railway potrebbe essere mappato, altrimenti usiamo /tmp/desktop-apps per test locale)
const UPLOAD_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH || '/tmp/desktop-apps';

export const adminDesktopRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  // Assicurati che la directory esista
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  } catch (err) {
    console.error('Errore creazione directory upload app desktop', err);
  }

  // API per il download dell'app
  app.get('/api/admin/desktop/download/:os', {
    schema: {
      params: z.object({
        os: z.enum(['mac', 'win']),
      }),
    },
  }, async (req: any, reply) => {
    const { os } = req.params;
    const ext = os === 'mac' ? '.dmg' : '.exe';
    
    // Cerchiamo il primo file che finisce con l'estensione giusta
    try {
      const files = await fs.readdir(UPLOAD_DIR);
      const installerFile = files.find(f => f.endsWith(ext));
      
      if (!installerFile) {
        return reply.status(404).send({ error: 'Nessun installer trovato per questa piattaforma.' });
      }

      const filePath = path.join(UPLOAD_DIR, installerFile);
      const stream = createReadStream(filePath);
      
      reply.header('Content-Disposition', `attachment; filename="${installerFile}"`);
      reply.header('Content-Type', 'application/octet-stream');
      return reply.send(stream);
    } catch (err) {
      return reply.status(500).send({ error: 'Errore durante la lettura del volume.' });
    }
  });

  // API Nascosta per l'upload
  app.post('/api/admin/desktop/upload', async (req, reply) => {
    const data = await req.file();
    if (!data) {
      return reply.status(400).send({ error: 'Nessun file fornito.' });
    }
    
    const filePath = path.join(UPLOAD_DIR, data.filename);
    await pipeline(data.file, require('node:fs').createWriteStream(filePath));
    
    return { success: true, message: `File ${data.filename} salvato con successo.`, path: filePath };
  });
};
