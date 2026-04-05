const withTrailingSlashRemoved = (value = '') => value.replace(/\/+$/, '');

const normalizeFormatterOptions = (optionsOrLegacyFlag = false) => {
  if (typeof optionsOrLegacyFlag === 'boolean') {
    return {
      playground: optionsOrLegacyFlag,
      isFormattingMode: false
    };
  }

  return {
    playground: Boolean(optionsOrLegacyFlag?.playground),
    isFormattingMode: Boolean(optionsOrLegacyFlag?.isFormattingMode)
  };
};

const getFormatterBaseUrl = () => withTrailingSlashRemoved(
  process.env.LOCAL_FORMATTER_URL || process.env.TRANSCRIPT_FORMATTER_URL || ''
);

const buildFormatterHeaders = () => {
  const headers = {
    'Content-Type': 'application/json'
  };

  const sharedSecret = process.env.LOCAL_FORMATTER_SECRET || process.env.TRANSCRIPT_FORMATTER_SECRET || '';
  if (sharedSecret) {
    headers.Authorization = `Bearer ${sharedSecret}`;
  }

  return headers;
};

const requestRemoteFormatter = async (pathname, payload) => {
  const baseUrl = getFormatterBaseUrl();

  if (!baseUrl) {
    throw new Error('LOCAL_FORMATTER_URL is not configured.');
  }

  const timeoutMs = Number(process.env.LOCAL_FORMATTER_TIMEOUT_MS || 60000);
  const response = await fetch(`${baseUrl}${pathname}`, {
    method: 'POST',
    headers: buildFormatterHeaders(),
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(timeoutMs)
  });

  const responseText = await response.text();
  let data = {};

  try {
    data = responseText ? JSON.parse(responseText) : {};
  } catch (error) {
    data = { error: responseText || 'Formatter returned invalid JSON.' };
  }

  if (!response.ok) {
    throw new Error(data.error || `Formatter request failed with status ${response.status}.`);
  }

  return data;
};

export const generateTranscriptFormatting = async (rawTranscript) => {
  const baseUrl = getFormatterBaseUrl();

  if (baseUrl) {
    const data = await requestRemoteFormatter('/format-transcript', { rawTranscript });
    return data.output || '';
  }

  const { generateMistralResponse } = await import('../../local-formatter/ai-service.js');
  return generateMistralResponse(rawTranscript, { isFormattingMode: true });
};

export const generateAiPreview = async (prompt, optionsOrLegacyFlag = false) => {
  const normalizedOptions = normalizeFormatterOptions(optionsOrLegacyFlag);
  const baseUrl = getFormatterBaseUrl();

  if (baseUrl) {
    const data = await requestRemoteFormatter('/generate', {
      prompt,
      options: normalizedOptions
    });
    return data.output || '';
  }

  const { generateMistralResponse } = await import('../../local-formatter/ai-service.js');
  return generateMistralResponse(prompt, normalizedOptions);
};

export const getTranscriptFormatterMode = () => (
  getFormatterBaseUrl() ? 'remote' : 'local'
);
