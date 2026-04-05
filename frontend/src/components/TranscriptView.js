import React from 'react';
import { MessageSquareText } from 'lucide-react';

const getTranscriptText = (call) => (
  call.formattedTranscript || call.rawTranscript || call.transcript || ''
);

const COMMON_SPLIT_WORD_SUFFIX_PATTERN = '(?:ments?|tions?|sions?|ingly|edly|ally|ably|ibly|fully|ously|lessly|ability|ibility|ances?|ences?|ancy|ency|ships?|wards?|wise|hood|able|ible|ness|less|ship|ward|wise|hood|ment|tion|sion|ing|ers?|est|ful|ous|ive|ial|ual|ary|ory|ize|ise|ed|ly|al)';

const repairFragmentedWords = (value = '') => {
  let repaired = value;
  const splitSuffixPattern = new RegExp(`\\b([A-Za-z]{2,12})\\s+(${COMMON_SPLIT_WORD_SUFFIX_PATTERN})\\b`, 'gi');
  const splitTriplePattern = new RegExp(`\\b([A-Za-z]{1,6})\\s+([A-Za-z]{2,8})\\s+(${COMMON_SPLIT_WORD_SUFFIX_PATTERN})\\b`, 'gi');

  for (let pass = 0; pass < 3; pass += 1) {
    const next = repaired
      .replace(/\b(?:[A-Za-z]\s+){2,}[A-Za-z]\b/g, (match) => match.replace(/\s+/g, ''))
      .replace(/\b([A-Za-z]+)\s+'\s+(m|re|ve|ll|d|s)\b/gi, "$1'$2")
      .replace(/\b([A-Za-z]+)\s+n\s*'\s*t\b/gi, "$1n't")
      .replace(splitTriplePattern, '$1$2$3')
      .replace(splitSuffixPattern, '$1$2')
      .replace(/\b([Hh]ave)(a|an)\b/g, '$1 $2')
      .replace(/\b([Tt]hank)(you)\b/g, '$1 $2');

    if (next === repaired) {
      break;
    }

    repaired = next;
  }

  return repaired;
};

const stripOutcomeLabel = (value = '') => value
  .replace(/\s*(?:Outcome|Call status|Status)\s*:\s*(confirmed|rejected|busy|voicemail|unresolved|completed|pending|no answer|canceled)\.?\s*/ig, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const normalizeMessage = (value = '', role = 'system') => {
  let normalized = value
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;!?])/g, '$1')
    .trim();

  normalized = repairFragmentedWords(normalized);

  if (role === 'agent') {
    normalized = stripOutcomeLabel(normalized);
  }

  return normalized;
};

const parseTranscriptEntries = (text) => (
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const match = line.match(/^([^:]+):\s*(.+)$/);

      if (!match) {
        return {
          id: `${index}-${line}`,
          speaker: 'Transcript',
          message: normalizeMessage(line),
          role: 'system'
        };
      }

      const speaker = match[1].trim();
      const normalizedSpeaker = speaker.toLowerCase();

      let role = 'system';
      if (normalizedSpeaker.includes('caller') || normalizedSpeaker.includes('customer')) {
        role = 'caller';
      } else if (normalizedSpeaker.includes('frontdesk') || normalizedSpeaker.includes('agent')) {
        role = 'agent';
      }

      const message = normalizeMessage(match[2], role);

      return {
        id: `${index}-${speaker}-${message}`,
        speaker,
        message,
        role
      };
    })
    .filter((entry) => entry.message)
);

const isTrailingArtifact = (entries = []) => {
  if (entries.length < 2) {
    return false;
  }

  const previousEntry = entries[entries.length - 2];
  const lastEntry = entries[entries.length - 1];

  if (previousEntry.role !== 'agent' || lastEntry.role !== 'caller') {
    return false;
  }

  const previousText = previousEntry.message.toLowerCase();
  const lastText = lastEntry.message.toLowerCase();

  return (
    /(have a good day|have a great day|goodbye|bye|take care|talk soon|all set then|that'?s all set)/i.test(previousText) &&
    /^(hi|bye|okay|ok|thanks|thank you|yeah|yep|alright)\.?$/i.test(lastText)
  );
};

const roleClasses = {
  agent: {
    bubble: 'border-indigo-500/20 bg-indigo-500/10',
    badge: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-200',
    text: 'text-slate-100',
    wrapper: 'mr-auto',
    width: 'max-w-[88%]'
  },
  caller: {
    bubble: 'border-emerald-500/20 bg-emerald-500/10',
    badge: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
    text: 'text-slate-100',
    wrapper: 'ml-auto text-right',
    width: 'max-w-[82%]'
  },
  system: {
    bubble: 'border-slate-800 bg-slate-950/80',
    badge: 'border-slate-700 bg-slate-900 text-slate-300',
    text: 'text-slate-300',
    wrapper: 'mx-auto',
    width: 'max-w-full'
  }
};

const TranscriptView = ({ call, className = '' }) => {
  if (call.transcriptProcessingStatus === 'processing') {
    return (
      <div className={`rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 px-5 py-4 text-sm text-slate-300 ${className}`}>
        Processing transcript...
      </div>
    );
  }

  const transcriptText = getTranscriptText(call);
  const transcriptEntries = transcriptText ? parseTranscriptEntries(transcriptText) : [];
  const visibleEntries = isTrailingArtifact(transcriptEntries)
    ? transcriptEntries.slice(0, -1)
    : transcriptEntries;

  if (!visibleEntries.length) {
    return (
      <div className={`rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 px-5 py-4 text-sm text-slate-400 ${className}`}>
        Transcript unavailable.
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border border-slate-800 bg-slate-950/70 p-4 ${className}`}>
      <div className="mb-4 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
        <MessageSquareText size={14} className="text-indigo-500" /> Transcript
      </div>
      <div className="space-y-3">
        {visibleEntries.map((entry) => {
          const styles = roleClasses[entry.role] || roleClasses.system;

          return (
            <div
              key={entry.id}
              className={`${styles.wrapper} ${styles.width} rounded-2xl border px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] ${styles.bubble}`}
            >
              <div className={`mb-2 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${styles.badge}`}>
                {entry.speaker}
              </div>
              <p className={`text-sm leading-relaxed ${styles.text}`}>{entry.message}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TranscriptView;
