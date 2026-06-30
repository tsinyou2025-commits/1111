const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');

(async () => {
    try {
        const tts = new MsEdgeTTS({ enableLogger: true });
        await tts.setMetadata('zh-CN-YunxiNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
        const text = '测试一下';
        const { audioStream } = tts.toStream(text);
        const chunks = [];
        audioStream.on('data', c => chunks.push(c));
        audioStream.on('error', err => console.error('Stream error:', err));
        audioStream.on('end', () => console.log('Done, size:', Buffer.concat(chunks).length));
    } catch (e) {
        console.error('Catch error:', e);
    }
})();
