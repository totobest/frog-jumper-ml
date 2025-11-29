import { Boot } from './scenes/Boot.ts';
import { GameOver } from './scenes/GameOver.ts';
import { Game as MainGame } from './scenes/Game.ts';
import { MainMenu } from './scenes/MainMenu.ts';
import { AUTO, Game } from 'phaser';
import { Preloader } from './scenes/Preloader.ts';

//  Find out more information about the Game Config at:
//  https://docs.phaser.io/api-documentation/typedef/types-core#gameconfig
const config: Phaser.Types.Core.GameConfig = {
    type: AUTO,
    width: 640,
    height: 840,
    physics: {
        default: 'arcade',
    },
    parent: 'game-container',
    backgroundColor: '#028af8',
    scene: [
        Boot,
        Preloader,
        MainMenu,
        MainGame,
        GameOver
    ]
};

const StartGame = (parent: string) => {

    return new Game({ ...config, parent });

}

export default StartGame;
