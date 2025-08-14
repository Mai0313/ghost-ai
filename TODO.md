請參考下方 OpenAI 提供的realtime transcribe WS 幫我實做這專案的語音功能
模型請直接使用 `gpt-4o-mini-transcribe`

當開始聆聽聲音 且有收到 Websocket 的任何文字以後 都要顯示在 bar 下方
具體位置與 AI 回應的位置相同
簡單來說就是透過類似 streaming 的方式顯示逐字稿
請注意傳送時盡可能累積到一定的大小再發送出去 以避免 buffer 太小等問題

並且你要確保這個錄音功能是可以聽到使用者電腦的所有聲音
使用者播放的影片 與 麥克風的聲音 都要取得並得到逐字稿
你可以參考一下  ./node_modules/openai/src/resources/beta/realtime/transcription-sessions.ts 幫我看看要如何完成realtime transcription

這裡是 Python 版本的範例 可以提供給你參考

```python
TARGET_SR     = 24_000
PCM_SCALE     = 32_767
CHUNK_SAMPLES = 3_072                 # ≈128 ms at 24 kHz
RT_URL        = "wss://api.openai.com/v1/realtime?intent=transcription"

EV_DELTA      = "conversation.item.input_audio_transcription.delta"
EV_DONE       = "conversation.item.input_audio_transcription.completed"
# ── helpers ────────────────────────────────────────────────────────────────
def float_to_16bit_pcm(float32_array):
    clipped = [max(-1.0, min(1.0, x)) for x in float32_array]
    pcm16 = b''.join(struct.pack('<h', int(x * 32767)) for x in clipped)
    return pcm16

def base64_encode_audio(float32_array):
    pcm_bytes = float_to_16bit_pcm(float32_array)
    encoded = base64.b64encode(pcm_bytes).decode('ascii')
    return encoded

def load_and_resample(path: str, sr: int = TARGET_SR) -> np.ndarray:
    """Return mono PCM-16 as a NumPy array."""
    data, file_sr = sf.read(path, dtype="float32")
    if data.ndim > 1:
        data = data.mean(axis=1)
    if file_sr != sr:
        data = resampy.resample(data, file_sr, sr)
    return data

async def _send_audio(ws, pcm: np.ndarray, chunk: int, sr: int) -> None:
    """Producer: stream base-64 chunks at real-time pace, then signal EOF."""
    dur = 0.025 # Add pacing to ensure real-time transcription
    t_next = time.monotonic()

    for i in range(0, len(pcm), chunk):
        float_chunk = pcm[i:i + chunk]
        payload = {
            "type":  "input_audio_buffer.append",
            "audio": base64_encode_audio(float_chunk),
        }
        await ws.send(json.dumps(payload))
        t_next += dur
        await asyncio.sleep(max(0, t_next - time.monotonic()))

    await ws.send(json.dumps({"type": "input_audio_buffer.end"}))

async def _recv_transcripts(ws, collected: List[str]) -> None:
    """
    Consumer: build `current` from streaming deltas, promote it to `collected`
    whenever a …completed event arrives, and flush the remainder on socket
    close so no words are lost.
    """
    current: List[str] = []

    try:
        async for msg in ws:
            ev = json.loads(msg)

            typ = ev.get("type")
            if typ == EV_DELTA:
                delta = ev.get("delta")
                if delta:
                    current.append(delta)
                    print(delta, end="", flush=True)
            elif typ == EV_DONE:
                # sentence finished → move to permanent list
                collected.append("".join(current))
                current.clear()
    except websockets.ConnectionClosedOK:
        pass

    # socket closed → flush any remaining partial sentence
    if current:
        collected.append("".join(current))

def _session(model: str, vad: float = 0.5) -> dict:
    return {
        "type": "transcription_session.update",
        "session": {
            "input_audio_format": "pcm16",
            "turn_detection": {"type": "server_vad", "threshold": vad},
            "input_audio_transcription": {"model": model},
        },
    }

async def transcribe_audio_async(
    wav_path,
    api_key,
    *,
    model: str = MODEL_NAME,
    chunk: int = CHUNK_SAMPLES,
) -> str:
    pcm = load_and_resample(wav_path)
    headers = {"Authorization": f"Bearer {api_key}", "OpenAI-Beta": "realtime=v1"}

    async with websockets.connect(RT_URL, additional_headers=headers, max_size=None) as ws:
        await ws.send(json.dumps(_session(model)))

        transcripts: List[str] = []
        await asyncio.gather(
            _send_audio(ws, pcm, chunk, TARGET_SR),
            _recv_transcripts(ws, transcripts),
        )  # returns when server closes

    return " ".join(transcripts)

transcript = await transcribe_audio_async(AUDIO_PATH, OPENAI_API_KEY)
transcript
```

如果妳不知道怎麼做 可以透過 MCP 的 Context7 或是 訪問下面幾個網頁來取得資訊

- https://platform.openai.com/docs/guides/realtime
- https://platform.openai.com/docs/guides/realtime-conversations
- https://platform.openai.com/docs/guides/realtime-transcription
- https://platform.openai.com/docs/guides/realtime-vad

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

後續我希望在發問時 假設語音有成功轉出文字 也要連同問題一起送進 analyzeImageWithTextStream