// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'
import betterTailwindcss from 'eslint-plugin-better-tailwindcss'
import { getDefaultAttributes } from 'eslint-plugin-better-tailwindcss/api/defaults'

export default withNuxt(betterTailwindcss.configs['correctness-error'], {
  rules: {
    'vue/singleline-html-element-content-newline': 'off',
    '@stylistic/operator-linebreak': 'off',
    'vue/max-attributes-per-line': 'off',
    '@stylistic/member-delimiter-style': 'off',
    '@stylistic/arrow-parens': 'off',
    'vue/html-indent': 'off',
    'vue/html-closing-bracket-newline': 'off'
  },
  settings: {
    'better-tailwindcss': {
      entryPoint: 'app/assets/css/main.css',
      attributes: [...getDefaultAttributes(), ['^v-bind:ui$', [{ match: 'objectValues' }]]]
    }
  }
})
