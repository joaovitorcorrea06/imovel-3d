# imovel-3d

Aplicação web para apresentação de um imóvel em 3D com navegação entre ambientes, câmera interativa e interface de tour virtual com foco em experiência imobiliária premium.

## Visão geral

O projeto renderiza um modelo `.glb` de uma casa usando `Three.js` via `@react-three/fiber`, com uma camada de interface em `React` para:

- iniciar o tour com uma tela de entrada;
- navegar entre ambientes por hotspots e menu lateral;
- exibir informações contextuais de cada cômodo;
- animar transições de câmera entre pontos estratégicos;
- compartilhar links diretos para um ambiente usando `hash` na URL.

## Stack

- React 19
- TypeScript
- Vite
- Three.js
- `@react-three/fiber`
- `@react-three/drei`
- GSAP

## Como rodar

### Requisitos

- Node.js 20+ recomendado
- npm

### Instalação

```bash
npm install
```

### Ambiente de desenvolvimento

```bash
npm run dev
```

O Vite abrirá a aplicação localmente, normalmente em `http://localhost:5173`.

### Build de produção

```bash
npm run build
```

### Preview da build

```bash
npm run preview
```

## Estrutura principal

```text
.
├── 3d-model/
│   └── 3_bedroom_house.glb
├── src/
│   ├── components/
│   │   ├── ExperienceCanvas.tsx
│   │   ├── Overlay.tsx
│   │   └── TourHotspots.tsx
│   ├── data/
│   │   └── tour.ts
│   ├── lib/
│   │   └── tour-routing.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── styles.css
├── index.html
├── package.json
└── vite.config.ts
```

## Onde editar o tour

### Conteúdo dos ambientes

O arquivo `src/data/tour.ts` concentra a configuração principal do tour:

- textos da home de entrada (`heroCopy`);
- lista de ambientes (`tourPoints`);
- posição da câmera em cada ambiente;
- alvo padrão da câmera;
- conexões entre os pontos;
- hotspots e caminhos intermediários;
- parâmetros de câmera e comportamento automático.

Se você quiser adicionar um novo cômodo, o ponto de entrada é esse arquivo.

### Regras de navegação e movimento

O arquivo `src/lib/tour-routing.ts` contém a lógica para:

- indexar os pontos do tour;
- encontrar rotas entre ambientes;
- gerar waypoints intermediários;
- calcular direção, ângulos e distância da câmera.

### Interface e apresentação

- `src/components/ExperienceCanvas.tsx`: renderização 3D, câmera, transições e carregamento do modelo.
- `src/components/Overlay.tsx`: intro, painel do ambiente, menu de navegação e dicas visuais.
- `src/styles.css`: identidade visual, layout e responsividade da interface.

## Modelo 3D

O modelo atual está em:

```text
3d-model/3_bedroom_house.glb
```

O projeto assume esse arquivo como fonte principal do imóvel renderizado.

Em `src/data/tour.ts`, existe uma conversão de unidades baseada em polegadas para metros. Se o próximo modelo vier com outra escala ou outro ponto de origem, será necessário revisar:

- `MODEL_CENTER`
- `INCH_TO_METER`
- `modelInspection`
- posições dos `tourPoints`

## Navegação por URL

O tour mantém o ambiente atual no `hash` da URL. Exemplo:

```text
http://localhost:5173/#living
```

Ao abrir o link, a aplicação tenta iniciar naquele ponto, desde que o `id` exista em `tourPoints`.

## Ambientes configurados hoje

No estado atual do projeto, o tour inclui:

- Entrada
- Sala de estar
- Cozinha
- Corredor
- Quarto 01
- Suíte master
- Quarto 02

## Próximos ajustes possíveis

- adicionar analytics de interação no tour;
- incluir minimapa ou planta com navegação;
- suportar múltiplos imóveis no mesmo projeto;
- carregar dados do tour a partir de JSON ou CMS;
- adicionar fallback para mobile com controles guiados.
