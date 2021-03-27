import { Application, Context, send } from "https://deno.land/x/oak/mod.ts";
import { FormFile, multiParser } from 'https://deno.land/x/multiparser@v2.1.0/mod.ts'
import { oakCors } from "https://deno.land/x/cors/mod.ts";

const app = new Application();

app.use(
  oakCors({
    origin: "http://localhost:8080"
  }),
);

app.use(async (ctx) => {
  const path = ctx.request.url.pathname;
  if (path === '/upload') {
    const form = await multiParser(ctx.request.serverRequest)
    if (form) {
      const car: FormFile = form.files.car as FormFile
      try {
        await Deno.writeFile(`cars/${car.filename}`, car.content);
      } catch (e) {
        console.error(e)
      }
    }
    ctx.response.body = '{"status": "ok"}';
  }

  if (ctx.request.method === 'GET' && path.startsWith('/cars')) {
    await send(ctx, ctx.request.url.pathname, {
      root: `${Deno.cwd()}`
   });
  }
});

app.listen({ port: 8082 });