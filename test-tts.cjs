const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');

(async () => {
    const tts = new MsEdgeTTS();
    await tts.setMetadata('zh-CN-YunxiNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const ssml = '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-CN"><voice name="zh-CN-YunxiNeural"><prosody rate="+50%" pitch="+0%">测试一下</prosody></voice></speak>';
    const { audioStream } = tts.toStream(ssml);
    const chunks = [];
    audioStream.on('data', c => chunks.push(c));
    audioStream.on('end', () => console.log('Done, size:', Buffer.concat(chunks).length));
})();
