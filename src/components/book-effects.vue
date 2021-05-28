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
import { computed, watch, onMounted, onUnmounted, reactive, ref, toRefs } from 'vue'
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
  // emits: ['zoom-end'],
  setup(props, { emit }) {
    const viewWidth = ref(0)
    const viewHeight = ref(0)
    const imageWidth = ref(null)
    const imageHeight = ref(null)
    const displayedPages = ref(1)
    const nImageLoad = ref(0)
    const nImageLoadTrigger = ref(0)
    const imageLoadCallback = ref(null)
    const currentPage = ref(0)
    const firstPage = ref(0)
    const secondPage = ref(1)
    const zoomIndex = ref(0)
    const zoom = ref(1)
    const zooming = ref(false)
    const touchStartX = ref(null)
    const touchStartY = ref(null)
    const maxMove = ref(0)
    const activeCursor = ref(null)
    const hasTouchEvents = ref(false)
    const hasPointerEvents = ref(false)
    const minX = ref(Infinity)
    const maxX = ref(-Infinity)
    const flip = reactive({
      progress: 0,
      direction: null,
      frontImage: null,
      backImage: null,
      auto: false,
      opacity: 1
    })
    const currentCenterOffset = ref(null)
    const animatingCenter = ref(false)
    const startScrollLeft = ref(0)
    const startScrollTop = ref(0)
    const scrollLeft = ref(0)
    const scrollTop = ref(0)
    const loadedImages = ref({})

    const viewportRef = ref(null)

    const {
      flipDuration,
      pagesHiRes,
      forwardDirection,
      zoomDuration,
      pages,
      zooms,
      nPolygons,
      perspective,
      swipeMin,
      singlePage,
      centering,
      ambient,
      gloss,
      startPage,
      loadingImage
    } = toRefs(props)

    const canFlipLeft = computed(() => {
      if (forwardDirection.value === 'left') {
        return canGoForward.value
      } else {
        return canGoBack.value
      }
    })

    const canFlipRight = computed(() => {
      if (forwardDirection.value === 'right') {
        return canGoForward.value
      } else {
        return canGoBack.value
      }
    })

    const canZoomIn = computed(() => {
      return !zooming.value && zoomIndex.value < zooms_.value.length - 1
    })

    const canZoomOut = computed(() => {
      return !zooming.value && zoomIndex.value > 0
    })

    const numPages = computed(() => {
      if (pages.value[0] === null) {
        return pages.value.length - 1
      } else {
        return pages.value.length
      }
    })

    const page = computed(() => {
      if (pages.value[0] !== null) {
        return currentPage.value + 1
      } else {
        return Math.max(1, currentPage.value)
      }
    })

    const zooms_ = computed(() => {
      return zooms.value || []
    })

    const canGoForward = computed(() => {
      return !flip.direction && currentPage.value < pages.value.length - displayedPages.value
    })

    const canGoBack = computed(() => {
      return (
        !flip.direction &&
        currentPage.value >= displayedPages.value &&
        !(displayedPages.value === 1 && !pageUrl(firstPage.value - 1))
      )
    })

    const leftPage = computed(() => {
      if (forwardDirection.value === 'right' || displayedPages.value === 1) {
        return firstPage.value
      } else {
        return secondPage.value
      }
    })

    const rightPage = computed(() => {
      if (forwardDirection.value === 'left') {
        return firstPage.value
      } else {
        return secondPage.value
      }
    })

    const showLeftPage = computed(() => {
      return pageUrl(leftPage.value)
    })

    const showRightPage = computed(() => {
      return pageUrl(rightPage.value)
    })

    const cursor = computed(() => {
      if (activeCursor.value) {
        return activeCursor.value
      } else if (IE) {
        return 'auto'
      } else if (canZoomIn.value) {
        return 'zoom-in'
      } else if (canZoomOut.value) {
        return 'zoom-out'
      } else {
        return 'grab'
      }
    })

    const pageScale = computed(() => {
      const vw = viewWidth.value / displayedPages.value
      const xScale = vw / imageWidth.value
      const yScale = viewHeight.value / imageHeight.value
      const scale = xScale < yScale ? xScale : yScale
      if (scale < 1) {
        return scale
      } else {
        return 1
      }
    })

    const pageWidth = computed(() => {
      return Math.round(imageWidth.value * pageScale.value)
    })

    const pageHeight = computed(() => {
      return Math.round(imageHeight.value * pageScale.value)
    })

    const xMargin = computed(() => {
      return (viewWidth.value - pageWidth.value * displayedPages.value) / 2
    })

    const yMargin = computed(() => {
      return (viewHeight.value - pageHeight.value) / 2
    })

    const polygonWidth = computed(() => {
      let w = pageWidth.value / nPolygons.value
      w = Math.ceil(w + 1 / this.zoom)
      return w + 'px'
    })

    const polygonHeight = computed(() => {
      return pageHeight.value + 'px'
    })

    const polygonBgSize = computed(() => {
      return `${pageWidth.value}px ${pageHeight.value}px`
    })

    const polygonArray = computed(() => {
      return makePolygonArray('front').concat(makePolygonArray('back'))
    })

    const boundingLeft = computed(() => {
      if (displayedPages.value === 1) {
        return xMargin.value
      } else {
        const x = pageUrl(leftPage.value) ? xMargin.value : viewWidth.value / 2
        if (x < minX.value) {
          return x
        } else {
          return minX.value
        }
      }
    })

    const boundingRight = computed(() => {
      const viewWidthVal = viewWidth.value
      if (displayedPages.value === 1) {
        return viewWidthVal - xMargin.value
      } else {
        const x = pageUrl(rightPage.value) ? viewWidthVal - xMargin.value : viewWidthVal / 2
        if (x > maxX.value) {
          return x
        } else {
          return maxX.value
        }
      }
    })

    const centerOffset = computed(() => {
      const retval = centering.value
        ? Math.round(viewWidth.value / 2 - (boundingLeft.value + boundingRight.value) / 2)
        : 0
      if (currentCenterOffset.value === null && imageWidth.value !== null) {
        // eslint-disable-next-line vue/no-side-effects-in-computed-properties
        currentCenterOffset.value = retval
      }
      return retval
    })

    const centerOffsetSmoothed = computed(() => {
      return Math.round(currentCenterOffset.value)
    })

    const dragToScroll = computed(() => {
      return !hasTouchEvents.value
    })

    const scrollLeftMin = computed(() => {
      const w = (boundingRight.value - boundingLeft.value) * zoom.value
      if (w < viewWidth.value) {
        return (
          (boundingLeft.value + centerOffsetSmoothed.value) * zoom.value - (viewWidth.value - w) / 2
        )
      } else {
        return (boundingLeft.value + centerOffsetSmoothed.value) * zoom.value
      }
    })

    const scrollLeftMax = computed(() => {
      const w = (boundingRight.value - boundingLeft.value) * zoom.value
      if (w < viewWidth.value) {
        return (
          (boundingLeft.value + centerOffsetSmoothed.value) * zoom.value - (viewWidth.value - w) / 2
        )
      } else {
        return (boundingRight.value + centerOffsetSmoothed.value) * zoom.value - viewWidth.value
      }
    })

    const scrollTopMin = computed(() => {
      const h = pageHeight.value * zoom.value
      if (h < viewHeight.value) {
        return yMargin.value * zoom.value - (viewHeight.value - h) / 2
      } else {
        return yMargin.value * zoom.value
      }
    })

    const scrollTopMax = computed(() => {
      const h = pageHeight.value * zoom.value
      if (h < viewHeight.value) {
        return yMargin.value * zoom.value - (viewHeight.value - h) / 2
      } else {
        return (yMargin.value + pageHeight.value) * zoom.value - viewHeight.value
      }
    })

    const scrollLeftLimited = computed(() => {
      return Math.min(scrollLeftMax.value, Math.max(scrollLeftMin.value, scrollLeft.value))
    })

    const scrollTopLimited = computed(() => {
      return Math.min(scrollTopMax.value, Math.max(scrollTopMin.value, scrollTop.value))
    })

    function onResize() {
      const viewport = viewportRef.value
      if (!viewport) {
        return
      }
      viewWidth.value = viewport.clientWidth
      viewHeight.value = viewport.clientHeight
      displayedPages.value = viewWidth.value > viewHeight.value && !singlePage.value ? 2 : 1
      if (displayedPages.value === 2) {
        currentPage.value &= ~1
      }
      fixFirstPage()
      minX.value = Infinity
      return (maxX.value = -Infinity)
    }

    function fixFirstPage() {
      if (
        displayedPages.value === 1 &&
        currentPage.value === 0 &&
        pages.value.length &&
        !pageUrl(0)
      ) {
        return currentPage.value++
      }
    }

    function pageUrl(page, hiRes = false) {
      let url
      if (hiRes == null) {
        hiRes = false
      }
      if (hiRes && zoom.value > 1 && !zooming.value) {
        url = pagesHiRes.value[page]
        if (url) {
          return url
        }
      }
      return pages.value[page] || null
    }

    function pageUrlLoading(page, hiRes = false) {
      let url
      if (hiRes == null) {
        hiRes = false
      }
      url = pageUrl(page, hiRes)
      if (hiRes && zoom.value > 1 && !zooming.value) {
        return url
      }
      return url && loadImage(url)
    }

    function flipLeft() {
      if (!canFlipLeft.value) {
        return
      }
      return flipStart('left', true)
    }

    function flipRight() {
      if (!canFlipRight.value) {
        return
      }
      return flipStart('right', true)
    }

    function flipStart(direction, auto) {
      if (direction !== forwardDirection.value) {
        if (displayedPages.value === 1) {
          flip.frontImage = pageUrl(currentPage.value - 1)
          flip.backImage = null
        } else {
          flip.frontImage = pageUrl(firstPage.value)
          flip.backImage = pageUrl(currentPage.value - displayedPages.value + 1)
        }
      } else {
        if (displayedPages.value === 1) {
          flip.frontImage = pageUrl(currentPage.value)
          flip.backImage = null
        } else {
          flip.frontImage = pageUrl(secondPage.value)
          flip.backImage = pageUrl(currentPage.value + displayedPages.value)
        }
      }
      flip.direction = direction
      flip.progress = 0
      return requestAnimationFrame(() => {
        if (flip.direction !== forwardDirection.value) {
          if (displayedPages.value === 2) {
            firstPage.value = currentPage.value - displayedPages.value
          }
        } else {
          if (displayedPages.value === 1) {
            firstPage.value = currentPage.value + displayedPages.value
          } else {
            secondPage.value = currentPage.value + 1 + displayedPages.value
          }
        }

        if (auto) {
          return flipAuto(true)
        }
      })
    }

    function flipAuto(ease) {
      const t0 = Date.now()
      const duration = flipDuration.value * (1 - flip.progress)
      const startRatio = flip.progress
      flip.auto = true
      emit('flip-' + flip.direction + '-start', page.value)
      const animate = () => {
        return requestAnimationFrame(() => {
          var ratio, t
          t = Date.now() - t0
          ratio = startRatio + t / duration
          if (ratio > 1) {
            ratio = 1
          }
          flip.progress = ease ? easeInOut(ratio) : ratio
          if (ratio < 1) {
            return animate()
          } else {
            if (flip.direction !== forwardDirection.value) {
              currentPage.value -= displayedPages.value
            } else {
              currentPage.value += displayedPages.value
            }
            this.$emit('flip-' + flip.direction + '-end', page.value)
            if (displayedPages.value === 1 && flip.direction === forwardDirection.value) {
              flip.direction = null
            } else {
              onImageLoad(1, function () {
                return (flip.direction = null)
              })
            }
            return (flip.auto = false)
          }
        })
      }
      return animate()
    }

    function flipRevert() {
      const t0 = Date.now()
      const duration = flipDuration.value * flip.progress.value
      const startRatio = flip.progress.value
      flip.auto.value = true
      const animate = () => {
        return requestAnimationFrame(() => {
          let ratio, t
          t = Date.now() - t0
          ratio = startRatio - (startRatio * t) / duration
          if (ratio < 0) {
            ratio = 0
          }
          flip.progress.value = ratio
          if (ratio > 0) {
            return animate()
          } else {
            firstPage.value = currentPage.value
            secondPage.value = currentPage.value + 1
            if (displayedPages.value === 1 && flip.direction.value !== forwardDirection.value) {
              flip.direction.value = null
            } else {
              onImageLoad(1, function () {
                return (flip.direction.value = null)
              })
            }
            return (flip.auto.value = false)
          }
        })
      }
      return animate()
    }

    function onImageLoad(trigger, cb) {
      nImageLoad.value = 0
      nImageLoadTrigger.value = trigger
      return (imageLoadCallback.value = cb)
    }

    function didLoadImage(ev) {
      if (imageWidth.value === null) {
        imageWidth.value = (ev.target || ev.path[0]).naturalWidth
        imageHeight.value = (ev.target || ev.path[0]).naturalHeight
        preloadImages()
      }
      if (!imageLoadCallback.value) {
        return
      }
      if (++nImageLoad.value >= nImageLoadTrigger.value) {
        imageLoadCallback()
        return (imageLoadCallback.value = null)
      }
    }

    function zoomIn() {
      if (!canZoomIn.value) {
        return
      }
      zoomIndex.value += 1
      return zoomTo(zooms_.value[zoomIndex.value])
    }

    function zoomOut() {
      if (!canZoomOut.value) {
        return
      }
      zoomIndex.value -= 1
      return zoomTo(zooms_.value[zoomIndex.value])
    }

    function zoomTo(zoom, fixedX, fixedY) {
      const start = zoom.value
      const end = zoom
      const viewport = viewportRef.value
      let startX = viewport.scrollLeft
      let startY = viewport.scrollTop
      fixedX || (fixedX = viewport.clientWidth / 2)
      fixedY || (fixedY = viewport.clientHeight / 2)
      const containerFixedX = fixedX + startX
      const containerFixedY = fixedY + startY
      const endX = (containerFixedX / start) * end - fixedX
      const endY = (containerFixedY / start) * end - fixedY
      const t0 = Date.now()
      zooming.value = true
      this.$emit('zoom-start', zoom)
      const animate = () => {
        return requestAnimationFrame(() => {
          let ratio, t
          t = Date.now() - t0
          ratio = t / zoomDuration.value
          if (ratio > 1 || IE) {
            ratio = 1
          }
          ratio = easeInOut(ratio)
          zoom.value = start + (end - start) * ratio
          scrollLeft.value = startX + (endX - startX) * ratio
          scrollTop.value = startY + (endY - startY) * ratio
          if (t < zoomDuration.value) {
            return animate()
          } else {
            emit('zoom-end', zoom)
            zooming.value = false
            zoom.value = zoom
            scrollLeft.value = endX
            return (scrollTop.value = endY)
          }
        })
      }
      animate()
      if (end > 1) {
        return preloadImages(true)
      }
    }

    function zoomAt(touch) {
      const rect = viewportRef.value.getBoundingClientRect()
      const x = touch.pageX - rect.left
      const y = touch.pageY - rect.top
      this.zoomIndex = (zoomIndex.value + 1) % zooms_.value.length
      return zoomTo(zooms_.value[zoomIndex.value], x, y)
    }

    function swipeStart(touch) {
      const viewport = viewportRef.value
      touchStartX.value = touch.pageX
      touchStartY.value = touch.pageY
      maxMove.value = 0
      if (zoom.value <= 1) {
        return (activeCursor.value = 'grab')
      } else {
        startScrollLeft.value = viewport.scrollLeft
        startScrollTop.value = viewport.scrollTop
        return (activeCursor.value = 'all-scroll')
      }
    }

    function swipeMove(touch) {
      if (touchStartX.value == null) {
        return
      }
      const x = touch.pageX - touchStartX.value
      const y = touch.pageY - touchStartY.value
      maxMove.value = Math.max(maxMove.value, Math.abs(x))
      maxMove.value = Math.max(maxMove.value, Math.abs(y))
      if (zoom.value > 1) {
        if (dragToScroll.value) {
          dragScroll(x, y)
        }
        return
      }
      if (Math.abs(y) > Math.abs(x)) {
        return
      }
      activeCursor.value = 'grabbing'
      if (x > 0) {
        if (flip.direction.value === null && canFlipLeft.value && x >= swipeMin.value) {
          flipStart('left', false)
        }
        if (flip.direction.value === 'left') {
          flip.progress.value = x / pageWidth.value
          if (flip.progress.value > 1) {
            flip.progress.value = 1
          }
        }
      } else {
        if (flip.direction.value === null && canFlipRight.value && x <= -swipeMin.value) {
          flipStart('right', false)
        }
        if (flip.direction.value === 'right') {
          flip.progress.value = -x / pageWidth.value
          if (flip.progress.value > 1) {
            flip.progress.value = 1
          }
        }
      }
      return true
    }

    function swipeEnd(touch) {
      if (touchStartX.value == null) {
        return
      }
      if (maxMove.value < swipeMin.value) {
        zoomAt(touch)
      }
      if (flip.direction.value !== null && !flip.auto.value) {
        if (flip.progress.value > 1 / 4) {
          flipAuto(false)
        } else {
          flipRevert()
        }
      }
      touchStartX.value = null
      return (activeCursor.value = null)
    }

    function onTouchStart(ev) {
      hasTouchEvents.value = true
      return swipeStart(ev.changedTouches[0])
    }

    function onTouchMove(ev) {
      if (swipeMove(ev.changedTouches[0])) {
        if (ev.cancelable) {
          return ev.preventDefault()
        }
      }
    }

    function onTouchEnd(ev) {
      return swipeEnd(ev.changedTouches[0])
    }

    function onPointerDown(ev) {
      hasPointerEvents.value = true
      if (hasTouchEvents.value) {
        return
      }
      if (ev.which && ev.which !== 1) {
        return
      }
      swipeStart(ev)
      try {
        return ev.target.setPointerCapture(ev.pointerId)
      } catch (_error) {
        // eslint-disable-next-line no-empty
      }
    }

    function onPointerMove(ev) {
      if (!hasTouchEvents.value) {
        return swipeMove(ev)
      }
    }

    function onPointerUp(ev) {
      if (hasTouchEvents.value) {
        return
      }
      swipeEnd(ev)
      try {
        return ev.target.releasePointerCapture(ev.pointerId)
      } catch (_error) {
        // eslint-disable-next-line no-empty
      }
    }

    function onMouseDown(ev) {
      if (hasTouchEvents.value || hasPointerEvents.value) {
        return
      }
      if (ev.which && ev.which !== 1) {
        return
      }
      return swipeStart(ev)
    }

    function onMouseMove(ev) {
      if (!(hasTouchEvents.value || hasPointerEvents.value)) {
        return swipeMove(ev)
      }
    }

    function onMouseUp(ev) {
      if (!(hasTouchEvents.value || hasPointerEvents.value)) {
        return swipeEnd(ev)
      }
    }

    function dragScroll(x, y) {
      scrollLeft.value = startScrollLeft.value - x
      return (scrollTop.value = startScrollTop.value - y)
    }

    function onWheel(ev) {
      const viewport = viewportRef.value
      if (zoom.value > 1 && dragToScroll.value) {
        scrollLeft.value = viewport.scrollLeft + ev.deltaX
        scrollTop.value = viewport.scrollTop + ev.deltaY
        if (ev.cancelable) {
          return ev.preventDefault()
        }
      }
    }

    function preloadImages(hiRes = false) {
      if (hiRes == null) {
        hiRes = false
      }
      for (
        let i, _i, _ref = currentPage.value - 3, _ref1 = currentPage.value + 3;
        _ref <= _ref1 ? _i <= _ref1 : _i >= _ref1;
        i = _ref <= _ref1 ? ++_i : --_i
      ) {
        pageUrlLoading(i)
      }
      if (hiRes) {
        for (
          let i, _j, _ref2 = currentPage.value, _ref3 = currentPage.value + displayedPages.value;
          _ref2 <= _ref3 ? _j < _ref3 : _j > _ref3;
          i = _ref2 <= _ref3 ? ++_j : --_j
        ) {
          const src = pagesHiRes.value[i]
          if (src) {
            new Image().src = src
          }
        }
      }
    }

    function goToPage(p) {
      if (p === null || p === page.value) {
        return
      }
      if (pages[0].value === null) {
        if (displayedPages.value === 2 && p === 1) {
          currentPage.value = 0
        } else {
          currentPage.value = p
        }
      } else {
        currentPage.value = p - 1
      }
      minX.value = Infinity
      maxX.value = -Infinity
      return (currentCenterOffset.value = centerOffset.value)
    }

    function makePolygonArray(face) {
      if (!flip.direction) {
        return []
      }
      let progress = flip.progress
      let direction = flip.direction
      if (displayedPages.value === 1 && direction !== forwardDirection.value) {
        progress = 1 - progress
        direction = forwardDirection.value
      }
      flip.opacity = displayedPages.value === 1 && progress > 0.7 ? 1 - (progress - 0.7) / 0.3 : 1
      const image = face === 'front' ? flip.frontImage : flip.backImage
      // polygonWidth.value = pageWidth.value / nPolygons.value
      let pageX = xMargin.value
      let originRight = false
      if (displayedPages.value === 1) {
        if (forwardDirection.value === 'right') {
          if (face === 'back') {
            originRight = true
            pageX = xMargin.value - pageWidth.value
          }
        } else {
          if (direction === 'left') {
            if (face === 'back') {
              pageX = pageWidth.value - xMargin.value
            } else {
              originRight = true
            }
          } else {
            if (face === 'front') {
              pageX = pageWidth.value - xMargin.value
            } else {
              originRight = true
            }
          }
        }
      } else {
        if (direction === 'left') {
          if (face === 'back') {
            pageX = viewWidth.value / 2
          } else {
            originRight = true
          }
        } else {
          if (face === 'front') {
            pageX = viewWidth.value / 2
          } else {
            originRight = true
          }
        }
      }
      const pageMatrix = new Matrix()
      pageMatrix.translate(viewWidth.value / 2)
      pageMatrix.perspective(perspective.value)
      pageMatrix.translate(-viewWidth.value / 2)
      pageMatrix.translate(pageX, yMargin.value)
      let pageRotation = 0
      if (progress > 0.5) {
        pageRotation = -(progress - 0.5) * 2 * 180
      }
      if (direction === 'left') {
        pageRotation = -pageRotation
      }
      if (face === 'back') {
        pageRotation += 180
      }
      if (pageRotation) {
        if (originRight) {
          pageMatrix.translate(pageWidth.value)
        }
        pageMatrix.rotateY(pageRotation)
        if (originRight) {
          pageMatrix.translate(-pageWidth.value)
        }
      }

      let theta

      if (progress < 0.5) {
        theta = progress * 2 * Math.PI
      } else {
        theta = (1 - (progress - 0.5) * 2) * Math.PI
      }
      if (theta === 0) {
        theta = 1e-9
      }
      const radius = pageWidth.value / theta
      let radian = 0
      let dRadian = theta / nPolygons.value
      let rotate = (dRadian / 2 / Math.PI) * 180
      let dRotate = (dRadian / Math.PI) * 180
      if (originRight) {
        rotate = (-theta / Math.PI) * 180 + dRotate / 2
      }
      if (face === 'back') {
        rotate = -rotate
        dRotate = -dRotate
      }
      minX.value = Infinity
      maxX.value = -Infinity
      const _results = []
      for (
        let i = 0, _i = 0, _ref = nPolygons.value;
        0 <= _ref ? _i < _ref : _i > _ref;
        i = 0 <= _ref ? ++_i : --_i
      ) {
        const bgPos = '' + (i / (nPolygons.value - 1)) * 100 + '% 0px'
        const m = pageMatrix.clone()
        const rad = originRight ? theta - radian : radian
        let x = Math.sin(rad) * radius
        if (originRight) {
          x = pageWidth.value - x
        }
        let z = (1 - Math.cos(rad)) * radius
        if (face === 'back') {
          z = -z
        }
        m.translate3d(x, 0, z)
        m.rotateY(-rotate)
        const x0 = m.transformX(0)
        const x1 = m.transformX(polygonWidth)
        maxX.value = Math.max(Math.max(x0, x1), maxX.value)
        minX.value = Math.min(Math.min(x0, x1), minX.value)
        const lighting = computeLighting(pageRotation - rotate, dRotate)
        radian += dRadian
        rotate += dRotate
        _results.push([face + i, image, lighting, bgPos, m.toString(), Math.abs(Math.round(z))])
      }
      return _results
    }

    function computeLighting(rot, dRotate) {
      const gradients = []
      const lightingPoints = [-0.5, -0.25, 0, 0.25, 0.5]
      if (ambient.value < 1) {
        const blackness = 1 - ambient.value
        const diffuse = lightingPoints.map((d) => {
          return (1 - Math.cos(((rot - dRotate * d) / 180) * Math.PI)) * blackness
        })
        gradients.push(
          'linear-gradient(to right,\n  rgba(0, 0, 0, ' +
            diffuse[0] +
            '),\n  rgba(0, 0, 0, ' +
            diffuse[1] +
            ') 25%,\n  rgba(0, 0, 0, ' +
            diffuse[2] +
            ') 50%,\n  rgba(0, 0, 0, ' +
            diffuse[3] +
            ') 75%,\n  rgba(0, 0, 0, ' +
            diffuse[4] +
            '))'
        )
      }
      if (gloss.value > 0 && !IE) {
        const DEG = 30
        const POW = 200
        const specular = lightingPoints.map((d) => {
          return Math.max(
            Math.pow(Math.cos(((rot + DEG - dRotate * d) / 180) * Math.PI), POW),
            Math.pow(Math.cos(((rot - DEG - dRotate * d) / 180) * Math.PI), POW)
          )
        })
        gradients.push(
          'linear-gradient(to right,\n  rgba(255, 255, 255, ' +
            specular[0] * gloss.value +
            '),\n  rgba(255, 255, 255, ' +
            specular[1] * gloss.value +
            ') 25%,\n  rgba(255, 255, 255, ' +
            specular[2] * gloss.value +
            ') 50%,\n  rgba(255, 255, 255, ' +
            specular[3] * gloss.value +
            ') 75%,\n  rgba(255, 255, 255, ' +
            specular[4] * gloss.value +
            '))'
        )
      }
      return gradients.join(',')
    }

    function loadImage(url) {
      if (imageWidth.value === null) {
        return url
      } else {
        if (loadedImages.value[url]) {
          return url
        } else {
          const img = new Image()
          img.onload = () => {
            return loadedImages.value[url]
          }
          img.src = url
          return loadingImage.value
        }
      }
    }

    watch(
      () => currentPage.value,
      () => {
        firstPage.value = currentPage.value
        secondPage.value = currentPage.value + 1
        return preloadImages()
      }
    )

    watch(
      () => centerOffset.value,
      () => {
        if (animatingCenter.value) {
          return
        }
        const animate = () => {
          return requestAnimationFrame(() => {
            let diff, rate
            rate = 0.1
            diff = centerOffset.value - currentCenterOffset.value
            if (Math.abs(diff) < 0.5) {
              currentCenterOffset.value = centerOffset
              return (animatingCenter.value = false)
            } else {
              currentCenterOffset.value += diff * rate
              return animate()
            }
          })
        }
        animatingCenter.value = true
        return animate()
      }
    )

    watch(
      () => scrollLeftLimited.value,
      (val) => {
        if (IE) {
          return requestAnimationFrame((viewportRef.value.scrollLeft = val))
        } else {
          return (viewportRef.value.scrollLeft = val)
        }
      }
    )

    watch(
      () => scrollTopLimited.value,
      (val) => {
        if (IE) {
          return requestAnimationFrame((viewportRef.value.scrollTop = val))
        } else {
          return (viewportRef.value.scrollTop = val)
        }
      }
    )

    watch(
      () => pages.value,
      (after, before) => {
        fixFirstPage()
        if (!(before != null ? before.length : void 0) && (after != null ? after.length : void 0)) {
          if (startPage.value > 1 && after[0] === null) {
            return currentPage.value++
          }
        }
      }
    )

    watch(
      () => startPage.value,
      (p) => {
        return goToPage(p)
      }
    )

    onMounted(() => {
      window.addEventListener('resize', onResize, {
        passive: true
      })
      onResize()
      zoom.value = zooms_.value[0]
      goToPage(startPage.value)
    })

    onUnmounted(() => {
      window.removeEventListener('resize', onResize, {
        passive: true
      })
    })

    return {
      flip,
      canFlipLeft,
      canFlipRight,
      canZoomIn,
      canZoomOut,
      centerOffsetSmoothed,
      boundingLeft,
      boundingRight,
      page,
      pageWidth,
      pageHeight,
      leftPage,
      rightPage,
      xMargin,
      yMargin,
      viewWidth,
      numPages,
      showLeftPage,
      showRightPage,
      cursor,
      polygonHeight,
      polygonBgSize,
      polygonArray,
      pageUrlLoading,
      flipLeft,
      flipRight,
      didLoadImage,
      dragToScroll,
      zoom,
      zooming,
      zoomIn,
      zoomOut,
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onMouseDown,
      onMouseMove,
      onMouseUp,
      onWheel,
      loadImage,
      polygonWidth
    }
  }
}
</script>

<style scoped lang="scss" rel="stylesheet/scss">
.viewport {
  -webkit-overflow-scrolling: touch;
  width: 100%;
  height: 100%;
}

.viewport.zoom {
  overflow: scroll;
}

.viewport.zoom.drag-to-scroll {
  overflow: hidden;
}

.flipbook-container {
  position: relative;
  width: 100%;
  height: 100%;
  transform-origin: top left;
  user-select: none;
}

.click-to-flip {
  position: absolute;
  width: 50%;
  height: 100%;
  top: 0;
  user-select: none;
}

.click-to-flip.left {
  left: 0;
}

.click-to-flip.right {
  right: 0;
}

.bounding-box {
  position: absolute;
  user-select: none;
}

.page {
  position: absolute;
  backface-visibility: hidden;
}

.polygon {
  position: absolute;
  top: 0;
  left: 0;
  background-repeat: no-repeat;
  backface-visibility: hidden;
  transform-origin: center left;
}

.polygon.blank {
  background-color: #ddd;
}

.polygon .lighting {
  width: 100%;
  height: 100%;
}
</style>
