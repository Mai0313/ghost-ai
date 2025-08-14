請參考下方OpenAI提供的realtime transcribe WS 幫我實做這專案的語音功能
語音功能我希望透過全局熱鍵 ctrl + shift + enter
同時 mac系統則是透過command取代ctrl

我希望他的功能是 在錄音時 可以透過 realtime transcribe WS 來完成
當開始錄音 有聲音時 就要streaming的方式顯示逐字稿
後續我希望在發問時 假設轉文字的區域有文字 也要一起送進去
然後ctrl + r 目前會清除所有的對話紀錄 我希望這個功能可以重置包括語音的紀錄

並且你要確保這個錄音功能是可以聽到使用者電腦的所有聲音
使用者播放的影片 與 麥克風的聲音 都要取得並得到逐字稿

如果妳不知道怎麼做 可以透過 MCP 的 Context7 或是 訪問下面幾個網頁來取得資訊
https://platform.openai.com/docs/guides/realtime
https://platform.openai.com/docs/guides/realtime-conversations
https://platform.openai.com/docs/guides/realtime-transcription
https://platform.openai.com/docs/guides/realtime-vad

```typescript
// 安裝依賴
// npm install ws @types/ws

import WebSocket, { MessageEvent } from 'ws';

const url = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17';

const ws = new WebSocket(url, {
  headers: {
    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    'OpenAI-Beta': 'realtime=v1',
  },
});

ws.on('open', () => {
  console.log('Connected to server.');
});

ws.on('message', (message: WebSocket.RawData, isBinary: boolean) => {
  try {
    const data = JSON.parse(message.toString());
    console.log(data);
  } catch (err) {
    console.error('Failed to parse message:', err);
  }
});

ws.on('error', (err) => {
  console.error('WebSocket error:', err);
});

ws.on('close', (code, reason) => {
  console.log(`Connection closed. Code: ${code}, Reason: ${reason.toString()}`);
});
```
