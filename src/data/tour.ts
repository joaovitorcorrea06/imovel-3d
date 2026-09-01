import type { Vector3Tuple } from 'three';

export type TourConnection = {
  targetId: string;
  label?: string;
  hotspotPosition?: Vector3Tuple;
  path?: Vector3Tuple[];
};

export type TourPoint = {
  id: string;
  name: string;
  eyebrow: string;
  title: string;
  description: string;
  features: string[];
  position: Vector3Tuple;
  defaultTarget: Vector3Tuple;
  connections: TourConnection[];
};

export const DEBUG = false;
export const AUTO_ROTATE = true;

export const CAMERA_CONFIG = {
  sensitivity: 0.0032,
  touchSensitivity: 0.0036,
  invertHorizontalDrag: true,
  invertVerticalDrag: true,
  damping: 0.12,
  minPitch: (-72 * Math.PI) / 180,
  maxPitch: (72 * Math.PI) / 180,
  defaultFov: 58,
  minFov: 47,
  maxFov: 72,
  zoomStep: 0.018,
  zoomDamping: 0.14,
  idleDelayMs: 5000,
  autoRotateSpeed: 0.08,
  minTransitionDuration: 1,
  maxTransitionDuration: 1.95,
  transitionDistanceFactor: 0.34,
  hotspotHeight: 0.92,
  hotspotAutoDistance: 1.6,
  eyeHeightInches: 65,
  targetHeightOffset: 0.05,
};

const INCH_TO_METER = 0.0254;
const MODEL_CENTER: Vector3Tuple = [291.67, 0, -227.36];
const EYE_HEIGHT = CAMERA_CONFIG.eyeHeightInches * INCH_TO_METER;
export const modelSceneOffset: Vector3Tuple = [
  MODEL_CENTER[0] * INCH_TO_METER,
  MODEL_CENTER[1] * INCH_TO_METER,
  MODEL_CENTER[2] * INCH_TO_METER,
];

const toMeters = ([x, y, z]: Vector3Tuple): Vector3Tuple => [
  (x - MODEL_CENTER[0]) * INCH_TO_METER,
  y * INCH_TO_METER,
  (z - MODEL_CENTER[2]) * INCH_TO_METER,
];

const withEyeHeight = ([x, _y, z]: Vector3Tuple): Vector3Tuple => [x, EYE_HEIGHT, z];

const withForwardTargetHeight = ([x, _y, z]: Vector3Tuple): Vector3Tuple => [
  x,
  EYE_HEIGHT - CAMERA_CONFIG.targetHeightOffset,
  z,
];

const HOTSPOT_HEIGHT_INCHES = 36;

const connection = (
  targetId: string,
  label: string,
  hotspotPosition?: Vector3Tuple,
  path?: Vector3Tuple[],
): TourConnection => ({
  targetId,
  label,
  hotspotPosition,
  path,
});

const hotspot = (x: number, z: number): Vector3Tuple => [x, HOTSPOT_HEIGHT_INCHES, z];

const SOCIAL_TO_HALL_PATH: Vector3Tuple[] = [
  [244, 65, -225],
  [288, 65, -179],
];

const HALL_TO_BEDROOM_ONE_PATH: Vector3Tuple[] = [
  [288, 65, -179],
  [247, 65, -130],
];

const HALL_TO_SUITE_PATH: Vector3Tuple[] = [
  [288, 65, -179],
  [318, 65, -186],
  [344, 65, -236],
];

const HALL_TO_BEDROOM_TWO_PATH: Vector3Tuple[] = [
  [288, 65, -179],
  [323, 65, -164],
  [354, 65, -133],
];

const rawTourPoints: TourPoint[] = [
  {
    id: 'entry',
    name: 'Entrada',
    eyebrow: 'Residencial',
    title: 'Chegada',
    description:
      'A entrada organiza a leitura da casa logo no primeiro olhar, com eixo claro para a ala social e acesso imediato ao núcleo íntimo.',
    features: ['120 m² privativos', '3 dormitórios', '2 vagas de garagem'],
    position: [318, 65, -382],
    defaultTarget: [286, 62, -338],
    connections: [
      connection(
        'living',
        'Sala de estar',
        hotspot(300, -355),
        [
          [301, 65, -355],
          [280, 65, -321],
          [226, 65, -266],
        ],
      ),
    ],
  },
  {
    id: 'living',
    name: 'Sala de estar',
    eyebrow: 'Conviver',
    title: 'Sala de estar',
    description:
      'Amplitude para viver grandes momentos, com composição aberta, integração natural e profundidade visual suficiente para uma leitura cinematográfica do ambiente.',
    features: ['Ambientes integrados', 'Iluminação natural', 'Composição social generosa'],
    position: [195, 65, -245],
    defaultTarget: [146, 52, -223],
    connections: [
      connection(
        'entry',
        'Entrada',
        hotspot(226, -266),
        [
          [226, 65, -266],
          [280, 65, -321],
          [301, 65, -355],
        ],
      ),
      connection(
        'kitchen',
        'Cozinha',
        hotspot(222, -286),
        [
          [222, 65, -286],
          [228, 65, -326],
        ],
      ),
      connection(
        'hall',
        'Corredor',
        hotspot(244, -225),
        SOCIAL_TO_HALL_PATH,
      ),
    ],
  },
  {
    id: 'kitchen',
    name: 'Cozinha',
    eyebrow: 'Área gourmet',
    title: 'Cozinha integrada',
    description:
      'Funcionalidade no centro da casa, com bancada linear, leitura limpa dos apoios e conexão imediata com a área social.',
    features: ['Bancada extensa', 'Integração com jantar', 'Visão ampla do setor social'],
    position: [241, 65, -362],
    defaultTarget: [164, 58, -377],
    connections: [
      connection(
        'living',
        'Sala de estar',
        hotspot(228, -326),
        [
          [228, 65, -326],
          [222, 65, -286],
        ],
      ),
    ],
  },
  {
    id: 'hall',
    name: 'Corredor',
    eyebrow: 'Circulação',
    title: 'Corredor íntimo',
    description:
      'A circulação organiza o acesso aos dormitórios com leitura direta das portas e transições mais naturais entre os ambientes íntimos.',
    features: ['Distribuição clara', 'Leitura objetiva das portas', 'Conexão direta com a ala íntima'],
    position: [288, 65, -179],
    defaultTarget: [332, 60, -176],
    connections: [
      connection(
        'living',
        'Sala de estar',
        hotspot(244, -225),
        SOCIAL_TO_HALL_PATH.slice().reverse(),
      ),
      connection(
        'bedroom-one',
        'Quarto 01',
        hotspot(247, -130),
        [[247, 65, -130]],
      ),
      connection(
        'suite',
        'Suíte master',
        hotspot(344, -236),
        [
          [318, 65, -186],
          [344, 65, -236],
        ],
      ),
      connection(
        'bedroom-two',
        'Quarto 02',
        hotspot(354, -133),
        [
          [323, 65, -164],
          [354, 65, -133],
        ],
      ),
    ],
  },
  {
    id: 'bedroom-one',
    name: 'Quarto 01',
    eyebrow: 'Dormitório',
    title: 'Quarto 01',
    description:
      'Um dormitório flexível para hóspedes, filhos ou home office, com área suficiente para mobiliário completo e circulação sem conflito.',
    features: ['Layout flexível', 'Boa largura útil', 'Privacidade preservada'],
    position: [204, 65, -108],
    defaultTarget: [165, 48, -92],
    connections: [
      connection(
        'hall',
        'Corredor',
        hotspot(247, -130),
        [[247, 65, -130], ...HALL_TO_BEDROOM_ONE_PATH.slice().reverse()],
      ),
    ],
  },
  {
    id: 'suite',
    name: 'Suíte master',
    eyebrow: 'Principal',
    title: 'Suíte master',
    description:
      'A suíte principal recebe um enquadramento mais pausado, valorizando proporção, conforto e a atmosfera reservada do setor íntimo.',
    features: ['Composição mais ampla', 'Setor reservado', 'Atmosfera de permanência'],
    position: [392, 65, -240],
    defaultTarget: [444, 48, -216],
    connections: [
      connection(
        'hall',
        'Corredor',
        hotspot(344, -236),
        HALL_TO_SUITE_PATH.slice().reverse(),
      ),
    ],
  },
  {
    id: 'bedroom-two',
    name: 'Quarto 02',
    eyebrow: 'Dormitório',
    title: 'Quarto 02',
    description:
      'O segundo dormitório encerra o tour em um ambiente silencioso e equilibrado, com leitura clara da cama e da área livre ao redor.',
    features: ['Circulação resolvida', 'Boa profundidade', 'Leitura final elegante'],
    position: [392, 65, -94],
    defaultTarget: [432, 48, -103],
    connections: [
      connection(
        'hall',
        'Corredor',
        hotspot(354, -133),
        HALL_TO_BEDROOM_TWO_PATH.slice().reverse(),
      ),
    ],
  },
];

export const previewCamera = {
  position: withEyeHeight(toMeters([315, 65, -431])),
  target: withForwardTargetHeight(toMeters([315, 63, -388])),
};

export const modelInspection = {
  sourceUnits: 'inches',
  worldScaleMeters: INCH_TO_METER,
  eyeHeightMeters: EYE_HEIGHT,
  eyeHeightInches: CAMERA_CONFIG.eyeHeightInches,
  center: [0, 0, 0] as Vector3Tuple,
  sceneOffset: modelSceneOffset,
  boundsMeters: {
    width: 401.025 * INCH_TO_METER,
    depth: 381.014 * INCH_TO_METER,
    height: 125.974 * INCH_TO_METER,
  },
  note:
    'O GLB foi inspecionado e o tour virtual agora usa uma ordem espacial direta: entrada, sala, corredor íntimo, cozinha e dormitórios.',
};

const mapConnectionToMeters = (item: TourConnection): TourConnection => ({
  ...item,
  hotspotPosition: item.hotspotPosition ? toMeters(item.hotspotPosition) : undefined,
  path: item.path?.map((point) => withEyeHeight(toMeters(point))),
});

export const tourPoints = rawTourPoints.map((point) => ({
  ...point,
  position: withEyeHeight(toMeters(point.position)),
  defaultTarget: withForwardTargetHeight(toMeters(point.defaultTarget)),
  connections: point.connections.map(mapConnectionToMeters),
}));

export const initialPointId = tourPoints[0].id;

export const heroCopy = {
  eyebrow: 'Residencial',
  title: ['Uma nova forma', 'de viver.'],
  description:
    'Explore o imóvel por pontos estratégicos com visão 360°, navegação por hotspots e enquadramentos pensados para apresentação premium.',
  cta: 'Iniciar tour',
};
