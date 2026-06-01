import config from '@adiwajshing/eslint-config'
import css from '@eslint/css'
import { defineConfig } from 'eslint/config'

export default defineConfig(
	[
		{
			files: [
				'packages/**/*.ts',
				'packages/**/*.tsx',
				'**/public/scripts/*.js',
				'**/public/scripts/*.mjs'
			],
		},
		{
			ignores: [
				'**/lib',
				'**/dist',
				'**/cjs',
				'**/types/pg',
				'**/queries.ts',
				'**/*.gen.ts',
				'**/*.css',
				'**/*.min.js',
				'reference/**',
			],
		},
		{
			extends: config,
		},
		{
			rules: {
				camelcase: 'off',
				'react/no-unknown-property': 'off',
				'react/jsx-key': 'off',
			}
		},
		{
			files: ['**/*.css'],
			plugins: { css },
			language: 'css/css',
			extends: ['css/recommended']
		},
	]
)
