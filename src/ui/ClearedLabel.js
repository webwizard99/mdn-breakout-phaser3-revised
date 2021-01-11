import Phaser from 'phaser';

const formatCleared = (cleared) => `Cleared: ${cleared}`;

export default class ClearedLabel extends Phaser.GameObjects.Text {
  constructor(scene, x, y, cleared, style) {
    super(scene, x, y, formatCleared(cleared), style);
    this.cleared = cleared;
  }

  setCleared(cleared) {
    this.cleared = cleared;
    this.updateClearedText();
  }

  addClear() {
    this.setCleared(this.cleared + 1);
  }

  updateClearedText() {
    this.setText(formatCleared(this.cleared));
  }
}