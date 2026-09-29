import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import { assertConfig, config } from './config';
import { migrate } from './db';
import { authMiddleware, authRouter, seedCoupleUsers } from './auth';
import { handle, HttpError, publicBaseUrl } from './http';
import { getUploadsDir, persistMediaUpload } from './media-upload';
import { placesRouter, visitsRouter } from './routes/places';
import { photosRouter } from './routes/photos';
import { plansRouter } from './routes/plans';
import { dashboardRouter } from './routes/dashboard';
import { myboxBackupStatus, requestMyboxBackup, startMyboxBackup } from './mybox';

assertConfig();

const app = express();
app.set('trust proxy', true);
app.use(
  cors({
    origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(',').map((s) => s.trim()),
    credentials: true,
  }),
);
app.use(express.json({ limit: '40mb' }));
app.use('/media/files', express.static(getUploadsDir(), { maxAge: '30d', fallthrough: false }));

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'tingting-api',
    appKey: Boolean(config.appKey),
    kakaoSearch: Boolean(config.kakaoRestApiKey),
    uploadsDir: config.uploadsDir,
    myboxBackup: myboxBackupStatus(),
  });
});

app.use('/auth', authRouter);

app.post(
  '/media/upload',
  authMiddleware,
  handle(async (req, res) => {
    const base64 = typeof req.body?.base64 === 'string' ? req.body.base64 : '';
    if (!base64) throw new HttpError(400, '이미지가 필요해요');
    try {
      const stored = persistMediaUpload({
        base64,
        contentType: typeof req.body?.contentType === 'string' ? req.body.contentType : undefined,
        filename: typeof req.body?.filename === 'string' ? req.body.filename : undefined,
      });
      res.status(201).json({ url: `${publicBaseUrl(req)}${stored}` });
      requestMyboxBackup();
    } catch (e) {
      throw new HttpError(400, e instanceof Error ? e.message : '업로드 실패');
    }
  }),
);

app.use('/dashboard', authMiddleware, dashboardRouter);
app.use('/places', authMiddleware, placesRouter);
app.use('/visits', authMiddleware, visitsRouter);
app.use('/photos', authMiddleware, photosRouter);
app.use('/plans', authMiddleware, plansRouter);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  console.error(err);
  res.status(500).json({ error: '서버 오류가 발생했어요' });
});

async function start() {
  await migrate();
  await seedCoupleUsers();
  app.listen(config.port, () => {
    console.log(`tingting-api listening on :${config.port}`);
  });
  startMyboxBackup();
}

start().catch((e) => {
  console.error('Failed to start', e);
  process.exit(1);
});
