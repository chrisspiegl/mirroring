const EventEmitter = require('events');
const { spawn } = require('child_process');
const mkdirp = require('mkdirp');
const fs = require('fs');

class StreamTranscoder extends EventEmitter {
  constructor(conf) {
    console.log('StreamTranscoder constructor');
    super();
    this.conf = conf
  }

  run() {
    console.log('StreamTranscoder run');
    let beforeInput = this.conf.beforeInput || [];
    let vc = this.conf.vc || 'copy';
    let ac = this.conf.ac || 'copy';
    let inPath = this.conf.inPath || 'rtmp://127.0.0.1:' + this.conf.rtmpPort + this.conf.streamPath;
    let ouPath = this.conf.ouPath || `${this.conf.mediaroot}/${this.conf.streamApp}/${this.conf.streamName}`;
    let output = this.conf.output || [];

    mkdirp.sync(ouPath);
    let argv = ['-y'];
    Array.prototype.push.apply(argv, beforeInput);
    Array.prototype.push.apply(argv, ['-i', inPath]);
    Array.prototype.push.apply(argv, ['-c:v', vc]);
    Array.prototype.push.apply(argv, this.conf.vcParam);
    Array.prototype.push.apply(argv, ['-c:a', ac]);
    Array.prototype.push.apply(argv, this.conf.acParam);
    // Array.prototype.push.apply(argv, ['-f', 'tee', '-map', '0:a?', '-map', '0:v?', mapStr]);
    Array.prototype.push.apply(argv, output);
    argv = argv.filter((n) => { return n }); //去空

    console.log('argv: ', argv.join(' '));
    this.ffmpeg_exec = spawn(this.conf.ffmpeg, argv);

    this.ffmpeg_exec.on('error', (e) => {
      // Logger.ffdebug(e);
      console.log('error', e)
    });

    this.ffmpeg_exec.stdout.on('data', (data) => {
      // Logger.ffdebug(`FF输出：${data}`);
      // console.log('data: ', data.toString());
    });

    this.ffmpeg_exec.stderr.on('data', (data) => {
      // Logger.ffdebug(`FF输出：${data}`);
      // console.log('data: ', data.toString());
    });

    this.ffmpeg_exec.on('close', (code) => {
      console.log('[Transmuxing end] ' + this.conf.streamPath);
      this.emit('end');
      // fs.readdir(ouPath, function (err, files) {
      //   if (!err) {
      //     files.forEach((filename) => {
      //       if (filename.endsWith('.ts')
      //         || filename.endsWith('.m3u8')
      //         || filename.endsWith('.mpd')
      //         || filename.endsWith('.m4s')
      //         || filename.endsWith('.tmp')) {
      //         fs.unlinkSync(ouPath + '/' + filename);
      //       }
      //     })
      //   }
      // });
    });
  }

  end() {
    this.ffmpeg_exec.kill();
  }
}

module.exports = StreamTranscoder;