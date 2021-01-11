import Phaser from 'phaser'
import ScoreLabel from '../ui/ScoreLabel';
import LivesLabel from '../ui/LivesLabel';
import ClearedLabel from '../ui/ClearedLabel';

import physicsConstants from '../config/physicsConstants';
import gameConstants from '../config/gameConstants';

const ballKey = 'ball';
const paddleKey = 'paddle';
const brickKey = 'brick';
const paddeHitKey = 'paddlehit';
const brickHitKey = 'brickhit';
const buttonKey = 'button';

const brickInfo = {
  width: 50,
  height: 20,
  count: {
      row: 3,
      col: 7
  },
  offset: {
      top: 50,
      left: 60
  },
  padding: 10
};

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('game-scene');
    
    this.ball = undefined;
    this.paddle = undefined;
    this.bricks = undefined;

    // label properties
    this.scoreLabel = undefined;
    this.livesLabel = undefined;
    this.clearedLabel = undefined;

    // visual element properties
    this.startButton = undefined;

    // utility properties
    this.cursors = undefined;
    this.enterKey = undefined;
    // canvas is used for reference in positioning game objects
    this.canvas = undefined;

    // physics variables
    this.velocity = 0;

    // game state variables
    this.timesCleared = 0;
    this.playing = false;
  }
  
  // phaser methods
  preload() {
    this.load.spritesheet(ballKey, 'assets/wobble.png', { frameWidth: 20, frameHeight: 20 });
    this.load.image(paddleKey, 'assets/paddle.png');
    this.load.image(brickKey, 'assets/brick.png');

    // interface
    this.load.spritesheet(buttonKey, 'assets/button.png', { frameHeight: 40, frameWidth: 120});

    // audio
    this.load.audio(paddeHitKey, 'assets/114187__edgardedition__thud17.wav');
    this.load.audio(brickHitKey, 'assets/478284__joao-janz__finger-tap-2-2.wav');

    // set canvas size reference
    this.canvas = this.sys.game.canvas;
  }
  
  create() {
    this.ball = this.createBall();
    this.paddle = this.createPaddle();
    this.bricks = this.createBricks();

    this.resetBallPaddlePosition(this.ball, this.paddle);

    // labels
    this.scoreLabel = this.createScoreLabel(8, 8, 0);
    this.livesLabel = this.createLivesLabel(140, 8, gameConstants.startingLives);
    this.clearedLabel = this.createClearedLabel(240, 8, 0);

    // interface elements
    this.startButton = this.createStartButton();

    // colliders
    this.physics.add.collider(this.ball, this.paddle, this.ballHitPaddle, null, this);
    this.physics.add.collider(this.ball, this.bricks, this.ballHitBrick, null, this);

    // event handlers
    this.physics.world.on("worldbounds", this.detectBounds, this);
    this.startButton.on("pointerdown", this.startGame, this);

    // use built-in Phaser method to bind keyboard inputs to cursors property
    this.cursors = this.input.keyboard.createCursorKeys();
    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
  }
  
  update() {
    // check for paddle movement
    if (this.cursors.left.isDown) {
      this.velocity -= physicsConstants.acceleration;
    } else if (this.cursors.right.isDown) {
      this.velocity += physicsConstants.acceleration;
    } else {
      // if no velocity, reduce accelaration by drag
      if (this.velocity > 0) {
        this.velocity -= physicsConstants.drag;
      } else {
        this.velocity += physicsConstants.drag;
      }
      // if velocity is less than drag, stop paddle to
      // prevent idle drifting
      if (this.velocity < (physicsConstants.drag * 1.1)) {
        this.velocity = 0;
      }
    }
    // limit velocity to maximum
    if (Math.abs(this.velocity) > physicsConstants.maxVelocity) {
      if (this.velocity < 0) {
        this.velocity = physicsConstants.maxVelocity * -1;
      } else {
        this.velocity = physicsConstants.maxVelocity;
      }
    }
    // set paddle velocity to value held in Scene object's velocity property
    if (this.playing) {
      this.paddle.setVelocityX(this.velocity);
    } else if (this.paddle.body.velocity.x > 0) {
      this.paddle.setVelocityX(0);
    }

    // handle input related to starting game
    if (this.cursors.space.isDown && !this.playing) {
      this.startGame();
    }
    if (this.enterKey.isDown && !this.playing) {
      this.startGame();
    }
  }

  // creation methods
  createBall() {
    // .setOrigin replaces Phaser 2 command 'anchor.set(x, y)'
    const ball = this.physics.add.sprite(this.canvas.width * 0.5, this.canvas.height -25, ballKey)
      .setOrigin(0.5);
    const wobbleFrames = [0, 1, 0, 2, 0, 1, 0, 2, 0];
    const wobbleFrameKeys = wobbleFrames.map(wobbleFrame => {
      return { key: ballKey, frame: wobbleFrame}
    });
    this.anims.create({
      key: 'wobble', 
      frames: wobbleFrameKeys,
      frameRate: 24});
    // this line sets the ball to collide with the world bounds
    ball.setCollideWorldBounds(true);
    // set the ball to bounce off object retaining its full velocity
    ball.setBounce(1);
    // tell the ball to respond to events when colliding with world bounds
    ball.body.onWorldBounds = true;
    // set the max ball velocity
    ball.setMaxVelocity(physicsConstants.maxBallVelocity, physicsConstants.maxBallVelocity);
    
    return ball;
  }

  createPaddle() {
    // setOrigin replaces Phaser 2 anchor.set(x, y) method
    const paddle = this.physics.add.sprite(this.canvas.width * 0.5, this.canvas.height - 5, paddleKey)
      .setOrigin(0.5, 1);
    // keep paddle from going off screen
    paddle.setCollideWorldBounds(true);
    // set the paddle to not be moved by collisions
    paddle.body.immovable = true;

    return paddle;
  }

  createBricks() {
    // create static group to contain bricks
    const bricks = this.physics.add.staticGroup();
    for (let column = 0; column < brickInfo.count.col; column++) {
      for (let row = 0; row < brickInfo.count.row; row++) {
        // calculate coordinates of bricks
        let brickX = (column * (brickInfo.width + brickInfo.padding)) + brickInfo.offset.left;
        let brickY = (row * (brickInfo.height + brickInfo.padding)) + brickInfo.offset.top;;
        // create brick gameobject in bricks group
        bricks.create(brickX, brickY, brickKey);
      }
    }
    return bricks;
  }

  createScoreLabel(x, y, score) {
    const style = { fontSize: '20px', fontFamily: 'Ariel', strokeThickness: .6, fill: '#EEE' };
    const label = new ScoreLabel(this, x, y, score, style);

    this.add.existing(label);

    return label;
  }

  createLivesLabel(x, y, lives) {
    const style = { fontSize: '20px', fontFamily: 'Ariel', strokeThickness: .6, fill: '#EEE' };
    const label = new LivesLabel(this, x, y, lives, style);

    this.add.existing(label);

    return label;
  }

  createClearedLabel(x, y, cleared) {
    const style = { fontSize: '20px', fontFamily: 'Ariel', strokeThickness: .6, fill: '#EEE' };
    const label = new ClearedLabel(this, x, y, cleared, style);

    this.add.existing(label);

    return label;
  }

  createStartButton() {
    const startButton = this.add.sprite(this.canvas.width * 0.5, this.canvas.height * 0.5, buttonKey);

    return startButton;
  }

  // collision methods
  ballHitBrick(ball, brick) {
    this.sound.play(brickHitKey);
    // disable physics but not visibility to prevent
    // colision during brick fade
    brick.disableBody(true, false);
    const tween = this.tweens.add({
      targets: brick,
      alpha: { from: 1, to: 0},
      ease: 'Linear',
      duration: gameConstants.brickVanishDelay,
      repeat: 0,
      yoyo: false,
      onComplete: function() {
        brick.disableBody(true, true);
      }
    });
    const multiplier = this.timesCleared > 0 ? gameConstants.clearMultiplier * this.timesCleared : 1;
    const pointValue = gameConstants.basePoints * (multiplier);
    this.scoreLabel.add(pointValue);
    
    if (this.bricks.countActive(true) === 0) {
      this.resetLevel();
    }
  }

  ballHitPaddle(ball, paddle) {
    this.sound.play(paddeHitKey);
    this.ball.anims.play('wobble', true);
  }
  
  // utility methods
  resetBallPaddlePosition(ball, paddle) {
    ball.setPosition(this.canvas.width * 0.5, this.canvas.height - (paddle.height) - (ball.height));
    paddle.setPosition(this.canvas.width * 0.5, paddle.y);
  }

  setBallVelocity(ball) {
    const multiplier = this.timesCleared > 0 ? Math.pow(physicsConstants.speedMutiplier, this.timesCleared): 1;
    ball.setVelocity(150 * multiplier, -150 * multiplier);
  }

  stopBallVelocity(ball) {
    ball.setVelocity(0, 0);
  }

  resetLevel() {
    // temporarily pause game
    this.physics.pause();

    this.clearedLabel.addClear();
    
    // increased timesCleared value to cause increase
    // in score value and ball speed
    this.timesCleared += 1;

    // change ball speed
    this.setBallVelocity(this.ball);

    // reset position of ball and paddle
    this.resetBallPaddlePosition(this.ball, this.paddle);

    this.time.delayedCall(gameConstants.deathDelay + 20, this.repopulateBricks, null, this);

    // resume game after delay
    this.time.delayedCall(gameConstants.deathDelay, this.resumeGame, null, this);
  }

  repopulateBricks() {
    // Respawn bricks
    this.bricks.children.iterate((child) => {
      child.enableBody(true, child.x, child.y, true, true);
      child.clearAlpha();
    });
  }

  startGame() {
    // deactivate the start button
    this.startButton.setActive(false).setVisible(false);
    this.playing = true;
    // reset score and lives
    this.scoreLabel.setScore(0);
    this.livesLabel.setLives(gameConstants.startingLives);
    // set times cleared and its display to 0
    this.timesCleared = 0;
    this.clearedLabel.setCleared(0);
    // reset the ball and paddle positions and the ball velocity
    this.setBallVelocity(this.ball);
    this.resetBallPaddlePosition(this.ball, this.paddle);
  }

  resumeGame() {
    this.physics.resume();
  }

  gameOver() {
    this.startButton.setActive(true).setVisible(true);
    this.stopBallVelocity(this.ball);
    this.playing = false;
  }

  // events
  detectBounds(body, blockedUp, blockedDown, blockedLeft, blockedRight) {
    if (blockedDown) {
      const gameOver = this.livesLabel.removeLife();
      this.resetBallPaddlePosition(this.ball, this.paddle);
      this.physics.pause();
      // create a delay after which to reset the game
      this.time.delayedCall(gameConstants.deathDelay, this.resumeGame, null, this);
      if (gameOver) {
        this.resetLevel();
        this.gameOver();
      }
    }
  }
  
}