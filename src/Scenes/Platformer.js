class Platformer extends Phaser.Scene {
    constructor() {
        super("platformerScene");
    }

    init() {
        // variables and settings
        this.ACCELERATION = 800;
        this.DRAG = 1500;    // DRAG < ACCELERATION = icy slide
        this.physics.world.gravity.y = 1500;
        this.JUMP_VELOCITY = -700;
    }

    preload() {
        //Note: if this preload is done in Load.js, the program loses access to the animatedTiles plugin when it changes to this scene
        this.load.scenePlugin('AnimatedTiles', './lib/AnimatedTiles.js', 'animatedTiles', 'animatedTiles');
        
        //Doing this solely for the coin sprite. Can't find a better way to do this lol
        this.load.path = "./assets/"
        this.load.spritesheet("tilemap_sheet", "tilemap_packed.png", {
            frameWidth: 18,
            frameHeight: 18
        })
        
        //text
        this.load.bitmapFont("rocketSquare", "KennyRocketSquare_0.png", "KennyRocketSquare.fnt");
    }

    create() {
        // Create a new tilemap game object which uses 18x18 pixel tiles, and is
        // 45 tiles wide and 25 tiles tall.
        this.map = this.add.tilemap("platformer-level-1", 18, 18, 90, 50);

        // Add a tileset to the map
        // First parameter: name we gave the tileset in Tiled
        // Second parameter: key for the tilesheet (from this.load.image in Load.js)
        this.tileset = this.map.addTilesetImage("kenny_tilemap_packed", "tilemap_tiles");

        // Create a layer
        this.backgroundLayer = this.map.createLayer("background", this.tileset, 0, 0);
        this.backgroundLayer.setScale(2.0);
        //Wanted to tint it darker, but .setTint doesn't seem to work. Not sure why.
        //Also set the tiles to be dark for this layer in tiled, but it didn't seem to carry over into the game
        //Sadly have to turn this in, hope you enjoy despite this escess detail!
        //this.backgroundLayer.setTint(0xff0000);
        //console.log(this.backgroundLayer.tintcolor);
        this.groundLayer = this.map.createLayer("Ground-n-Platforms", this.tileset, 0, 0);
        this.groundLayer.setScale(2.0);
        this.detailsLayer = this.map.createLayer("details", this.tileset, 0, 0);
        this.detailsLayer.setScale(2.0);

        // Make it collidable
        this.groundLayer.setCollisionByProperty({
            collides: true
        });

        //console.log(this.animatedTiles);
        //animate the water
        this.animatedTiles.init(this.map);

        // set up player avatar
        this.playerSpawn = this.map.findObject("Player-n-Coins", obj => obj.name === "Player");
        //console.log(this.playerSpawn);
        //y offset needed due to the player being bigger than each square of the floor without it
        my.sprite.player = this.physics.add.sprite(this.playerSpawn.x * 2 + 27, this.playerSpawn.y * 2 - 27, "platformer_characters", "tile_0000.png").setScale(SCALE)
        this.physics.world.bounds.width = this.map.widthInPixels * 2;
        this.physics.world.bounds.height = this.map.heightInPixels * 2;
        my.sprite.player.setCollideWorldBounds(true);

        //console.log(this.cameras.main);
        // setup camera
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels * 2, this.map.heightInPixels * 2);
        this.cameras.main.startFollow(my.sprite.player, true, 0.25, 0.25); // (target, [,roundPixels][,lerpX][,lerpY])
        this.cameras.main.setDeadzone(50, 50);
        //console.log(this.cameras.main);

        // Enable collision handling
        this.physics.add.collider(my.sprite.player, this.groundLayer);

        //coin code
        this.coins = this.map.createFromObjects("Player-n-Coins", {
            name: "coin",
            key: "tilemap_sheet",
            frame: 151
            //gid:152
        })
        for(let coin of this.coins){
            //coin._crop.width = 16;
            //coin._crop.height = 16;
            //console.log(coin.sprite);
            coin.setScale(2.0);
            coin.x = coin.x * 2;
            coin.y = coin.y * 2;
        }
        //console.log(this.coins);
        this.coinGroup = this.add.group(this.coins);
        this.physics.world.enable(this.coins, Phaser.Physics.Arcade.STATIC_BODY);
        this.coins.map((coin) => {
            coin.body.setCircle(12).setOffset(6, 6) 
        })
        this.score = 0;
        //my.text.score = this.add.bitmapText(900, 900, "rocketSquare", "Coins: " + this.score);
        my.text.score = this.add.text(32, 32, `Coins: ${ this.score }`, { 
            fontFamily: "rocketSquare",
            fontSize: '32px',
            backgroundColor: '#000000' 
        }).setScrollFactor(0)
        //console.log(my.text.score);
        this.physics.add.overlap(my.sprite.player, this.coinGroup, (obj1, obj2) => {
            obj2.destroy() // remove coin on overlap
            this.score += 1;
            //my.text.score.setText = "Coins: " + this.score;
            my.text.score.text = `Coins: ${ this.score }`;
        })

        //enemy
        // get enemy object array from tilemap Objects layer
        let enemyList = this.map.filterObjects("Player-n-Coins", obj => obj.name === "enemy");
        this.enemies = [];
        enemyList.map((element) => {
            // Jumper prefab (scene, x, y, key, frame)
            let enemy = new Enemy(this, element.x * 2, element.y * 2, "platformer_characters", "tile_0008.png").setScale(SCALE);
            this.enemies.push(enemy)
        })
        this.physics.add.collider(my.sprite.player, this.enemies, (p1, enemy) => {
            // push player
            if((p1.x > enemy.x && Math.sign(enemy.lastMove) == 1) || (p1.x < enemy.x && Math.sign(enemy.lastMove) == -1)){
                p1.x += enemy.lastMove;
            }
            if(p1.y < enemy.y - (enemy.displayHeight / 2)){
                p1.setVelocityY(-300);
            }
            //p1.setVelocityX(1000);
        })

        // set up Phaser-provided cursor key input
        cursors = this.input.keyboard.createCursorKeys();

        // debug key listener (assigned to D key)
        this.input.keyboard.on('keydown-D', () => {
            this.physics.world.drawDebug = this.physics.world.drawDebug ? false : true
            this.physics.world.debugGraphic.clear()
        }, this);

    }

    update(time,delta) {
        if(cursors.left.isDown) {
            // -T-O-D-O-: have the player accelerate to the left
            if(my.sprite.player.body.velocity.x > -500){
                my.sprite.player.body.setAccelerationX(-this.ACCELERATION);
                if(this.cameras.main.followOffset.x < 200){
                    this.cameras.main.followOffset.x += 0.5 * delta;
                    //this.cameras.main.followOffset.x += ((this.cameras.main.followOffset.x / 200) * 0.9 + 0.1) * delta;
                    if(this.cameras.main.followOffset.x > 200)
                        this.cameras.main.followOffset.x = 200;
                }
            }
            else{
                //console.log("capped");
                my.sprite.player.body.velocity.x = -500;
                my.sprite.player.body.setDragX(this.DRAG);
            }
            if(my.sprite.player.body.velocity.x >= 0){
                my.sprite.player.body.setVelocityX(-this.ACCELERATION * 0.25);
            }
            my.sprite.player.resetFlip();
            my.sprite.player.anims.play('walk', true);

        } else if(cursors.right.isDown) {
            // -T-O-D-O-: have the player accelerate to the right
            if(my.sprite.player.body.velocity.x < 500){
                my.sprite.player.body.setAccelerationX(this.ACCELERATION);
                if(this.cameras.main.followOffset.x > -200){
                    this.cameras.main.followOffset.x -= 0.5 * delta;
                    //this.cameras.main.followOffset.x -= (Math.abs(this.cameras.main.followOffset.x / 200) * 0.9 + 0.1) * delta;
                    if(this.cameras.main.followOffset.x < -200)
                        this.cameras.main.followOffset.x = -200;
                }
            }
            else{
                //console.log("capped");
                my.sprite.player.body.velocity.x = 500;
                my.sprite.player.body.setDragX(this.DRAG);
            }
            //console.log(my.sprite.player.body.velocity.x);
            if(my.sprite.player.body.velocity.x <= 0){
                my.sprite.player.body.setVelocityX(this.ACCELERATION * 0.25);
            }
            //my.sprite.player.body.setDragX(this.DRAG / 2);
            my.sprite.player.setFlip(true, false);
            my.sprite.player.anims.play('walk', true);

        } else {
            // -T-O-D-O-: set acceleration to 0 and have DRAG take over
            my.sprite.player.body.setAccelerationX(0);
            my.sprite.player.body.setDragX(this.DRAG);
            my.sprite.player.anims.play('idle');
            //console.log("smalling: "+this.cameras.main.followOffset.x);
            if(this.cameras.main.followOffset.x > 0){
                this.cameras.main.followOffset.x -= 0.5 * delta;
                if(this.cameras.main.followOffset.x < 0)
                    this.cameras.main.followOffset.x = 0;
            }
            if(this.cameras.main.followOffset.x < 0){
                this.cameras.main.followOffset.x += 0.5 * delta;
                if(this.cameras.main.followOffset.x > 0)
                    this.cameras.main.followOffset.x = 0;
            }
        }

        // player jump
        // note that we need body.blocked rather than body.touching b/c the former applies to tilemap tiles and the latter to the "ground"
        if(!my.sprite.player.body.blocked.down) {
            my.sprite.player.anims.play('jump');
        }
        if(my.sprite.player.body.blocked.down && Phaser.Input.Keyboard.JustDown(cursors.up)) {
            // -T-O-D-O-: set a Y velocity to have the player "jump" upwards (negative Y direction)
            my.sprite.player.body.setVelocityY(this.JUMP_VELOCITY);
        }

        //enemy updater
        //console.log(this.enemies);
        for(let e of this.enemies){
            e.update(time);
        }

        //terminal velocity
        //console.log(my.sprite.player.body.velocity.y);
        if(my.sprite.player.body.velocity.y > 1000){
            my.sprite.player.body.velocity.y = 1000;
        }

        //console.log("wut");
        //console.log(my.sprite.player.body.y + ",");// + 
        //console.log(this.map.heightInPixels * 2 - 48);
        //Out of bounds check
        if(my.sprite.player.body.y >= this.map.heightInPixels * 2 - 48){
            //console.log("check");
            my.sprite.player.body.x = this.playerSpawn.x * 2;
            my.sprite.player.body.y = this.playerSpawn.y * 2 - 64;
            my.sprite.player.body.velocity.x = 0;
            my.sprite.player.body.velocity.y = 0;
        }
    }
}

class Enemy extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, key, frame) {
        super(scene, x, y, key, frame);
        scene.add.existing(this);               // make it real
        scene.physics.add.existing(this);       // add physics body
        this.body.allowGravity = false; //setGravityY(0);
        //this.body.setVelocityY(0);
        this.body.setImmovable();
        this.centerX = x;
        this.centerY = y;
        this.lastMove = 0;
        //console.log(this);
    }
    update(time){
        //this.body.setVelocityY(0);
        this.lastMove = ((200 * Math.cos(time / 1000)) + this.centerX) - this.x;
        this.x = (200 * Math.cos(time / 1000)) + this.centerX;
        //console.log(this.lastMove);
    }
}