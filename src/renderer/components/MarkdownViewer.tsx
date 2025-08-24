import React, { useEffect } from 'react';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';

type MarkdownViewerProps = {
  markdown: string;
  className?: string;
  style?: React.CSSProperties;
};

export const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ markdown, className, style }) => {
  const editor = useCreateBlockNote({
    codeBlock: {
      defaultLanguage: 'text',
      supportedLanguages: {
        javascript: { name: 'JavaScript', aliases: ['js'] },
        typescript: { name: 'TypeScript', aliases: ['ts'] },
        python: { name: 'Python', aliases: ['py'] },
        java: { name: 'Java' },
        cpp: { name: 'C++' },
        csharp: { name: 'C#', aliases: ['cs'] },
        rust: { name: 'Rust' },
        sql: { name: 'SQL' },
        xml: { name: 'XML' },
        html: { name: 'HTML' },
        php: { name: 'PHP' },
        json: { name: 'JSON' },
        text: { name: 'Text' },
      },
    },
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const blocks = await editor.tryParseMarkdownToBlocks(markdown || '');

        if (!cancelled) {
          editor.replaceBlocks(editor.document, blocks);
        }
      } catch {}
    })();

    return () => {
      cancelled = true;
    };
  }, [markdown, editor]);

  return (
    <div className={className} style={style}>
      <BlockNoteView className="bn-readonly" editable={false} editor={editor} />
    </div>
  );
};
