<template>
  <div id="app" :class="{ 'has-mouse': hasMouse }" @touchstart="hasMouse = false">
    <vue-book-effects
      class="book-effects"
      :pages="pages"
      :pagesHiRes="pagesHiRes"
      :startPage="pageNum"
      v-slot="bookEffects"
      ref="bookEffects"
      @flip-left-start="onFlipLeftStart"
      @flip-left-end="onFlipLeftEnd"
      @flip-right-start="onFlipRightStart"
      @flip-right-end="onFlipRightEnd"
      @zoom-start="onZoomStart"
      @zoom-end="onZoomEnd"
    >
      <div class="action-bar">
        <left-icon class="btn left" :class="{ disabled: !bookEffects.canFlipLeft }" @click="bookEffects.flipLeft" />
        <plus-icon class="btn plus" :class="{ disabled: !bookEffects.canZoomIn }" @click="bookEffects.zoomIn" />
        <span class="page-num"> Page {{ bookEffects.page }} of {{ bookEffects.numPages }} </span>
        <minus-icon class="btn minus" :class="{ disabled: !bookEffects.canZoomOut }" @click="bookEffects.zoomOut" />
        <right-icon class="btn right" :class="{ disabled: !bookEffects.canFlipRight }" @click="bookEffects.flipRight" />
      </div>
    </vue-book-effects>
  </div>
</template>

<script>
import VueBookEffects from '@/components/vue-book-effects'

import 'vue-material-design-icons/styles.css'
import LeftIcon from 'vue-material-design-icons/ChevronLeftCircle'
import RightIcon from 'vue-material-design-icons/ChevronRightCircle'
import PlusIcon from 'vue-material-design-icons/PlusCircle'
import MinusIcon from 'vue-material-design-icons/MinusCircle'

export default {
  name: 'App',
  components: {
    VueBookEffects,
    LeftIcon,
    RightIcon,
    PlusIcon,
    MinusIcon
  },
  data() {
    return {
      pages: [],
      pagesHiRes: [],
      hasMouse: true,
      pageNum: null
    }
  },

  mounted() {
    window.addEventListener('keydown', ev => {
      const bookEffects = this.$refs.bookEffects
      if (!bookEffects) {
        return
      }
      if (ev.keyCode === 37 && bookEffects.canFlipLeft) {
        bookEffects.flipLeft()
      }
      if (ev.keyCode === 39 && bookEffects.canFlipRight) {
        return bookEffects.flipRight()
      }
    })

    setTimeout(() => {
      this.pages = [null, 'images/1.jpg', 'images/2.jpg', 'images/3.jpg', 'images/4.jpg', 'images/5.jpg', 'images/6.jpg']
      this.pagesHiRes = [null, 'images-large/1.jpg', 'images-large/2.jpg', 'images-large/3.jpg', 'images-large/4.jpg', 'images-large/5.jpg', 'images-large/6.jpg']
    }, 1)

    window.addEventListener('hashchange', this.setPageFromHash)
    this.setPageFromHash()
  },

  methods: {
    onFlipLeftStart(page) {
      return console.log('flip-left-start', page)
    },

    onFlipLeftEnd(page) {
      console.log('flip-left-end', page)
      return (window.location.hash = '#' + page)
    },

    onFlipRightStart(page) {
      return console.log('flip-right-start', page)
    },

    onFlipRightEnd(page) {
      console.log('flip-right-end', page)
      return (window.location.hash = '#' + page)
    },

    onZoomStart(zoom) {
      return console.log('zoom-start', zoom)
    },

    onZoomEnd(zoom) {
      return console.log('zoom-end', zoom)
    },

    setPageFromHash() {
      const n = parseInt(window.location.hash.slice(1), 10)
      if (isFinite(n)) {
        return (this.pageNum = n)
      }
    }
  }
}
</script>

<style>
html,
body {
  margin: 0;
  padding: 0;
}

#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: #333;
  color: #ccc;
  overflow: hidden;
}

a {
  color: inherit;
}

.action-bar {
  width: 100%;
  height: 30px;
  padding: 10px 0;
  display: flex;
  justify-content: center;
  align-items: center;
}

.action-bar .btn {
  font-size: 30px;
  color: #999;
}

.action-bar .btn svg {
  bottom: 0;
}

.action-bar .btn:not(:first-child) {
  margin-left: 10px;
}

.has-mouse .action-bar .btn:hover {
  color: #ccc;
  filter: drop-shadow(1px 1px 5px #000);
  cursor: pointer;
}

.action-bar .btn:active {
  filter: none !important;
}

.action-bar .btn.disabled {
  color: #666;
  pointer-events: none;
}

.action-bar .page-num {
  font-size: 12px;
  margin-left: 10px;
}

.book-effects .viewport {
  width: 90vw;
  height: calc(100vh - 50px - 40px);
}

.book-effects .bounding-box {
  box-shadow: 0 0 20px #000;
}

.credit {
  font-size: 12px;
  line-height: 20px;
  margin: 10px;
}
</style>
