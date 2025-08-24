import React, { useMemo } from 'react';
import { MarkdownViewer } from './MarkdownViewer';
import { askCard, askResultArea } from '../styles/styles';

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


