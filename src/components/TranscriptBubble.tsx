import React, { useMemo } from 'react';

import { askCard, askResultArea } from '../styles/styles';

import { MarkdownViewer } from './MarkdownViewer';

type TranscriptBubbleProps = {
  markdown: string;
};

export const TranscriptBubble: React.FC<TranscriptBubbleProps> = ({ markdown }) => {
  const markdownVisible = useMemo(() => (markdown ? 'block' : 'none'), [markdown]);

  return (
    <div style={askCard}>
      <div
        className="bn-markdown-viewer"
        style={{
          ...askResultArea,
          whiteSpace: 'normal',
          display: markdownVisible,
        }}
      >
        <MarkdownViewer markdown={markdown} />
      </div>
    </div>
  );
};


