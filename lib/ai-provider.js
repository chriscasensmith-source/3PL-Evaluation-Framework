'use strict';

const Anthropic = require('@anthropic-ai/sdk');

// Default model — swap here to change the provider model globally.
const MODEL = 'claude-opus-4-7';
const MAX_TOKENS = 4096;

/**
 * Returns an initialised Anthropic client.
 * Throws clearly if the API key is missing so the error surfaces before any
 * network call is made.
 *
 * @returns {Anthropic}
 */
function getClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY is not set. ' +
      'Copy .env.example to .env and add your Anthropic API key.'
    );
  }
  return new Anthropic({ apiKey });
}

/**
 * Sends one or more images plus a text prompt to Claude and returns the
 * raw text response.
 *
 * @param {Array<{ data: Buffer; mimetype: string }>} imageBuffers
 *   Each element carries the raw bytes and MIME type of one uploaded image,
 *   in the order they should be analysed.
 * @param {string} prompt  User-facing instruction appended after all images.
 * @returns {Promise<string>}
 */
async function analyzeImages(imageBuffers, prompt) {
  const client = getClient();

  /** @type {import('@anthropic-ai/sdk').MessageParam['content']} */
  const content = [
    ...imageBuffers.map((img, i) => ({
      type: /** @type {'image'} */ ('image'),
      source: {
        type: /** @type {'base64'} */ ('base64'),
        media_type: /** @type {import('@anthropic-ai/sdk').Base64ImageSource['media_type']} */ (img.mimetype),
        data: img.data.toString('base64'),
      },
    })),
    { type: /** @type {'text'} */ ('text'), text: prompt },
  ];

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    messages: [{ role: 'user', content }],
  });

  const block = message.content.find((b) => b.type === 'text');
  if (!block || block.type !== 'text') {
    throw new Error('AI provider returned an empty or unexpected response.');
  }
  return block.text;
}

/**
 * Sends a text-only prompt to Claude and returns the raw text response.
 * Use this when no images need to be analysed (e.g. the generation step).
 *
 * @param {string} prompt
 * @returns {Promise<string>}
 */
async function generateText(prompt) {
  const client = getClient();

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    messages: [{ role: 'user', content: prompt }],
  });

  const block = message.content.find((b) => b.type === 'text');
  if (!block || block.type !== 'text') {
    throw new Error('AI provider returned an empty or unexpected response.');
  }
  return block.text;
}

module.exports = { analyzeImages, generateText, MODEL };
