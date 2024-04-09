function lerp(start, end, amt) {
    return (1 - amt) * start + amt * end
}

function clamp(a, min, max) {
    return Math.max(min, Math.min(a, max))
}

function smin(a, b, k) {
    const h = clamp(0.5 + 0.5 * (a - b) / k, 0.0, 1.0);
    return lerp(a, b, h) - k * h * (1.0 - h);
}

class Renderer {
    /** @type HTMLCanvasElement */
    canvas

    /** @type CanvasRenderingContext2D */
    ctx

    pixels

    constructor() {
        this.canvas = document.querySelector('#canvas')

        this.ctx = this.canvas.getContext('2d')
        this.resizeCanvasToClientSize()

        this.pixels = this.ctx.createImageData(this.canvas.width, this.canvas.height)
    }

    /**
     *
     * @param {number} x 
     * @param {number} y 
     * @param {number} r 
     * @param {number} g 
     * @param {number} b 
     * @param {number} a 
     */
    setPixel(x, y, r, g, b, a = 255) {
        if (x < 0 || y < 0 || x >= this.pixels.width - 1 || y >= this.pixels.height - 1) {
            return
        }

        const idx = (Math.round(x) + Math.round(y) * this.pixels.width) * 4

        this.pixels.data[idx] = r
        this.pixels.data[idx + 1] = g
        this.pixels.data[idx + 2] = b
        this.pixels.data[idx + 3] = a
    }

    present() {
        this.ctx.putImageData(this.pixels, 0, 0)
    }

    clear() {
        this.pixels.data.fill(0)
    }

    resizeCanvasToClientSize() {
        if (this.canvas.width != this.canvas.clientWidth) {
            this.canvas.width = this.canvas.clientWidth
        }

        if (this.canvas.height != this.canvas.clientHeight) {
            this.canvas.height = this.canvas.clientHeight
        }
    }

    width() {
        return this.canvas.width
    }

    height() {
        return this.canvas.height
    }
}

class Point {
    /** @type number */
    x = 0

    /** @type number */
    y = 0

    /**
     * @param {number} x 
     * @param {number} y 
     */
    constructor(x = 0, y = 0) {
        this.x = x
        this.y = y
    }

    /**
     * @param {Point} p2 
     * @returns number
     */
    distance(p2) {
        return Math.sqrt(this.distanceSquared(p2))
    }

    /**
     * @param {Point} p2
     * @returns number
     */
    distanceSquared(p2) {
        const dx = p2.x - this.x
        const dy = p2.y - this.y

        return dx * dx + dy * dy
    }

    length() {
        const l = Math.sqrt(this.x * this.x + this.y * this.y)
        return l
    }
}

const SDFS = {
    circle(p1, p2, radius) {
        const distance = p1.distance(p2) - radius
        return distance
    },

    rectangle(p1, p2, halfSize) {
        const distance = new Point(
            Math.abs(p2.x - p1.x) - halfSize,
            Math.abs(p2.y - p1.y) - halfSize,
        )

        const x = Math.max(distance.x, 0);
        const y = Math.max(distance.y, 0)

        const outsideDistance = (new Point(x, y)).length();
        const insideDistance = Math.min(Math.max(distance.x, distance.y), 0);

        return outsideDistance + insideDistance;
    }
};

class ISdf {
    sdf(_point) {
        return 0
    }
}

class Circle extends ISdf {
    /** @type Point */
    pos

    /**
     * @param {Point} pos 
     * @param {number} r 
     */
    constructor(pos, r) {
        super()
        this.pos = pos
        this.r = r
    }

    /**
     * @param {Point} point
     */
    sdf(point) {
        const distance = SDFS.circle(point, this.pos, this.r)
        return distance
    }
}

class Rectangle extends ISdf {
    /** @type Point */
    pos

    /**
     * @param {Point} pos 
     * @param {number} r 
     */
    constructor(pos, size) {
        super()
        this.pos = pos
        this.size = size
    }

    /**
     * @param {Point} point
     */
    sdf(point) {
        const distance = SDFS.rectangle(point, this.pos, this.size / 2)
        return distance
    }
}

class App {
    /** @type Renderer */
    renderer

    /** @type {x: number, y: numer} */
    mousePos = {x: 0, y: 0}

    k = 1

    renderObjects = [
        new Circle(new Point(50, 50), 25),
        new Rectangle(new Point(75, 50), 50)
    ]

    /**
     * @param {Renderer} renderer 
     */
    constructor(renderer) {
        this.renderer = renderer
    }

    main() {
        window.addEventListener('mousemove', (event) => {
            this.mousePos = {x: event.clientX, y: event.clientY};
        });

        window.addEventListener('keydown', event => {
            if (event.key === 'ArrowUp') {
                this.k += 0.5
            }

            if (event.key === 'ArrowDown') {
                this.k -= 0.5
            }

            if (event.key === 'ArrowLeft') {
                this.renderObjects[1].pos.x -= 0.5
            }

            if (event.key === 'ArrowRight') {
                this.renderObjects[1].pos.x += 0.5
            }

        })

        const loop = () => {
            this.renderer.resizeCanvasToClientSize()

            this.render()

            requestAnimationFrame(loop)
        }

        requestAnimationFrame(loop)
    }

    render() {
        this.renderer.clear()
        this.renderer.resizeCanvasToClientSize()

        for (let x = 0; x < this.renderer.width(); x++) {
            for (let y = 0; y < this.renderer.height(); y++) {
                const point = new Point(x, y)

                const closest = this.renderObjects.reduce((acc, obj) => {
                    const d = obj.sdf(point)
                    return smin(d, acc, this.k)
                }, 1);

                if (closest > -0.95 && closest < 0.05) {
                    this.renderer.setPixel(x, y, 255, 255, 255)
                }
            }
        };
        //const {x, y} = this.mousePos

        //const r = 25

        //let r_2 = r;
        //for (let r_2 = 0; r_2 < r; r_2++) {
        //for (let i = - Math.PI; i < Math.PI; i += 0.01) {
        //const x_2 = x + Math.sin(i) * r_2
        //const y_2 = y + Math.cos(i) * r_2

        //this.renderer.setPixel(x_2, y_2, 255, 0, 0)
        //}
        //}

        this.renderer.present()
    }
}

const renderer = new Renderer()
const app = new App(renderer)

app.main()
