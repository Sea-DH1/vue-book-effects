# vue-book-effects

[![npm version](https://badge.fury.io/js/vue-book-effects.svg)](https://badge.fury.io/js/vue-book-effects)

`vue-book-effects` 是一个 Vue 组件，以 3D 翻页效果显示图像。

[Demo](https://examples.nsearh.com/book-effects/).

[Documentation](https://github.com/Sea-DH1/vue-book-effects/blob/main/README.md)

## 安装

Install as a module:

```
npm i -S vue-book-effects
```

or

```
yarn add vue-book-effects
```

Or include in html:

```html
<script src="https://unpkg.com/vue-book-effects"></script>
```

## Usage

```html
<template>
  <vue-book-effects class="book-effects" :pages="['array', 'of', 'image', 'URLs']"></vue-book-effects>
</template>

<style>
.book-effects {
  width: 90vw;
  height: 90vh;
}
</style>
```

If installed as a module,

```html
<script>
import VueBookEffects from 'vue-book-effects'
export default {
  components: { VueBookEffects }
}
</script>
```

If you would like to build from `.vue` directly (including CoffeeScript transpile, etc),

```javascript
import VueBookEffects from 'vue-book-effects/sfc'
```

or

```javascript
import VueBookEffects from 'vue-book-effects/src/vue-book-effects'
```

## Props

### `pages`

图片必须用数组的存放

所有图像应具有相同的宽高比。

如果第一个元素是`null`，则单独显示一个图片元素。

其他属性都是可选的。

### `pagesHiRes`

高分辨率的图片数组。
主要在缩放时使用。

### `flipDuration`

页面翻转动画的持续时间（以毫秒为单位）。默认为 1000。

### `zoomDuration`

以毫秒为单位的放大/缩小动画的持续时间。默认为 500。

### `zooms`

一系列可能的放大倍数。 null相当于[1]（无缩放）。默认为[1, 2, 4]。

注：不要传递空数组。

### `ambient`

环境光强度在 0 到 1 之间。值越小，阴影越多。默认为0.4。

### `gloss`

镜面光强度在 0 到 1 之间。值越高，光泽度越高。默认为 0.6。

### `perspective`

屏幕和观看者（用户屏幕）之间的 Z 轴距离（以像素为单位）。 较高的值产生的效果较小。 默认为 2400。

### `nPolygons`

单个页面被水平分割成多少个矩形。 更高的值提供更高质量的渲染以换取性能。 默认为 10。

### `singlePage`

无视窗口大小，都强制使用单页模式。
默认为`false`。

### `forwardDirection`

阅读方向。
如果您的文档是从右到左，请设置此`left`。
默认为`true`。

### `centering`

Enable centering of the cover pages.
Default is `true`.

### `startPage`

启用封面居中。
默认值为`true`。

### `loadingImage`

页面加载时显示的图像的 URL。
默认情况下使用内部动画 SVG。

## Events

### `flip-left-start`

当向左翻转动画开始时触发。

参数是翻页前的页码。

### `flip-left-end`

当向左翻转动画结束时触发。

参数是翻转后的页码。

### `flip-right-start`

当向右翻转动画开始时触发。

参数是翻页前的页码。

### `flip-right-end`

当向右翻转动画结束时触发。

参数是翻转后的页码。

### `zoom-start`

当放大/缩小动画开始时触发。

参数是缩放后的放大倍数。

### `zoom-end`

当放大/缩小动画结束时触发。

参数是缩放后的放大倍数。

## Slot props

该组件将一些属性和方法公开为插槽属性。

Example usage:

```html
<vue-book-effects :pages="pages" v-slot="bookEffects">
  <button @click="bookEffects.flipLeft">Previous Page</button>
  <button @click="bookEffects.flipRight">Next Page</button>
</vue-book-effects>
```

更多实际使用请参考 [`src/App.vue`](https://github.com/Sea-DH1/vue-book-effects/blob/main/src/App.vue) (the demo page source).

这些属性和方法也可以通过 `$refs` 引用到 `vue-book-effects` 组件。

### `canFlipLeft`

如果可以翻到上一页，则为`true`。 

_NOTE_: 如果当前正在动画中，可以返回`false`。

### `canFlipRight`

如果可以翻到下一页则为`true`。 

_NOTE_: 如果当前正在动画中，可以返回`false`。

### `canZoomIn`

如果可以放大，则为`true`。

### `canZoomOut`

如果可以缩小，则为`true`。

### `page`

当前页码 (1 to `numPages`).

### `numPages`

总页数

### `flipLeft()`

翻到上一页的方法。

### `flipRight()`

翻到下一页的方法。

### `zoomIn()`

放大的方法。

### `zoomOut()`

缩小的方法。

## CSS API

可能需要在样式表中直接指定视口的大小
`<vue-book-effects>` 元素，或 vue-book-effects 的 `.viewport` 子元素。

如果尺寸为横向长且 `singlePage` 属性为 `false`（默认），则显示两页展开，适用于桌面浏览器。
如果纵向较长，则显示单页，适用于智能手机。

内部样式。

### `.viewport`

一个 `<div>` 元素，包含除 `<slot>` 之外的所有内容。
`<slot>` 包裹 `.viewport`。

### `.bounding-box`

显示图像的近似边界框。
适用于赋予`box-shadow`（阴影）效果。

## Browser support

支持主流浏览器和 IE 11。

## Development

使用Development：

```
yarn
yarn serve
```

To package for npm:

```
yarn dist
```

## License

MIT

Copyright © 2021-present Sea.
