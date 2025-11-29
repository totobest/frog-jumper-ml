import { Scene } from "phaser";
import { Architect, Network } from "synaptic";
import {
    CROSSOVER_WINNER_COUNT,
    MAX_FROGS,
    GOAL_LINE_Y,
    MUTATE_RATE,
    RESET_TIMER,
    TOP_WINNERS_COUNT,
    PLAYER_START_X,
    PLAYER_START_Y,
    DISTANCE_TO_TRAVEL,
    SENSOR_DISTANCE,
    FROG_HIT_BOX_X,
    FROG_HIT_BOX_Y,
} from "../constants";

import type { SynapticNetworkJSONFormat } from "../../../types";

export interface LaneConfig {
    y: number;
    speed: number;
    direction: "left" | "right";
    spawnRate: number; // milliseconds between spawns
    maxCars: number; // maximum number of cars (1-3)
    cars: Phaser.Types.Physics.Arcade.ImageWithStaticBody[];
    spawnTimer: number;
}

export interface FrogContext {
    alive: boolean;
    timeOfdeath?: number;
    sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    movement: Phaser.Tweens.Tween | null;
    brain: Network;
}
export class Game extends Scene {
    camera!: Phaser.Cameras.Scene2D.Camera;
    background!: Phaser.GameObjects.Image;
    waterBackground!: Phaser.GameObjects.Sprite;
    msg_text!: Phaser.GameObjects.Text;
    cursor!: Phaser.Types.Input.Keyboard.CursorKeys;
    frogs!: FrogContext[];
    lanes!: LaneConfig[];
    gameWidth: number = 640;
    gameHeight: number = 880;
    lastResetTimer: number;
    lastBestFrogIndex: number = 0;
    sensorGraphics!: Phaser.GameObjects.Graphics;
    brainGraphics!: Phaser.GameObjects.Graphics;
    brainLabels: Phaser.GameObjects.Text[] = [];
    bestBrainJSON: SynapticNetworkJSONFormat | null = null;
    constructor() {
        super("Game");
    }

    create() {
        this.lastResetTimer = 0;
        this.camera = this.cameras.main;
        this.camera.setBackgroundColor(0x00ff00);

        // Create animated water background
        this.waterBackground = this.add.sprite(320, 240, "water_anim_0");
        this.waterBackground.setDepth(-1); // Behind everything else

        // Create water animation frames from individual images
        const waterFrameObjects = [];
        for (let i = 0; i <= 9; i++) {
            waterFrameObjects.push({ key: `water_anim_${i}` });
        }

        this.anims.create({
            key: "water_animate",
            frames: waterFrameObjects,
            frameRate: 12, // Adjust speed as needed
            repeat: -1, // Loop infinitely
        });

        // Start water animation
        this.waterBackground.play("water_animate");

        this.background = this.add.image(320, 420, "bg_game");
        this.background.setDepth(0); // Above water but below game objects
        //this.background.setAlpha(0);
        this.frogs = [];
        for (let i = 0; i < MAX_FROGS; i++) {
            const sprite = this.physics.add.sprite(PLAYER_START_X, PLAYER_START_Y, "frog");
            sprite.setCollideWorldBounds(true);
            sprite.setDepth(10); // Above everything
            // Set fixed collision box size (32x32)
            sprite.body.setSize(FROG_HIT_BOX_X, FROG_HIT_BOX_Y);

            const brain = new Architect.Perceptron(5, 10, 3);
            brain.setOptimize(false);

            const playerContext: FrogContext = {
                alive: true,
                brain: brain,
                sprite: sprite,
                movement: null,
            };
            this.frogs.push(playerContext);

            sprite.setData("context", this.frogs[i]);
        }

        // Player animations
        this.anims.create({
            key: "move",
            frames: this.anims.generateFrameNumbers("frog", { start: 1, end: 5 }),
            frameRate: 20,
            repeat: -1,
        });

        this.anims.create({
            key: "idle",
            frames: [{ key: "frog", frame: 0 }],
            frameRate: 20,
        });

        this.cursor = this.input.keyboard!.createCursorKeys();
        this.sensorGraphics = this.add.graphics();
        this.sensorGraphics.setDepth(20);
        this.brainGraphics = this.add.graphics();
        this.brainGraphics.setDepth(25);

        // Initialize car lanes
        this.initCarLanes();

        /*
    this.msg_text = this.add.text(512, 384, 'Make something fun!\nand share it with us:\nsupport@phaser.io', {
        fontFamily: 'Arial Black', fontSize: 38, color: '#ffffff',
        stroke: '#000000', strokeThickness: 8,
        align: 'center'
    });
    this.msg_text.setOrigin(0.5);
    */
        /* this.input.once('pointerdown', () => {

            this.scene.start('GameOver');

        }); */
    }

    initCarLanes() {
        // Calculate lane positions (distributed across the screen height)
        const laneSpacing = 51; // Divide screen into 5 sections, use 4 for lanes
        const startY = 454;

        this.lanes = [
            {
                y: startY,
                speed: 150, // pixels per second
                direction: "right", // left to right
                spawnRate: 2000, // spawn every 2 seconds
                maxCars: 2,
                cars: [],
                spawnTimer: 0,
            },
            {
                y: startY + laneSpacing,
                speed: 200,
                direction: "left", // right to left
                spawnRate: 4000, // spawn every 1.5 seconds
                maxCars: 1,
                cars: [],
                spawnTimer: 0,
            },
            {
                y: startY + laneSpacing * 2,
                speed: 80,
                direction: "right", // left to right
                spawnRate: 2500, // spawn every 2.5 seconds
                maxCars: 3,
                cars: [],
                spawnTimer: 0,
            },
            {
                y: startY + laneSpacing * 3,
                speed: 120,
                direction: "left", // right to left
                spawnRate: 1800, // spawn every 1.8 seconds
                maxCars: 2,
                cars: [],
                spawnTimer: 0,
            },
            {
                y: startY + laneSpacing * 4,
                speed: 120,
                direction: "right", // right to left
                spawnRate: 2800, // spawn every 1.8 seconds
                maxCars: 2,
                cars: [],
                spawnTimer: 0,
            },
        ];

        // Spawn initial cars for each lane (minimum 1 car per lane)
        this.lanes.forEach((lane, index) => {
            // Spawn 1-2 initial cars per lane
            const initialCars = Phaser.Math.Between(1, 2);
            for (let i = 0; i < initialCars; i++) {
                // Add delay for spacing between initial cars
                this.time.delayedCall(i * 500, () => {
                    this.spawnCar(index, true);
                });
            }
        });
    }

    spawnCar(laneIndex: number, initialSpawn: boolean = false) {
        const lane = this.lanes[laneIndex];

        // Don't spawn if lane already has max cars
        if (lane.cars.length >= lane.maxCars) {
            return;
        }

        let startX: number;
        if (lane.direction === "right") {
            // Start from left side
            startX = -50; // Start off-screen to the left
        } else {
            // Start from right side
            startX = this.gameWidth + 50; // Start off-screen to the right
        }

        // For initial spawn, position cars at different positions across the screen
        if (initialSpawn && lane.cars.length > 0) {
            // Calculate spacing based on existing cars
            const spacing = this.gameWidth / (lane.cars.length + 1);
            if (lane.direction === "right") {
                startX = spacing * (lane.cars.length + 1) - 50;
            } else {
                startX = this.gameWidth - spacing * (lane.cars.length + 1) + 50;
            }
        }

        // Randomly select a car image (car_1 through car_10)
        const carImageIndex = Phaser.Math.Between(1, 10);
        const carImageKey = `car_${carImageIndex}`;
        const car = this.physics.add.staticImage(startX, lane.y, carImageKey);
        car.setDepth(5); // Above background and water, below player

        // Flip car horizontally if going left
        if (lane.direction === "right") {
            car.setFlipX(true);
        }

        lane.cars.push(car);

        // Set up overlap detection for the new car
        for (let i = 0; i < MAX_FROGS; i++) {
            if (!this.frogs[i].alive) continue;

            this.physics.add.overlap(this.frogs[i].sprite, car, this.handlePlayerCarCollision, undefined, this);
        }
    }

    handlePlayerCarCollision(player: any, car: any) {
        // Get player position before resetting
        const corpseX = player.x;
        const corpseY = player.y;

        // Reset player
        this.killFrog(player);

        // Create corpse sprite at the collision position using frame 6 from frog spritesheet
        const corpse = this.add.sprite(corpseX, corpseY, "frog", 6);
        corpse.setDepth(4); // Above cars but below player
        corpse.setOrigin(0.5, 0.5); // Center the sprite

        // Fade out the corpse over 2 seconds
        this.tweens.add({
            targets: corpse,
            alpha: 0,
            duration: 2000,
            ease: "Linear",
            onComplete: () => {
                corpse.destroy();
            },
        });
    }
    getRandomBrain(winners: Network[]) {
        const randomWinner = Phaser.Utils.Array.GetRandom(winners);
        return randomWinner;
    }

    getRandomProbBrain(array: { brain: Network; fitness: number }[]) {
        // https://natureofcode.com/book/chapter-9-the-evolution-of-code/#95-the-genetic-algorithm-part-ii-selection
        const totalFitness = array.reduce((acc, cur) => {
            return acc + cur.fitness;
        }, 0);

        const normalizedWinners = array.map((winner) => {
            return {
                brain: winner,
                prob: winner.fitness / totalFitness,
            };
        });

        const winner = Math.random();
        let threshold = 0;
        for (let i = 0; i < normalizedWinners.length; i++) {
            threshold += normalizedWinners[i].prob;
            if (threshold > winner) {
                return normalizedWinners[i].brain;
            }
        }

        return normalizedWinners[0].brain;
    }
    evolveBrains() {
        const brainsWithFitness = this.frogs.map((frog) => ({
            brain: frog.brain,
            fitness: this.computeFitness(frog),
        }));

        brainsWithFitness.sort((a, b) => b.fitness - a.fitness);

        const bestBrainsWithFitness = brainsWithFitness.slice(0, TOP_WINNERS_COUNT);
        //console.log("Selecting ", bestBrainsWithFitness.length, "winners");
        //bestBrainsWithFitness.forEach((winner, winnerIndex) => console.log(winnerIndex, "fitness:", winner.fitness, "sprite.y:", winner.));
        const bestBrains = bestBrainsWithFitness.map((bf) => bf.brain);
        const offsprings: Network[] = [];
        //this.fitProxy.fittest = winners[0].gameObject.fitness;
        // Keep the top units, and evolve the rest of the population
        //console.log("Breeding ...");
        for (let i = bestBrains.length; i < MAX_FROGS; i++) {
            let offspring;

            if (i == bestBrains.length) {
                //console.log("\t[", i, "] Direct crossOver with 2 best ");
                const parentA = bestBrains[0].toJSON();
                const parentB = bestBrains[1].toJSON();
                offspring = this.crossOver(parentA, parentB);
            } else /* if (i < MAX_FROGS - CROSSOVER_WINNER_COUNT) */ {
                // if within maxUnits - count, crossover between two random winners
                //console.log("\t[", i, "] CrossOver with random winners ");
                const parentA = this.getRandomBrain(bestBrains).toJSON();
                const parentB = this.getRandomBrain(bestBrains).toJSON();
                offspring = this.crossOver(parentA, parentB);
            } /* else {
                // clone from a random winner based upon fitness
                //console.log("\t[", i, "] Clone from a random winner ");
                offspring = this.getRandomProbBrain(bestBrainsWithFitness).brain.toJSON();
            }*/

            // mutate offspring for randomness of evolution
            offspring = this.mutation(offspring);

            const newBrain = Network.fromJSON(offspring);
            newBrain.setOptimize(false);

            offsprings.push(newBrain);
        }
        return bestBrains.concat(offsprings);

        //this.brains.sort((a, b) => a.index - b.index);
    }

    computeFitness(frogContext: FrogContext) {
        const gameDuration = this.game.getTime() - this.lastResetTimer;
        const progressionFitness =
            Math.abs(Math.max(Math.min(frogContext.sprite.y, PLAYER_START_Y), GOAL_LINE_Y) - PLAYER_START_Y) / DISTANCE_TO_TRAVEL;
        const survivalityFitness = frogContext.alive ? 1 : (frogContext.timeOfdeath! - this.lastResetTimer) / gameDuration;
        const fitness = progressionFitness * survivalityFitness; // (7 * progressionFitness + survivalityFitness) / 8;
        // console.log("progressFitness:", progressionFitness, "survivalityFitness:", survivalityFitness, "fitness:", fitness);

        return fitness;
    }

    crossOver(parentA: SynapticNetworkJSONFormat, parentB: SynapticNetworkJSONFormat) {
        const cutPoint = Phaser.Math.Between(0, parentA.neurons.length - 1);
        for (let i = cutPoint; i < parentA.neurons.length; i++) {
            const biasFromParentA = parentA.neurons[i].bias;
            parentA.neurons[i].bias = parentB.neurons[i].bias;
            parentB.neurons[i].bias = biasFromParentA;
        }

        return Phaser.Math.Between(0, 1) === 1 ? parentA : parentB;
    }

    mutation(offspring: SynapticNetworkJSONFormat) {
        offspring.neurons.forEach((neuron) => {
            neuron.bias = this.mutate(neuron.bias);
        });

        offspring.connections.forEach((connection) => {
            connection.weight = this.mutate(connection.weight);
        });

        return offspring;
    }
    mutate(gene: number) {
        if (Math.random() < MUTATE_RATE) {
            const mutateFactor = 1 + ((Math.random() - 0.5) * 3 + Math.random() - 0.5);
            const newGene = gene * mutateFactor;
            //console.log("mutate! mutateFactor:", mutateFactor, "gene:", gene, "newGene:", newGene);
            return newGene;
        }

        return gene;
    }

    clearBrainGraph() {
        this.brainGraphics.clear();
        this.brainLabels.forEach((label) => label.destroy());
        this.brainLabels = [];
    }

    renderBrainGraph(bestBrainJSON: SynapticNetworkJSONFormat | null) {
        this.clearBrainGraph();
        if (!bestBrainJSON) {
            return;
        }

        const layers: { [key: string]: number[] } = {};
        bestBrainJSON.neurons.forEach((neuron, index) => {
            const layerKey = `${neuron.layer}`;
            layers[layerKey] = layers[layerKey] || [];
            layers[layerKey].push(index);
        });

        const orderedLayerKeys = [
            "input",
            ...Object.keys(layers)
                .filter((key) => key !== "input" && key !== "output")
                .sort((a, b) => Number(a) - Number(b)),
            "output",
        ].filter((key) => layers[key]);

        const positions = new Map<number, { x: number; y: number }>();
        const graphOffsetX = 50;
        const graphOffsetY = 60;
        const layerSpacing = 200;
        const graphHeight = 420;

        orderedLayerKeys.forEach((layerKey, layerIndex) => {
            const neuronIndices = layers[layerKey];
            const spacingY = graphHeight / (neuronIndices.length + 1);
            neuronIndices.forEach((neuronIndex, indexInLayer) => {
                const x = graphOffsetX + layerIndex * layerSpacing;
                const y = graphOffsetY + spacingY * (indexInLayer + 1);
                positions.set(neuronIndex, { x, y });

                const bias = bestBrainJSON.neurons[neuronIndex].bias;
                const biasAbs = Math.abs(bias);
                const biasColor = bias >= 0 ? 0x00cc99 : 0xff3366;
                const biasStroke = Phaser.Math.Clamp(1 + biasAbs * 3, 1, 6);

                this.brainGraphics.fillStyle(biasColor, 0.35);
                this.brainGraphics.fillCircle(x, y, 16);
                this.brainGraphics.lineStyle(biasStroke, biasColor, 0.9);
                this.brainGraphics.strokeCircle(x, y, 16);

                const biasLabel = this.add.text(x, y, bias.toFixed(2), { fontSize: "12px", color: "#ffffff" }).setOrigin(0.5);
                biasLabel.setDepth(30);
                this.brainLabels.push(biasLabel);
            });
        });

        bestBrainJSON.connections.forEach((connection) => {
            const fromPos = positions.get(connection.from);
            const toPos = positions.get(connection.to);
            if (!fromPos || !toPos) {
                return;
            }
            const weight = connection.weight;
            const weightAbs = Math.abs(weight);
            const color = weight >= 0 ? 0x00cc99 : 0xff3366;
            const thickness = Phaser.Math.Clamp(1 + weightAbs * 2, 1, 4);
            const alpha = 0.4; //Phaser.Math.Clamp(0.4 + weightAbs * 0.6, 0.4, 1);

            this.brainGraphics.lineStyle(thickness, color, alpha);
            this.brainGraphics.beginPath();
            this.brainGraphics.moveTo(fromPos.x, fromPos.y);
            this.brainGraphics.lineTo(toPos.x, toPos.y);
            this.brainGraphics.strokePath();

            const midX = (fromPos.x + toPos.x) / 2;
            const midY = (fromPos.y + toPos.y) / 2;
            //const weightLabel = this.add.text(midX, midY, weight.toFixed(2), { fontSize: "11px", color: "#ffffff" }).setOrigin(0.5);
            //weightLabel.setDepth(30);
            //this.brainLabels.push(weightLabel);
        });
    }

    resetGame() {
        let totalFitness = 0;
        let bestFitness = -Infinity;
        let bestBrainJSON: SynapticNetworkJSONFormat | null = null;
        for (let i = 0; i < MAX_FROGS; i++) {
            const frogContext = this.frogs[i];
            const fitness = this.computeFitness(frogContext);
            totalFitness += fitness;
            if (fitness > bestFitness) {
                bestFitness = fitness;
                bestBrainJSON = frogContext.brain.toJSON();
            }
        }
        if (bestBrainJSON) {
            this.bestBrainJSON = bestBrainJSON;
            this.renderBrainGraph(bestBrainJSON);
        }
        for (let i = 0; i < MAX_FROGS; i++) {
            const frogContext = this.frogs[i];
            if (frogContext.alive) {
                /* if (playerContext.movement) {
                    playerContext.movement.stop()
                    playerContext.movement = null
                } */
                frogContext.sprite.destroy();
            }
        }
        const brains = this.evolveBrains();
        console.assert(brains.length === this.frogs.length);
        console.log("Total fitness=", totalFitness, ", mean fitness: ", totalFitness / MAX_FROGS);
        this.lastBestFrogIndex = 0;
        this.sensorGraphics.clear();
        for (let i = 0; i < MAX_FROGS; i++) {
            const frogContext = this.frogs[i];

            frogContext.brain = brains[i];

            const sprite = this.physics.add.sprite(PLAYER_START_X, PLAYER_START_Y, "frog");
            sprite.setCollideWorldBounds(true);
            sprite.setDepth(10); // Above everything
            // Set fixed collision box size (32x32)
            sprite.body.setSize(FROG_HIT_BOX_X, FROG_HIT_BOX_Y);
            frogContext.sprite = sprite;
            // Set up overlap detection for the new frog
            this.lanes.forEach((lane, laneIndex) => {
                for (let i = 0; i < lane.cars.length; i++) {
                    const car = lane.cars[i];
                    this.physics.add.overlap(sprite, car, this.handlePlayerCarCollision, undefined, this);
                }
            });
            frogContext.alive = true;
            this.frogs[i] = frogContext;
            sprite.setData("context", this.frogs[i]);
        }
    }

    killFrog(frogSprite: any) {
        const frogContext = frogSprite.getData("context") as FrogContext;
        // Stop any active tweens
        if (frogContext.movement && frogContext.movement.isActive()) {
            frogContext.movement.stop();
        }

        frogContext.alive = false;
        frogContext.timeOfdeath = this.game.getTime();
        frogSprite.destroy();
    }

    updateCars(time: number, delta: number) {
        this.lanes.forEach((lane, laneIndex) => {
            // Update spawn timer
            lane.spawnTimer += delta;

            // Spawn new car if timer exceeds spawn rate and we have less than max cars
            if (lane.spawnTimer >= lane.spawnRate && lane.cars.length < lane.maxCars) {
                this.spawnCar(laneIndex);
                lane.spawnTimer = 0;
            }

            // Move cars and remove off-screen ones
            for (let i = lane.cars.length - 1; i >= 0; i--) {
                const car = lane.cars[i];

                // Move car based on direction
                if (lane.direction === "right") {
                    car.x += (lane.speed * delta) / 1000;
                    // Update physics body position to match visual position
                    car.body.updateFromGameObject();
                    // Remove if off-screen to the right
                    if (car.x > this.gameWidth + 50) {
                        car.destroy();
                        lane.cars.splice(i, 1);
                    }
                } else {
                    car.x -= (lane.speed * delta) / 1000;
                    // Update physics body position to match visual position
                    car.body.updateFromGameObject();
                    // Remove if off-screen to the left
                    if (car.x < -50) {
                        car.destroy();
                        lane.cars.splice(i, 1);
                    }
                }
            }

            // Ensure minimum 1 car per lane
            /* if (lane.cars.length === 0) {
                this.spawnCar(laneIndex);
            } */
        });
    }
    jumpPlayer(playerContext: FrogContext, props: { [key: string]: any }, angle: number) {
        if (playerContext.movement && playerContext.movement.isActive()) {
            return;
        }
        playerContext.sprite.setAngle(angle);
        playerContext.movement = this.tweens.add({
            targets: playerContext.sprite,
            ease: "Cubic", // 'Cubic', 'Elastic', 'Bounce', 'Back'
            duration: 300,
            ...props,
            onStart: function () {
                playerContext.sprite.anims.play("move", true);
            },
            onComplete: function () {
                playerContext.sprite.anims.play("idle");
            },
        });
    }

    getSensorOffsets() {
        const diagonalOffset = SENSOR_DISTANCE; //* Math.cos(Math.PI / 4); // ~22.6px for 45 degrees

        return [
            { x: 0, y: -SENSOR_DISTANCE }, // 0: North
            { x: diagonalOffset, y: -diagonalOffset }, // 1: Northeast
            { x: SENSOR_DISTANCE, y: 0 }, // 2: East
            { x: -SENSOR_DISTANCE, y: 0 }, // 6: West
            { x: -diagonalOffset, y: -diagonalOffset }, // 7: Northwest
        ];
    }

    getSensorData(playerContext: FrogContext) {
        const playerX = playerContext.sprite.x;
        const playerY = playerContext.sprite.y;
        const sensorValues: number[] = [];
        const sensorPositions: { x: number; y: number }[] = [];
        const sensorOffsets = this.getSensorOffsets();

        for (const sensorPos of sensorOffsets) {
            const sensorX = playerX + sensorPos.x;
            const sensorY = playerY + sensorPos.y;
            sensorPositions.push({ x: sensorX, y: sensorY });
            let carDetected = 0;

            // Check all cars in all lanes using Phaser's hitTest method
            for (const lane of this.lanes) {
                for (const car of lane.cars) {
                    // Use hitTest to check if sensor point intersects with car body
                    if (car.body && car.body.hitTest(sensorX, sensorY)) {
                        carDetected = 1;
                        break;
                    }
                }
                if (carDetected === 1) break;
            }

            sensorValues.push(carDetected);
        }

        return { sensorValues, sensorPositions };
    }

    /**
     * Get sensor inputs for a player. Returns 5 values (0 or 1) representing
     * car detection around the player (N, NE, E, W, NW) about 32px away.
     */
    getSensorInputs(playerContext: FrogContext): number[] {
        const { sensorValues } = this.getSensorData(playerContext);
        return sensorValues;
    }

    renderSensorsForBestFrog(
        playerContext: FrogContext,
        sensorPositions: { x: number; y: number }[],
        sensorValues: number[],
        time: number,
    ) {
        if (!playerContext.alive) {
            this.sensorGraphics.clear();
            return;
        }

        this.sensorGraphics.clear();

        for (let i = 0; i < sensorPositions.length; i++) {
            const sensorActive = sensorValues[i] === 1;
            const color = sensorActive ? 0xff0000 : 0x00ff00;

            this.sensorGraphics.lineStyle(2, color, 0.9);
            this.sensorGraphics.beginPath();
            this.sensorGraphics.moveTo(playerContext.sprite.x, playerContext.sprite.y);
            this.sensorGraphics.lineTo(sensorPositions[i].x, sensorPositions[i].y);
            this.sensorGraphics.strokePath();
        }
    }

    update(time: number, delta: number): void {
        if (time > this.lastResetTimer + RESET_TIMER) {
            this.resetGame();
            this.lastResetTimer = time;
        }

        // Update cars
        this.updateCars(time, delta);

        if (time < 3000) return;

        for (let i = 0; i < MAX_FROGS; i++) {
            const playerContext = this.frogs[i];
            if (!playerContext.alive || playerContext.sprite.y <= GOAL_LINE_Y) continue;
            if (playerContext.movement && playerContext.movement.isActive()) {
                return;
            }

            // Get sensor inputs (8 sensors detecting cars around player)
            const { sensorValues, sensorPositions } = this.getSensorData(playerContext);
            console.assert(sensorValues.length == 5);
            const [left, right, up /*, down*/] = playerContext.brain.activate(sensorValues);
            if (i === this.lastBestFrogIndex) {
                this.renderSensorsForBestFrog(playerContext, sensorPositions, sensorValues, time);
            }
            //console.log(i, sensorInputs)
            if (left >= 0.5) {
                this.jumpPlayer(playerContext, { x: "-=40" }, -90);
            } else if (right >= 0.5) {
                this.jumpPlayer(playerContext, { x: "+=40" }, 90);
            } else if (up >= 0.5) {
                this.jumpPlayer(playerContext, { y: "-=40" }, 0);
            } /*else if (down >= 0.5) {
                this.jumpPlayer(playerContext, { y: "+=40" }, 180);
            } */
        }

        /*if (this.cursor.left.isDown) {
            this.t({ x: "-=40" }, -90)
        }
        else if (this.cursor.right.isDown) {
            this.t({ x: "+=40" }, 90)
        }
        else if (this.cursor.up.isDown) {
            this.t({ y: "-=40" }, 0)
        }
        else if (this.cursor.down.isDown) {
            this.t({ y: "+=40" }, 180)
        }*/
    }
}
