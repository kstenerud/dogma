#!/usr/bin/env node

import {toHtml} from 'hast-util-to-html'
// import {createStarryNight, common} from '@wooorm/starry-night'
import * as starry from './starry-night/index.js'
import mustache from 'mustache'
import * as fs from 'fs'

async function loadDogma(filename) {
	const starryNight = await starry.createStarryNight(starry.common)
	const scope = starryNight.flagToScope('dogma')

	try {
	  const data = fs.readFileSync(filename, 'utf8');
	  const tree = starryNight.highlight(data, scope)
	  return toHtml(tree);
	} catch (err) {
	  console.error(err);
	}
}

function fixGenerated(generatedText) {
	return generatedText.replaceAll('<span class="pl-ii">\\[</span><span class="pl-en">', '<span class="pl-en">\\[')
}

const example1 = await loadDogma('example1.dogma')
const example2 = await loadDogma('example2.dogma')
const template = fs.readFileSync('index.template.html', 'utf8');

const view = {
  example1: fixGenerated(example1),
  example2: fixGenerated(example2)
};

const output = mustache.render(template, view)

console.log(output)
