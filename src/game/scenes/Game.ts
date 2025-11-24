import { Scene } from 'phaser';
import { architect } from 'neataptic'

interface LaneConfig {
    y: number;
    speed: number;
    direction: 'left' | 'right';
    spawnRate: number; // milliseconds between spawns
    maxCars: number; // maximum number of cars (1-3)
    cars: Phaser.Types.Physics.Arcade.ImageWithStaticBody[];
    spawnTimer: number;
}

interface PlayerContext {
    alive: boolean;
    sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    movement?: Phaser.Tweens.Tween
    brain: any;

}
export class Game extends Scene {
    camera!: Phaser.Cameras.Scene2D.Camera;
    background!: Phaser.GameObjects.Image;
    waterBackground!: Phaser.GameObjects.Sprite;
    msg_text!: Phaser.GameObjects.Text;
    cursor!: Phaser.Types.Input.Keyboard.CursorKeys;
    players!: PlayerContext[]
    numPlayers: number = 30;
    lanes!: LaneConfig[];
    gameWidth: number = 640;
    gameHeight: number = 880;
    playerStartX: number = 320;
    playerStartY: number = 780;
    myNetwork: any;

    constructor() {
        super('Game');
    }

    create() {
        this.camera = this.cameras.main;
        this.camera.setBackgroundColor(0x00ff00);

        // Create animated water background
        this.waterBackground = this.add.sprite(320, 240, 'water_anim_0');
        this.waterBackground.setDepth(-1); // Behind everything else

        // Create water animation frames from individual images
        const waterFrameObjects = [];
        for (let i = 0; i <= 9; i++) {
            waterFrameObjects.push({ key: `water_anim_${i}` });
        }

        this.anims.create({
            key: 'water_animate',
            frames: waterFrameObjects,
            frameRate: 12, // Adjust speed as needed
            repeat: -1 // Loop infinitely
        });

        // Start water animation
        this.waterBackground.play('water_animate');

        this.background = this.add.image(320, 420, 'bg_game');
        this.background.setDepth(0); // Above water but below game objects
        //this.background.setAlpha(0);
        this.players = []
        for (let i = 0; i < this.numPlayers; i++) {

            const sprite = this.physics.add.sprite(this.playerStartX, this.playerStartY, 'frog');
            sprite.setCollideWorldBounds(true);
            sprite.setDepth(10); // Above everything
            // Set fixed collision box size (32x32)
            sprite.body.setSize(32, 32);

            this.players.push({
                alive: true,
                brain: architect.Perceptron(8, 6, 4),
                sprite: sprite
            })
            sprite.setData("info", this.players[i])
        }



        // Player animations
        this.anims.create({
            key: 'move',
            frames: this.anims.generateFrameNumbers('frog', { start: 1, end: 5 }),
            frameRate: 20,
            repeat: -1
        });

        this.anims.create({
            key: 'idle',
            frames: [{ key: 'frog', frame: 0 }],
            frameRate: 20
        });


        this.cursor = this.input.keyboard!.createCursorKeys();

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
                direction: 'right', // left to right
                spawnRate: 2000, // spawn every 2 seconds
                maxCars: 2,
                cars: [],
                spawnTimer: 0
            },
            {
                y: startY + laneSpacing,
                speed: 200,
                direction: 'left', // right to left
                spawnRate: 4000, // spawn every 1.5 seconds
                maxCars: 1,
                cars: [],
                spawnTimer: 0
            },
            {
                y: startY + laneSpacing * 2,
                speed: 80,
                direction: 'right', // left to right
                spawnRate: 2500, // spawn every 2.5 seconds
                maxCars: 3,
                cars: [],
                spawnTimer: 0
            },
            {
                y: startY + laneSpacing * 3,
                speed: 120,
                direction: 'left', // right to left
                spawnRate: 1800, // spawn every 1.8 seconds
                maxCars: 2,
                cars: [],
                spawnTimer: 0
            },
            {
                y: startY + laneSpacing * 4,
                speed: 120,
                direction: 'right', // right to left
                spawnRate: 2800, // spawn every 1.8 seconds
                maxCars: 2,
                cars: [],
                spawnTimer: 0
            }
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
        if (lane.direction === 'right') {
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
            if (lane.direction === 'right') {
                startX = spacing * (lane.cars.length + 1) - 50;
            } else {
                startX = this.gameWidth - (spacing * (lane.cars.length + 1)) + 50;
            }
        }

        // Randomly select a car image (car_1 through car_10)
        const carImageIndex = Phaser.Math.Between(1, 10);
        const carImageKey = `car_${carImageIndex}`;
        const car = this.physics.add.staticImage(startX, lane.y, carImageKey);
        car.setDepth(5); // Above background and water, below player

        // Flip car horizontally if going left
        if (lane.direction === 'right') {
            car.setFlipX(true);
        }

        lane.cars.push(car);

        // Set up overlap detection for the new car
        for (let i = 0; i < this.numPlayers; i++) {
            if (!this.players[i].alive)
                continue

            this.physics.add.overlap(this.players[i].sprite, car, this.handlePlayerCarCollision, undefined, this);
        }
    }


    handlePlayerCarCollision(player: any, car: any) {
        // Get player position before resetting
        const corpseX = player.x;
        const corpseY = player.y;

        // Reset player
        this.resetPlayer(player);

        // Create corpse sprite at the collision position using frame 6 from frog spritesheet
        const corpse = this.add.sprite(corpseX, corpseY, 'frog', 6);
        corpse.setDepth(4); // Above cars but below player
        corpse.setOrigin(0.5, 0.5); // Center the sprite

        // Fade out the corpse over 2 seconds
        this.tweens.add({
            targets: corpse,
            alpha: 0,
            duration: 2000,
            ease: 'Linear',
            onComplete: () => {
                corpse.destroy();
            }
        });
    }

    resetPlayer(player: any) {
        const playerContext = player.getData("info") as PlayerContext
        // Stop any active tweens
        if (playerContext.movement && playerContext.movement.isActive()) {
            playerContext.movement.stop();
        }


        playerContext.alive = false
        player.destroy()

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
                if (lane.direction === 'right') {
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
    jumpPlayer(playerContext: PlayerContext, props: { [key: string]: any }, angle: number) {
        if (playerContext.movement && playerContext.movement.isActive()) {
            return
        }
        playerContext.sprite.setAngle(angle)
        playerContext.movement = this.tweens.add({
            targets: playerContext.sprite,
            ease: 'Cubic',       // 'Cubic', 'Elastic', 'Bounce', 'Back'
            duration: 200,
            ...props,
            onStart: function () {
                playerContext.sprite.anims.play('move', true);
            },
            onComplete: function () {
                playerContext.sprite.anims.play('idle');
            }
        });
    }


    update(time: number, delta: number): void {
        // Update cars
        this.updateCars(time, delta);

        if (time < 3000)
            return

        for (let i = 0; i < this.numPlayers; i++) {
            const playerContext = this.players[i]
            if (!playerContext.alive)
                continue
            const [left, right, up, down] = playerContext.brain.activate([0, 0, 0, 0, 0, 0, 0, 0]) as [number, number, number, number]
            if (left >= 0.5) {
                this.jumpPlayer(playerContext, { x: "-=40" }, -90)
            }
            else if (right >= 0.5) {
                this.jumpPlayer(playerContext, { x: "+=40" }, 90)
            }
            else if (up >= 0.5) {
                this.jumpPlayer(playerContext, { y: "-=40" }, 0)
            }
            else if (down >= 0.5) {
                this.jumpPlayer(playerContext, { y: "+=40" }, 180)
            }
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
