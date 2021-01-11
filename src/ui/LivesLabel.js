import Phaser from 'phaser';

const formatLives = (lives) => `Lives: ${lives}`;

export default class LivesLabel extends Phaser.GameObjects.Text {
  constructor(scene, x, y, lives, style) {
    super(scene, x, y, formatLives(lives), style);
    this.lives = lives;
  }

  setLives(lives) {
    this.lives = lives;
    this.updateLivesText();
  }

  removeLife() {
    this.setLives(this.lives -1);
    if (this.lives < 1) return true;
  }

  updateLivesText() {
    this.setText(formatLives(this.lives));
  }
}