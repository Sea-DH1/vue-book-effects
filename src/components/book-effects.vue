<template>
  <div>
    <slot
      :canFlipLeft="canFlipLeft"
      :canFlipRight="canFlipRight"
      :canZoomIn="canZoomIn"
      :canZoomOut="canZoomOut"
      :page="page"
      :numPages="numPages"
      :flipLeft="flipLeft"
      :flipRight="flipRight"
      :zoomIn="zoomIn"
      :zoomOut="zoomOut"
    />
    <div
      class="viewport"
      ref="viewport"
      :class="{
        zoom: zooming || zoom > 1,
        'drag-to-scroll': dragToScroll
      }"
      :style="{ cursor: cursor == 'grabbing' ? 'grabbing' : 'auto' }"
      @touchmove="onTouchMove"
      @pointermove="onPointerMove"
      @mousemove="onMouseMove"
      @touchend="onTouchEnd"
      @touchcancel="onTouchEnd"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @mouseup="onMouseUp"
      @wheel="onWheel"
    >
      <div class="flipbook-container" :style="{ transform: `scale(${zoom})` }">
        <div
          class="click-to-flip left"
          :style="{ cursor: canFlipLeft ? 'pointer' : 'auto' }"
          @click="flipLeft"
        />
        <div
          class="click-to-flip right"
          :style="{ cursor: canFlipRight ? 'pointer' : 'auto' }"
          @click="flipRight"
        />
        <div :style="{ transform: `translateX(${centerOffsetSmoothed}px)` }">
          <img
            class="page fixed"
            :style="{
              width: pageWidth + 'px',
              height: pageHeight + 'px',
              left: xMargin + 'px',
              top: yMargin + 'px'
            }"
            :src="pageUrlLoading(leftPage, true)"
            v-if="showLeftPage"
            @load="didLoadImage($event)"
          />
          <img
            class="page fixed"
            :style="{
              width: pageWidth + 'px',
              height: pageHeight + 'px',
              left: viewWidth / 2 + 'px',
              top: yMargin + 'px'
            }"
            v-if="showRightPage"
            :src="pageUrlLoading(rightPage, true)"
            @load="didLoadImage($event)"
          />

          <div :style="{ opacity: flip.opacity }">
            <div
              v-for="[key, bgImage, lighting, bgPos, transform, z] in polygonArray"
              class="polygon"
              :key="key"
              :class="{ blank: !bgImage }"
              :style="{
                backgroundImage: bgImage && `url(${loadImage(bgImage)})`,
                backgroundSize: polygonBgSize,
                backgroundPosition: bgPos,
                width: polygonWidth,
                height: polygonHeight,
                transform: transform,
                zIndex: z
              }"
            >
              <div
                class="lighting"
                v-show="lighting.length"
                :style="{ backgroundImage: lighting }"
              />
            </div>
          </div>
          <div
            class="bounding-box"
            :style="{
              left: boundingLeft + 'px',
              top: yMargin + 'px',
              width: boundingRight - boundingLeft + 'px',
              height: pageHeight + 'px',
              cursor: cursor
            }"
            @touchstart="onTouchStart"
            @pointerdown="onPointerDown"
            @mousedown="onMouseDown"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import Matrix from '@/base/js/Matrix'
import spinner from '@/assets/images/spinner.svg'

const easeIn = (x) => {
  return Math.pow(x, 2)
}

const easeOut = (x) => {
  return 1 - easeIn(1 - x)
}

const easeInOut = (x) => {
  if (x < 0.5) {
    return easeIn(x * 2) / 2
  } else {
    return 0.5 + easeOut((x - 0.5) * 2) / 2
  }
}

const IE = /Trident/.test(navigator.userAgent)

export default {
  name: 'book-effects',
  props: {
    pages: {
      type: Array,
      require: true
    },
    pagesHiRes: {
      type: Array,
      default: () => []
    },
    flipDuration: {
      type: Number,
      default: 1000
    },
    zoomDuration: {
      type: Number,
      default: 500
    },
    zooms: {
      type: Array,
      default: () => [1, 2, 4]
    },
    perspective: {
      type: Number,
      default: 2400
    },
    nPolygons: {
      type: Number,
      default: 10
    },
    ambient: {
      type: Number,
      default: 0.4
    },
    gloss: {
      type: Number,
      default: 0.6
    },
    swipeMin: {
      type: Number,
      default: 3
    },
    singlePage: {
      type: Boolean,
      default: false
    },
    forwardDirection: {
      validator: (val) => val === 'right' || val === 'left',
      default: 'right'
    },
    centering: {
      type: Boolean,
      default: true
    },
    startPage: {
      type: Number,
      default: null
    },
    loadingImage: {
      type: String,
      default: spinner
    }
  },
  data() {
    return {
      viewWidth: 0,
      viewHeight: 0,
      imageWidth: null,
      imageHeight: null,
      displayedPages: 1,
      nImageLoad: 0,
      nImageLoadTrigger: 0,
      imageLoadCallback: null,
      currentPage: 0,
      firstPage: 0,
      secondPage: 1,
      zoomIndex: 0,
      zoom: 1,
      zooming: false,
      touchStartX: null,
      touchStartY: null,
      maxMove: 0,
      activeCursor: null,
      hasTouchEvents: false,
      hasPointerEvents: false,
      minX: Infinity,
      maxX: -Infinity,
      preloadedImages: {},
      flip: {
        progress: 0,
        direction: null,
        frontImage: null,
        backImage: null,
        auto: false,
        opacity: 1
      },
      currentCenterOffset: null,
      animatingCenter: false,
      startScrollLeft: 0,
      startScrollTop: 0,
      scrollLeft: 0,
      scrollTop: 0,
      loadedImages: {}
    }
  },
  methods: {}
}
</script>

<style></style>
