export const SENSOR_DISTANCE = 32;
export const DIAGONAL_OFFSET = SENSOR_DISTANCE * Math.cos(Math.PI / 4);

const SENSOR_POSITIONS = [
    { x: 0, y: -SENSOR_DISTANCE },
    { x: DIAGONAL_OFFSET, y: -DIAGONAL_OFFSET },
    { x: SENSOR_DISTANCE, y: 0 },
    { x: DIAGONAL_OFFSET, y: DIAGONAL_OFFSET },
    { x: 0, y: SENSOR_DISTANCE },
    { x: -DIAGONAL_OFFSET, y: DIAGONAL_OFFSET },
    { x: -SENSOR_DISTANCE, y: 0 },
    { x: -DIAGONAL_OFFSET, y: -DIAGONAL_OFFSET }
];

export interface SensorCarBody {
    hitTest: (x: number, y: number) => boolean;
}

export interface SensorCar {
    body: SensorCarBody | null | undefined;
}

export interface SensorLane {
    cars: SensorCar[];
}

/**
 * Compute sensor inputs for the given lanes and player position.
 * Returns 8 values (0 or 1) representing detection at positions:
 * N, NE, E, SE, S, SW, W, NW.
 */
export function computeSensorInputs(lanes: SensorLane[], playerX: number, playerY: number): number[] {
    const sensorValues: number[] = [];

    for (const sensorPos of SENSOR_POSITIONS) {
        const sensorX = playerX + sensorPos.x;
        const sensorY = playerY + sensorPos.y;
        let carDetected = 0;

        for (const lane of lanes) {
            for (const car of lane.cars) {
                if (car.body && car.body.hitTest(sensorX, sensorY)) {
                    carDetected = 1;
                    break;
                }
            }

            if (carDetected === 1) {
                break;
            }
        }

        sensorValues.push(carDetected);
    }

    return sensorValues;
}
