import { describe, expect, it } from 'vitest';
import { computeSensorInputs, DIAGONAL_OFFSET, SENSOR_DISTANCE, SensorLane } from '../sensors';

type MockCar = {
    body: {
        hitTest: (px: number, py: number) => boolean
    }
};

function createMockCar(x: number, y: number, size: number = 16): MockCar {
    const half = size / 2;
    return {
        body: {
            hitTest: (px: number, py: number) => px >= x - half && px <= x + half && py >= y - half && py <= y + half
        }
    };
}

function createLane(cars: MockCar[]): SensorLane {
    return {
        cars
    };
}

describe('Game getSensorInputs', () => {
    it('returns zeros when no cars are near the sensors', () => {
        const lanes: SensorLane[] = [createLane([])];
        const sensors = computeSensorInputs(lanes, 200, 200);

        expect(sensors).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
    });

    it('detects cars at cardinal and diagonal sensor positions', () => {
        const northCar = createMockCar(200, 200 - SENSOR_DISTANCE);
        const eastCar = createMockCar(200 + SENSOR_DISTANCE, 200);
        const southwestCar = createMockCar(200 - DIAGONAL_OFFSET, 200 + DIAGONAL_OFFSET);

        const lanes: SensorLane[] = [
            createLane([northCar]),
            createLane([eastCar]),
            createLane([southwestCar])
        ];

        const sensors = computeSensorInputs(lanes, 200, 200);

        expect(sensors).toEqual([1, 0, 1, 0, 0, 1, 0, 0]);
    });

    it('detects diagonal cars independently of adjacent cardinals', () => {
        const northEastCar = createMockCar(300 + DIAGONAL_OFFSET, 300 - DIAGONAL_OFFSET);
        const westCar = createMockCar(300 - SENSOR_DISTANCE, 300);

        const lanes: SensorLane[] = [
            createLane([northEastCar]),
            createLane([westCar])
        ];

        const sensors = computeSensorInputs(lanes, 300, 300);

        expect(sensors).toEqual([0, 1, 0, 0, 0, 0, 1, 0]);
    });
});
