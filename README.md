# Imovel 3D

> Tour virtual imersivo para apresentacao de imoveis em 3D.

Uma experiencia digital para explorar uma residencia ambiente por ambiente, com modelo 3D interativo, navegacao guiada e transicoes suaves de camera. A base foi pensada para ser adaptada a diferentes imoveis com poucos ajustes de conteudo e posicionamento.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=061017)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-3D-000000?logo=three.js&logoColor=white)
![Status](https://img.shields.io/badge/status-tour%203D-1B998B)

## O que esta incluso

- Experiencia de entrada para iniciar o tour virtual.
- Modelo 3D interativo com controles de camera e renderizacao em tempo real.
- Navegacao entre ambientes por hotspots e menu lateral.
- Transicoes de camera animadas entre pontos estrategicos do imovel.
- Painel com informacoes contextuais de cada comodo.
- Links diretos para ambientes usando o `hash` da URL.
- Layout responsivo para desktop e mobile.
- Configuracao centralizada para adaptar o tour a outro imovel.

## Tecnologias

| Area | Stack |
| --- | --- |
| Interface | React 19 + TypeScript + Vite 7 |
| Cena 3D | Three.js, React Three Fiber e Drei |
| Animacao | GSAP |
| Estilos | CSS global responsivo |

## Comecar

### Pre-requisitos

- Node.js 20 ou superior
- npm 10 ou superior

### Rodar localmente

```bash
npm install
npm run dev
```

Abra o endereco informado pelo Vite, normalmente `http://localhost:5173`.

### Gerar build de producao

```bash
npm run build
npm run preview
```

## Personalizacao

O conteudo e o comportamento principal do tour estao concentrados em [`src/data/tour.ts`](src/data/tour.ts). Atualize ali:

- textos da tela inicial em `heroCopy`;
- nome, descricao e identificador de cada ambiente em `tourPoints`;
- posicao e alvo da camera para cada ponto;
- conexoes, hotspots e caminhos intermediarios;
- parametros de camera e movimentacao automatica.

A logica de rotas e waypoints fica em [`src/lib/tour-routing.ts`](src/lib/tour-routing.ts). A apresentacao visual fica em [`src/components/ExperienceCanvas.tsx`](src/components/ExperienceCanvas.tsx), [`src/components/Overlay.tsx`](src/components/Overlay.tsx) e [`src/styles.css`](src/styles.css).

Para abrir diretamente um ambiente, use o respectivo identificador na URL:

```text
http://localhost:5173/#living
```

## Ativos visuais

| Caminho | Uso |
| --- | --- |
| `3d-model/3_bedroom_house.glb` | Modelo 3D principal do imovel. |
| `src/data/tour.ts` | Dados, escala e pontos de navegacao do modelo. |

Ao substituir o modelo `.glb`, revise `MODEL_CENTER`, `INCH_TO_METER`, `modelInspection` e as posicoes de `tourPoints` em `src/data/tour.ts` para manter a camera alinhada ao novo arquivo.

## Estrutura

```text
src/
  components/
    ExperienceCanvas.tsx      Cena 3D, camera e transicoes
    Overlay.tsx               Interface, menu e informacoes do tour
    TourHotspots.tsx          Pontos interativos da cena
  data/tour.ts                Conteudo e configuracoes do tour
  lib/tour-routing.ts         Rotas e calculos de navegacao
  App.tsx                     Composicao principal da aplicacao
  styles.css                  Tokens e estilos globais
3d-model/
  3_bedroom_house.glb         Modelo 3D do imovel
```

## Scripts

| Comando | Descricao |
| --- | --- |
| `npm run dev` | Inicia o servidor de desenvolvimento. |
| `npm run build` | Valida o TypeScript e cria a versao otimizada para producao. |
| `npm run preview` | Serve localmente o build de producao. |

---

Feito para transformar a apresentacao de um imovel em uma experiencia de visita memoravel.
