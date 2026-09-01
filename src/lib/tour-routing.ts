import * as THREE from 'three';
import { CAMERA_CONFIG } from '../data/tour';
import type { TourConnection, TourPoint } from '../data/tour';

export type TourPointIndex = {
  order: TourPoint[];
  map: Map<string, TourPoint>;
};

const dedupeVectors = (vectors: THREE.Vector3[]) => {
  const deduped: THREE.Vector3[] = [];

  vectors.forEach((vector) => {
    const previous = deduped.at(-1);

    if (!previous || previous.distanceTo(vector) > 0.02) {
      deduped.push(vector.clone());
    }
  });

  return deduped;
};

export const createTourPointIndex = (points: TourPoint[]): TourPointIndex => ({
  order: points,
  map: new Map(points.map((point) => [point.id, point])),
});

export const tupleToVector3 = (tuple: [number, number, number]) =>
  new THREE.Vector3(tuple[0], tuple[1], tuple[2]);

export const withEyeHeight = (vector: THREE.Vector3) =>
  vector.clone().setY(CAMERA_CONFIG.eyeHeightInches * 0.0254);

export const withTargetHeight = (vector: THREE.Vector3) =>
  vector
    .clone()
    .setY(CAMERA_CONFIG.eyeHeightInches * 0.0254 - CAMERA_CONFIG.targetHeightOffset);

export const getPointById = (index: TourPointIndex, pointId: string) => {
  const point = index.map.get(pointId);

  if (!point) {
    throw new Error(`Unknown tour point: ${pointId}`);
  }

  return point;
};

export const getConnectionBetween = (
  point: TourPoint,
  targetId: string,
): TourConnection | undefined => point.connections.find((connection) => connection.targetId === targetId);

export const resolveHotspotPosition = (
  source: TourPoint,
  destination: TourPoint,
  connection: TourConnection,
) => {
  if (connection.hotspotPosition) {
    return tupleToVector3(connection.hotspotPosition);
  }

  const sourcePosition = tupleToVector3(source.position);
  const destinationPosition = tupleToVector3(destination.position);
  const direction = destinationPosition.sub(sourcePosition);
  direction.y = 0;
  direction.normalize().multiplyScalar(CAMERA_CONFIG.hotspotAutoDistance);

  return sourcePosition
    .clone()
    .add(direction)
    .setY(CAMERA_CONFIG.hotspotHeight);
};

export const findPointRoute = (
  index: TourPointIndex,
  fromId: string,
  toId: string,
) => {
  if (fromId === toId) {
    return [fromId];
  }

  const queue: string[][] = [[fromId]];
  const visited = new Set([fromId]);

  while (queue.length > 0) {
    const route = queue.shift()!;
    const point = getPointById(index, route.at(-1)!);

    for (const connection of point.connections) {
      if (visited.has(connection.targetId)) {
        continue;
      }

      const nextRoute = [...route, connection.targetId];

      if (connection.targetId === toId) {
        return nextRoute;
      }

      visited.add(connection.targetId);
      queue.push(nextRoute);
    }
  }

  return [fromId, toId];
};

export const buildRouteWaypoints = (index: TourPointIndex, route: string[]) => {
  const waypoints: THREE.Vector3[] = [];

  route.forEach((pointId, routeIndex) => {
    const point = getPointById(index, pointId);

    if (routeIndex === 0) {
      waypoints.push(tupleToVector3(point.position));
      return;
    }

    const previousPoint = getPointById(index, route[routeIndex - 1]);
    const connection = getConnectionBetween(previousPoint, point.id);

  if (connection?.hotspotPosition) {
      waypoints.push(withEyeHeight(tupleToVector3(connection.hotspotPosition)));
    }

    connection?.path?.forEach((pathPoint) => {
      waypoints.push(withEyeHeight(tupleToVector3(pathPoint)));
    });

    waypoints.push(withEyeHeight(tupleToVector3(point.position)));
  });

  return dedupeVectors(waypoints);
};

export const buildPreviewWaypoints = (
  start: THREE.Vector3,
  destination: TourPoint,
) => {
  const destinationPosition = tupleToVector3(destination.position);
  const midpoint = start.clone().lerp(destinationPosition, 0.45);
  return dedupeVectors([
    withEyeHeight(start),
    withEyeHeight(midpoint),
    withEyeHeight(destinationPosition),
  ]);
};

export const getLookAngles = (position: THREE.Vector3, target: THREE.Vector3) => {
  const direction = target.clone().sub(position);
  const yaw = Math.atan2(direction.x, direction.z);
  const pitch = Math.atan2(
    direction.y,
    Math.max(0.0001, Math.hypot(direction.x, direction.z)),
  );
  return { yaw, pitch };
};

export const getForwardFromAngles = (yaw: number, pitch: number) =>
  new THREE.Vector3(
    Math.sin(yaw) * Math.cos(pitch),
    Math.sin(pitch),
    Math.cos(yaw) * Math.cos(pitch),
  ).normalize();

export const measurePathDistance = (waypoints: THREE.Vector3[]) => {
  let totalDistance = 0;

  for (let index = 1; index < waypoints.length; index += 1) {
    totalDistance += waypoints[index - 1].distanceTo(waypoints[index]);
  }

  return totalDistance;
};
