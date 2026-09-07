import {createReadStream, statSync} from 'node:fs'
import {extname, relative, resolve} from 'node:path'
import react from '@vitejs/plugin-react'
import {defineConfig, type Connect} from 'vite'

const SPRITE_TYPES: Record<string, string> = {
  '.gif': 'image/gif',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
}

function spriteStatic() {
  const root = resolve(process.cwd(), 'public', 'sprites')
  const middleware: Connect.NextHandleFunction = (req, res, next) => {
    const url = req.url?.split('?')[0] ?? ''
    if (!url.startsWith('/sprites/')) {
      next()
      return
    }
    const file = resolve(process.cwd(), 'public', decodeURIComponent(url.slice(1)))
    const rel = relative(root, file)
    if (!rel || rel.startsWith('..')) {
      res.statusCode = 404
      res.setHeader('Content-Type', 'text/plain')
      res.end('Not found')
      return
    }
    try {
      if (!statSync(file).isFile()) throw new Error('missing')
    } catch {
      res.statusCode = 404
      res.setHeader('Content-Type', 'text/plain')
      res.end('Not found')
      return
    }
    res.statusCode = 200
    res.setHeader('Content-Type', SPRITE_TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream')
    res.setHeader('Cache-Control', 'public, max-age=86400')
    createReadStream(file).pipe(res)
  }
  return {
    name: 'sprite-static',
    configureServer(server: {middlewares: Connect.Server}) {
      server.middlewares.use(middleware)
    },
    configurePreviewServer(server: {middlewares: Connect.Server}) {
      server.middlewares.use(middleware)
    },
  }
}

export default defineConfig({
  plugins: [react(), spriteStatic()],
  server: {
    // 5173 falls in a Windows Hyper-V excluded port range (EACCES on listen)
    host: '127.0.0.1',
    port: 5273,
    watch: {
      ignored: ['**/public/sprites/**'],
    },
  },
})
