import Phaser from 'phaser'
import GameScene from './scenes/GameScene';

const config = {
	type: Phaser.CANVAS,
	width: 480,
	height: 320,
	scale: {
		mode: Phaser.Scale.FIT,
		autoCenter: Phaser.Scale.CENTER_BOTH
	},
	physics: {
		default: 'arcade',
		arcade: {
			
		}
	},
	scene: [GameScene]
}

export default new Phaser.Game(config)
