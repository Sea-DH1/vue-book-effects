import {
  identity,
  multiply,
  perspective,
  translate,
  translate3d,
  rotateY,
  toString
} from 'rematrix'

export default class Matrix {
  constructor(arg) {
    if (arg) {
      if (arg.m) {
        this.m = [].slice.call(arg.m)
      } else {
        this.m = [].slice.call(arg)
      }
    } else {
      this.m = identity()
    }
  }

  clone() {
    return new Matrix(this)
  }

  multiply(m) {
    return (this.m = multiply(this.m, m))
  }

  perspective(d) {
    return this.multiply(perspective(d))
  }

  transformX(x) {
    return (x * this.m[0] + this.m[12]) / (x * this.m[3] + this.m[15])
  }

  translate(x, y) {
    return this.multiply(translate(x, y))
  }

  translate3d(x, y, z) {
    return this.multiply(translate3d(x, y, z))
  }

  rotateY(deg) {
    return this.multiply(rotateY(deg))
  }

  toString() {
    return toString(this.m)
  }
}
