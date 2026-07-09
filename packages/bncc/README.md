# bncc

A BNCC (Base Nacional Comum Curricular) como dados estruturados e verificados, com API de consulta tipada em português. Dados embutidos, zero dependências, zero rede.

**Em desenvolvimento.** A versão 1.0 será publicada junto da release `dados-v1.0.0` do [bncc-dados](https://github.com/bncc-dev/bncc-dados), após o registro da revisão pedagógica. Este placeholder reserva o nome.

```ts
import { porCodigo, buscar } from 'bncc';

const h = porCodigo('EF67LP08');
console.log(h.texto, h.fonte.localizador_pdf);
```

Projeto bncc.dev, mantido pela Profy. Dados CC BY 4.0, código MIT.
