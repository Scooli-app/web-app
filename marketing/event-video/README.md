# Vídeo em loop para eventos

`scooli-event-loop.mp4`: 1920×1080, 30 fps, ~58 s, sem som, pensado para correr em loop (começa e acaba no mesmo fundo).

Cenas: intro → criar turma → a tua semana → check-in depois da aula → reajuste automático → progresso da turma → planificações → documentos (plano, ficha, teste, quiz, apresentação) → outro com CTA.

- `index.html`: as cenas animadas. Abrir no browser para pré-visualizar.
- `render.js`: grava frame a frame com Playwright e codifica com ffmpeg.

```bash
node render.js 30 scooli-event-loop.mp4
```
