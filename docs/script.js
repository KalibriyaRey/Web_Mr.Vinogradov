var App = {};
App.setup = function() {
    var canvas = document.getElementById('particle-canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    this.canvas = canvas;
    this.ctx = this.canvas.getContext('2d');
    this.width = this.canvas.width;
    this.height = this.canvas.height;
    this.dataToImageRatio = 1;
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.webkitImageSmoothingEnabled = false;
    this.ctx.msImageSmoothingEnabled = false;
    this.xC = this.width / 2;
    this.yC = this.height / 2;

    this.stepCount = 0;
    this.particles = [];
    this.lifespan = 1000;
    this.popPerBirth = 1;
    // Оптимизация: уменьшаем количество частиц на мобильных устройствах
    this.maxPop = window.innerWidth <= 600 ? 150 : 300;
    // Оптимизация: реже создаём частицы на мобильных устройствах
    this.birthFreq = window.innerWidth <= 600 ? 5 : 2;

    // Build grid
    this.gridSize = 8;
    this.gridSteps = Math.floor(1000 / this.gridSize);
    this.grid = [];
    var i = 0;
    for (var xx = -500; xx < 500; xx += this.gridSize) {
        for (var yy = -500; yy < 500; yy += this.gridSize) {
            var r = Math.sqrt(xx*xx + yy*yy),
                r0 = 100,
                field;

            if (r < r0) field = 255 / r0 * r;
            else if (r > r0) field = 255 - Math.min(255, (r - r0)/2);

            this.grid.push({
                x: xx,
                y: yy,
                busyAge: 0,
                spotIndex: i,
                isEdge: (xx == -500 ? 'left' : 
                        (xx == (-500 + this.gridSize * (this.gridSteps-1)) ? 'right' : 
                        (yy == -500 ? 'top' : 
                        (yy == (-500 + this.gridSize *(this.gridSteps-1)) ? 'bottom' : 
                        false
                        )
                        )
                        )
                        ),
                field: field
            });
            i++;
        }
    }
    this.gridMaxIndex = i;

    this.deathCount = 0;
    this.initDraw();
};

App.evolve = function() {
    var time1 = performance.now();

    this.stepCount++;

    this.grid.forEach(function(e) {
        if (e.busyAge > 0) e.busyAge++;
    });

    if (this.stepCount % this.birthFreq == 0 && (this.particles.length + this.popPerBirth) < this.maxPop) {
        this.birth();
    }
    App.move();
    App.draw();

    var time2 = performance.now();
};

App.birth = function() {
    var gridSpotIndex = Math.floor(Math.random() * this.gridMaxIndex),
        gridSpot = this.grid[gridSpotIndex],
        x = gridSpot.x, y = gridSpot.y;

    var particle = {
        hue: 200, // Голубой оттенок
        sat: 50, // Уменьшенная насыщенность для серой гаммы
        lum: 40 + Math.floor(20*Math.random()), // Светлость от 40% до 60%
        x: x, y: y,
        xLast: x, yLast: y,
        xSpeed: 0, ySpeed: 0,
        age: 0,
        ageSinceStuck: 0,
        attractor: {
            oldIndex: gridSpotIndex,
            gridSpotIndex: gridSpotIndex,
        },
        name: 'seed-' + Math.ceil(10000000 * Math.random())
    };
    this.particles.push(particle);
};

App.kill = function(particleName) {
    var newArray = this.particles.filter(function(seed) {
        return (seed.name != particleName);
    });
    this.particles = newArray;
};

App.move = function() {
    for (var i = 0; i < this.particles.length; i++) {
        var p = this.particles[i];
        p.xLast = p.x; p.yLast = p.y;

        var index = p.attractor.gridSpotIndex,
            gridSpot = this.grid[index];

        if (Math.random() < 0.5) {
            if (!gridSpot.isEdge) {
                var topIndex = index - 1,
                    bottomIndex = index + 1,
                    leftIndex = index - this.gridSteps,
                    rightIndex = index + this.gridSteps,
                    topSpot = this.grid[topIndex],
                    bottomSpot = this.grid[bottomIndex],
                    leftSpot = this.grid[leftIndex],
                    rightSpot = this.grid[rightIndex];

                var chaos = 30;
                var maxFieldSpot = [topSpot, bottomSpot, leftSpot, rightSpot].reduce(function(max, e) {
                    return (e.field + chaos * Math.random() > max.field + chaos * Math.random()) ? e : max;
                }, topSpot);

                var potentialNewGridSpot = maxFieldSpot;
                if (potentialNewGridSpot.busyAge == 0 || potentialNewGridSpot.busyAge > 15) {
                    p.ageSinceStuck = 0;
                    p.attractor.oldIndex = index;
                    p.attractor.gridSpotIndex = potentialNewGridSpot.spotIndex;
                    gridSpot = potentialNewGridSpot;
                    gridSpot.busyAge = 1;
                } else p.ageSinceStuck++;
            } else p.ageSinceStuck++;

            if (p.ageSinceStuck == 10) this.kill(p.name);
        }

        var k = 8, visc = 0.4;
        var dx = p.x - gridSpot.x,
            dy = p.y - gridSpot.y;

        var xAcc = -k * dx,
            yAcc = -k * dy;

        p.xSpeed += xAcc; p.ySpeed += yAcc;
        p.xSpeed *= visc; p.ySpeed *= visc;

        p.speed = Math.sqrt(p.xSpeed * p.xSpeed + p.ySpeed * p.ySpeed);
        p.dist = Math.sqrt(dx*dx + dy*dy);

        p.x += 0.1 * p.xSpeed; p.y += 0.1 * p.ySpeed;
        p.age++;

        if (p.age > this.lifespan) {
            this.kill(p.name);
            this.deathCount++;
        }
    }
};

App.initDraw = function() {
    this.ctx.beginPath();
    this.ctx.rect(0, 0, this.width, this.height);
    this.ctx.fillStyle = 'rgba(28, 37, 38, 0.8)';
    this.ctx.fill();
    this.ctx.closePath();
};

App.draw = function() {
    this.ctx.beginPath();
    this.ctx.rect(0, 0, this.width, this.height);
    this.ctx.fillStyle = 'rgba(28, 37, 38, 0.1)';
    this.ctx.fill();
    this.ctx.closePath();

    for (var i = 0; i < this.particles.length; i++) {
        var p = this.particles[i];

        var h = p.hue + this.stepCount/30,
            s = p.sat,
            l = p.lum,
            a = 0.7;

        var last = this.dataXYtoCanvasXY(p.xLast, p.yLast),
            now = this.dataXYtoCanvasXY(p.x, p.y);
        var attracSpot = this.grid[p.attractor.gridSpotIndex],
            attracXY = this.dataXYtoCanvasXY(attracSpot.x, attracSpot.y);
        var oldAttracSpot = this.grid[p.attractor.oldIndex],
            oldAttracXY = this.dataXYtoCanvasXY(oldAttracSpot.x, oldAttracSpot.y);

        this.ctx.beginPath();
        this.ctx.strokeStyle = 'hsla(' + h + ', ' + s + '%, ' + l + '%, ' + a + ')';
        this.ctx.fillStyle = 'hsla(' + h + ', ' + s + '%, ' + l + '%, ' + a + ')';

        this.ctx.moveTo(last.x, last.y);
        this.ctx.lineTo(now.x, now.y);

        this.ctx.lineWidth = 1.5 * this.dataToImageRatio;
        this.ctx.stroke();
        this.ctx.closePath();

        this.ctx.beginPath();
        this.ctx.lineWidth = 1.5 * this.dataToImageRatio;
        this.ctx.moveTo(oldAttracXY.x, oldAttracXY.y);
        this.ctx.lineTo(attracXY.x, attracXY.y);
        this.ctx.arc(attracXY.x, attracXY.y, 1.5 * this.dataToImageRatio, 0, 2 * Math.PI, false);

        this.ctx.strokeStyle = 'hsla(' + h + ', ' + s + '%, ' + l + '%, ' + a + ')';
        this.ctx.fillStyle = 'hsla(' + h + ', ' + s + '%, ' + l + '%, ' + a + ')';
        this.ctx.stroke();
        this.ctx.fill();
        this.ctx.closePath();
    }
};

App.dataXYtoCanvasXY = function(x, y) {
    var zoom = 1.6;
    var xx = this.xC + x * zoom * this.dataToImageRatio,
        yy = this.yC + y * zoom * this.dataToImageRatio;
    return {x: xx, y: yy};
};

// Объединяем всё в один обработчик событий
document.addEventListener('DOMContentLoaded', function() {
    App.setup();
    App.draw();

    var frame = function() {
        App.evolve();
        requestAnimationFrame(frame);
    };
    frame();

    // Добавляем обработку касаний для мобильных устройств
    document.querySelectorAll('.btn, .social-icon').forEach(element => {
        element.addEventListener('touchstart', () => element.click());
    });
});